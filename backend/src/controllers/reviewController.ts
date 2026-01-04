import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// =============================================
// PUBLIC APIs
// =============================================

// GET /products/:slug/reviews - Lấy danh sách reviews của sản phẩm
export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const {
      page = 1,
      limit = 10,
      rating,
      hasImages,
      verified,
      sortBy = 'newest'
    } = req.query;

    // Tìm product theo slug
    const product = await prisma.product.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Build where clause
    const where: {
      productId: number;
      status: string;
      rating?: number;
      isVerified?: boolean;
      images?: { some: object };
    } = {
      productId: product.id,
      status: 'APPROVED'
    };

    if (rating) {
      where.rating = Number(rating);
    }

    if (verified === 'true') {
      where.isVerified = true;
    }

    if (hasImages === 'true') {
      where.images = { some: {} };
    }

    // Build orderBy
    let orderBy: object = { createdAt: 'desc' };
    if (sortBy === 'helpful') {
      orderBy = { helpfulCount: 'desc' };
    } else if (sortBy === 'rating_high') {
      orderBy = { rating: 'desc' };
    } else if (sortBy === 'rating_low') {
      orderBy = { rating: 'asc' };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          images: {
            select: {
              id: true,
              url: true
            }
          }
        }
      }),
      prisma.review.count({ where })
    ]);

    // Mask tên user cho privacy
    const maskedReviews = reviews.map(review => ({
      ...review,
      user: {
        ...review.user,
        name: maskName(review.user.name)
      }
    }));

    res.json({
      success: true,
      data: maskedReviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách đánh giá!' });
  }
};

// GET /products/:slug/reviews/stats - Thống kê reviews
export const getProductReviewStats = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        ratingAverage: true,
        reviewCount: true
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Lấy rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId: product.id,
        status: 'APPROVED'
      },
      _count: { id: true }
    });

    // Lấy fit feedback distribution
    const fitDistribution = await prisma.review.groupBy({
      by: ['fitType'],
      where: {
        productId: product.id,
        status: 'APPROVED',
        fitType: { not: null }
      },
      _count: { id: true }
    });

    // Đếm verified reviews
    const verifiedCount = await prisma.review.count({
      where: {
        productId: product.id,
        status: 'APPROVED',
        isVerified: true
      }
    });

    // Đếm reviews có hình
    const withImagesCount = await prisma.review.count({
      where: {
        productId: product.id,
        status: 'APPROVED',
        images: { some: {} }
      }
    });

    // Format distribution
    const distribution: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    ratingDistribution.forEach(item => {
      distribution[String(item.rating)] = item._count.id;
    });

    const fitFeedback: Record<string, number> = { 'SMALL': 0, 'TRUE_TO_SIZE': 0, 'LARGE': 0 };
    fitDistribution.forEach(item => {
      if (item.fitType) {
        fitFeedback[item.fitType] = item._count.id;
      }
    });

    res.json({
      success: true,
      data: {
        average: product.ratingAverage,
        total: product.reviewCount,
        distribution,
        fitFeedback,
        verifiedCount,
        withImagesCount
      }
    });
  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê đánh giá!' });
  }
};

// POST /reviews/:id/helpful - Vote hữu ích
export const voteHelpful = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { visitorId } = req.body;
    const userId = (req as Request & { user?: { id: number } }).user?.id;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId là bắt buộc!' });
    }

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review || review.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá!' });
    }

    // Kiểm tra đã vote chưa
    const existingVote = await prisma.reviewHelpful.findUnique({
      where: {
        reviewId_visitorId: {
          reviewId: Number(id),
          visitorId
        }
      }
    });

    if (existingVote) {
      // Đã vote -> bỏ vote
      await prisma.reviewHelpful.delete({
        where: { id: existingVote.id }
      });

      await prisma.review.update({
        where: { id: Number(id) },
        data: { helpfulCount: { decrement: 1 } }
      });

      return res.json({
        success: true,
        message: 'Đã bỏ vote hữu ích',
        voted: false
      });
    }

    // Chưa vote -> thêm vote
    await prisma.reviewHelpful.create({
      data: {
        reviewId: Number(id),
        visitorId,
        userId: userId || null
      }
    });

    await prisma.review.update({
      where: { id: Number(id) },
      data: { helpfulCount: { increment: 1 } }
    });

    res.json({
      success: true,
      message: 'Đã vote hữu ích',
      voted: true
    });
  } catch (error) {
    console.error('Vote helpful error:', error);
    res.status(500).json({ error: 'Lỗi khi vote!' });
  }
};

// =============================================
// USER APIs (Authenticated)
// =============================================

// POST /reviews - Tạo review mới
export const createReview = async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { user: { id: number } }).user.id;
    const { productId, rating, title, content, fitType, images } = req.body;

    // Validate
    if (!productId || !rating || !content) {
      return res.status(400).json({
        error: 'productId, rating và content là bắt buộc!'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating phải từ 1-5!' });
    }

    if (fitType && !['SMALL', 'TRUE_TO_SIZE', 'LARGE'].includes(fitType)) {
      return res.status(400).json({
        error: 'fitType phải là SMALL, TRUE_TO_SIZE hoặc LARGE!'
      });
    }

    // Kiểm tra product tồn tại
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Tìm đơn hàng đã hoàn thành (verified purchase)
    const completedOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: 'COMPLETED',
        items: {
          some: { productId: Number(productId) }
        }
      },
      include: {
        items: {
          where: { productId: Number(productId) },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Kiểm tra đã review sản phẩm này chưa (với order này nếu có)
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: Number(productId),
        userId,
        ...(completedOrder ? { orderId: completedOrder.id } : { orderId: null })
      }
    });

    if (existingReview) {
      return res.status(400).json({
        error: 'Bạn đã đánh giá sản phẩm này rồi!'
      });
    }

    // Lấy variant name từ order
    const variantName = completedOrder?.items[0]?.variant || null;

    // Auto moderate (basic)
    const autoApproved = autoModerate(content);

    // Tạo review
    const review = await prisma.review.create({
      data: {
        productId: Number(productId),
        userId,
        orderId: completedOrder?.id || null,
        rating: Number(rating),
        title: title || null,
        content,
        variantName,
        fitType: fitType || null,
        isVerified: !!completedOrder,
        status: autoApproved ? 'APPROVED' : 'PENDING',
        images: images?.length > 0 ? {
          create: images.map((url: string) => ({ url }))
        } : undefined
      },
      include: {
        images: true,
        user: {
          select: { id: true, name: true, avatar: true }
        }
      }
    });

    // Nếu auto-approved -> cập nhật stats
    if (autoApproved) {
      await updateProductRatingStats(Number(productId));
    }

    res.status(201).json({
      success: true,
      data: {
        ...review,
        user: {
          ...review.user,
          name: maskName(review.user.name)
        }
      },
      message: autoApproved
        ? 'Đánh giá đã được đăng!'
        : 'Đánh giá đang chờ duyệt!'
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo đánh giá!' });
  }
};

// =============================================
// HELPER FUNCTIONS
// =============================================

// Cập nhật rating stats cho product
export async function updateProductRatingStats(productId: number) {
  const stats = await prisma.review.aggregate({
    where: {
      productId,
      status: 'APPROVED'
    },
    _avg: { rating: true },
    _count: { id: true }
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAverage: Math.round((stats._avg.rating || 0) * 10) / 10,
      reviewCount: stats._count.id
    }
  });
}

// Auto moderation cơ bản
function autoModerate(content: string): boolean {
  const badWords = [
    'spam', 'quảng cáo', 'lừa đảo', 'fake', 'scam',
    'xxx', 'porn', 'sex'
  ];
  
  const lowerContent = content.toLowerCase();
  
  // Reject nếu có từ nhạy cảm
  if (badWords.some(word => lowerContent.includes(word))) {
    return false;
  }
  
  // Reject nếu quá ngắn
  if (content.trim().length < 10) {
    return false;
  }
  
  return true;
}

// Mask tên user cho privacy (Nguyễn Văn A -> Nguyễn V***)
function maskName(name: string | null): string {
  if (!name) return 'Ẩn danh';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0) + '***';
  }
  
  // Lấy họ + chữ cái đầu tên đệm/tên
  const lastName = parts[0];
  const firstChar = parts[parts.length - 1].charAt(0);
  
  return `${lastName} ${firstChar}***`;
}

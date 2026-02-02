import express from 'express';
import { prisma } from '../../lib/prisma';
import { updateProductRatingStats } from '../../controllers/reviewController';
import { sendReviewReplyNotification } from '../../services/emailService';

const router = express.Router();

// GET /admin/reviews - Danh sách reviews (all status)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      rating,
      productId,
      search,
      sortBy = 'newest'
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: {
      status?: string;
      rating?: number;
      productId?: number;
      OR?: Array<{ content?: { contains: string; mode: 'insensitive' }; title?: { contains: string; mode: 'insensitive' } }>;
    } = {};

    if (status && status !== 'all') {
      where.status = String(status);
    }

    if (rating) {
      where.rating = Number(rating);
    }

    if (productId) {
      where.productId = Number(productId);
    }

    if (search) {
      where.OR = [
        { content: { contains: String(search), mode: 'insensitive' } },
        { title: { contains: String(search), mode: 'insensitive' } }
      ];
    }

    // Build orderBy
    let orderBy: object = { createdAt: 'desc' };
    if (sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sortBy === 'rating_high') {
      orderBy = { rating: 'desc' };
    } else if (sortBy === 'rating_low') {
      orderBy = { rating: 'asc' };
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          product: {
            select: { id: true, name: true, slug: true }
          },
          images: true
        }
      }),
      prisma.review.count({ where })
    ]);

    // Đếm theo status
    const statusCounts = await prisma.review.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    const counts: Record<string, number> = {
      all: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      HIDDEN: 0
    };

    statusCounts.forEach(item => {
      counts[item.status] = item._count.id;
      counts.all += item._count.id;
    });

    res.json({
      success: true,
      data: reviews,
      counts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Admin get reviews error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách đánh giá!' });
  }
});

// GET /admin/reviews/:id - Chi tiết review
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatar: true }
        },
        product: {
          select: { id: true, name: true, slug: true, images: { take: 1 } }
        },
        order: {
          select: { id: true, orderNumber: true, createdAt: true, status: true }
        },
        images: true
      }
    });

    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá!' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Admin get review detail error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy chi tiết đánh giá!' });
  }
});

// PUT /admin/reviews/:id/status - Duyệt/Từ chối review
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'].includes(status)) {
      return res.status(400).json({
        error: 'Status phải là PENDING, APPROVED, REJECTED hoặc HIDDEN!'
      });
    }

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá!' });
    }

    const oldStatus = review.status;

    const updatedReview = await prisma.review.update({
      where: { id: Number(id) },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, slug: true } }
      }
    });

    // Cập nhật rating stats nếu status thay đổi liên quan đến APPROVED
    if (oldStatus !== status) {
      if (oldStatus === 'APPROVED' || status === 'APPROVED') {
        await updateProductRatingStats(review.productId);
      }
    }

    res.json({
      success: true,
      data: updatedReview,
      message: `Đã cập nhật trạng thái thành ${status}`
    });
  } catch (error) {
    console.error('Admin update review status error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật trạng thái!' });
  }
});

// PUT /admin/reviews/:id/reply - Shop trả lời review
router.put('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;
    const adminId = req.user?.id;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: 'Nội dung trả lời không được để trống!' });
    }

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá!' });
    }

    const updatedReview = await prisma.review.update({
      where: { id: Number(id) },
      data: {
        reply: reply.trim(),
        repliedAt: new Date(),
        repliedBy: adminId
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, slug: true } }
      }
    });

    // Gửi email thông báo cho khách hàng (non-blocking)
    if (updatedReview.user?.email) {
      sendReviewReplyNotification(updatedReview.user.email, {
        customerName: updatedReview.user.name,
        productName: updatedReview.product.name,
        productSlug: updatedReview.product.slug,
        rating: updatedReview.rating,
        reviewContent: updatedReview.content,
        replyContent: reply.trim(),
      }).catch(err => console.error('Email notification failed:', err));
    }

    res.json({
      success: true,
      data: updatedReview,
      message: 'Đã trả lời đánh giá thành công!'
    });
  } catch (error) {
    console.error('Admin reply review error:', error);
    res.status(500).json({ error: 'Lỗi khi trả lời đánh giá!' });
  }
});

// DELETE /admin/reviews/:id/reply - Xóa reply
router.delete('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá!' });
    }

    await prisma.review.update({
      where: { id: Number(id) },
      data: {
        reply: null,
        repliedAt: null,
        repliedBy: null
      }
    });

    res.json({ success: true, message: 'Đã xóa trả lời!' });
  } catch (error) {
    console.error('Admin delete reply error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa trả lời!' });
  }
});

// DELETE /admin/reviews/:id - Xóa review
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.review.findUnique({
      where: { id: Number(id) }
    });

    if (!review) {
      return res.status(404).json({ error: 'Không tìm thấy đánh giá!' });
    }

    const productId = review.productId;
    const wasApproved = review.status === 'APPROVED';

    await prisma.review.delete({ where: { id: Number(id) } });

    // Cập nhật stats nếu review đang approved
    if (wasApproved) {
      await updateProductRatingStats(productId);
    }

    res.json({ success: true, message: 'Đã xóa đánh giá!' });
  } catch (error) {
    console.error('Admin delete review error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa đánh giá!' });
  }
});

// POST /admin/reviews/bulk-status - Cập nhật nhiều review
router.post('/bulk-status', async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Danh sách IDs không hợp lệ!' });
    }

    if (!['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'].includes(status)) {
      return res.status(400).json({ error: 'Status không hợp lệ!' });
    }

    // Lấy các reviews cần update
    const reviews = await prisma.review.findMany({
      where: { id: { in: ids.map(Number) } },
      select: { id: true, productId: true, status: true }
    });

    // Cập nhật status
    await prisma.review.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: { status }
    });

    // Cập nhật rating stats cho các products bị ảnh hưởng
    const affectedProductIds = new Set<number>();
    reviews.forEach(r => {
      if (r.status === 'APPROVED' || status === 'APPROVED') {
        affectedProductIds.add(r.productId);
      }
    });

    for (const productId of affectedProductIds) {
      await updateProductRatingStats(productId);
    }

    res.json({
      success: true,
      message: `Đã cập nhật ${ids.length} đánh giá thành ${status}`
    });
  } catch (error) {
    console.error('Admin bulk update reviews error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật hàng loạt!' });
  }
});

export default router;

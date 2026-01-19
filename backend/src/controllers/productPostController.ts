import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const linkProductToPost = async (req: Request, res: Response) => {
  try {
    const { postId, productId, position, displayType, customNote } = req.body;

    if (!postId || !productId) {
      return res.status(400).json({ error: 'postId và productId là bắt buộc!' });
    }

    const post = await prisma.post.findUnique({ where: { id: Number(postId) } });
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    const link = await prisma.productOnPost.upsert({
      where: {
        postId_productId: {
          postId: Number(postId),
          productId: Number(productId),
        },
      },
      update: {
        position: position ? Number(position) : null,
        displayType: displayType || 'inline-card',
        customNote: customNote || null,
      },
      create: {
        postId: Number(postId),
        productId: Number(productId),
        position: position ? Number(position) : null,
        displayType: displayType || 'inline-card',
        customNote: customNote || null,
      },
    });

    res.status(201).json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error('Link product to post error:', error);
    res.status(500).json({ error: 'Lỗi khi liên kết sản phẩm với bài viết!' });
  }
};

export const unlinkProductFromPost = async (req: Request, res: Response) => {
  try {
    const { postId, productId } = req.params;

    await prisma.productOnPost.delete({
      where: {
        postId_productId: {
          postId: Number(postId),
          productId: Number(productId),
        },
      },
    });

    res.json({
      success: true,
      message: 'Đã hủy liên kết thành công!',
    });
  } catch (error) {
    console.error('Unlink product from post error:', error);
    res.status(500).json({ error: 'Lỗi khi hủy liên kết!' });
  }
};

export const getPostProducts = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { displayType } = req.query;

    const where: any = { postId: Number(postId) };
    if (displayType) where.displayType = String(displayType);

    const products = await prisma.productOnPost.findMany({
      where,
      include: {
        product: {
          include: {
            images: { take: 1 },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get post products error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách sản phẩm!' });
  }
};

export const getProductPosts = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const posts = await prisma.productOnPost.findMany({
      where: {
        productId: Number(productId),
        post: {
          isPublished: true,
          deletedAt: null,
        },
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            thumbnail: true,
            publishedAt: true,
            views: true,
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: posts,
    });
  } catch (error) {
    console.error('Get product posts error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách bài viết!' });
  }
};

export const batchLinkProducts = async (req: Request, res: Response) => {
  try {
    const { postId, products } = req.body;

    if (!postId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'postId và mảng products là bắt buộc!' });
    }

    const post = await prisma.post.findUnique({ where: { id: Number(postId) } });
    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    const links = await Promise.all(
      products.map((p: any) =>
        prisma.productOnPost.upsert({
          where: {
            postId_productId: {
              postId: Number(postId),
              productId: Number(p.productId),
            },
          },
          update: {
            position: p.position ? Number(p.position) : null,
            displayType: p.displayType || 'inline-card',
            customNote: p.customNote || null,
          },
          create: {
            postId: Number(postId),
            productId: Number(p.productId),
            position: p.position ? Number(p.position) : null,
            displayType: p.displayType || 'inline-card',
            customNote: p.customNote || null,
          },
        })
      )
    );

    res.status(201).json({
      success: true,
      data: links,
    });
  } catch (error) {
    console.error('Batch link products error:', error);
    res.status(500).json({ error: 'Lỗi khi liên kết hàng loạt!' });
  }
};

// Tự động gợi ý sản phẩm liên quan dựa trên nội dung bài viết
export const getRecommendedProducts = async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const limit = Number(req.query.limit) || 6;

    // Lấy thông tin bài viết
    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      include: {
        category: true,
        relatedProducts: {
          select: { productId: true },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    // Lấy danh sách ID sản phẩm đã được link thủ công
    const linkedProductIds = post.relatedProducts.map((p) => p.productId);

    // Extract keywords từ title (các từ khóa phổ biến trong ngành nội y)
    const keywords = [
      'nội y', 'áo lót', 'áo ngực', 'quần lót', 'đồ lót', 'bra', 'lingerie',
      'sexy', 'ren', 'lụa', 'cotton', 'lace', 'satin', 'silk',
      'bikini', 'thong', 'brief', 'boxer', 'push-up', 'bralette',
      'bodysuit', 'corset', 'babydoll', 'chemise', 'teddy',
      'pajama', 'pyjama', 'ngủ', 'mặc nhà', 'sleepwear',
      'sport', 'thể thao', 'yoga', 'gym',
      'nursing', 'bầu', 'cho con bú', 'maternity',
    ];

    // Tìm keywords trong title và content (lowercase)
    const postText = `${post.title} ${post.content || ''}`.toLowerCase();
    const matchedKeywords = keywords.filter((kw) => postText.includes(kw.toLowerCase()));

    // Build search condition
    const searchConditions: any[] = [];

    // 1. Match theo category name (ưu tiên cao nhất)
    if (post.category) {
      const categoryKeywords = post.category.name
        .toLowerCase()
        .split(/[\s,]+/)
        .filter((w) => w.length > 2);

      searchConditions.push({
        category: {
          OR: [
            { name: { contains: post.category.name, mode: 'insensitive' } },
            ...categoryKeywords.map((kw) => ({
              name: { contains: kw, mode: 'insensitive' },
            })),
          ],
        },
      });
    }

    // 2. Match theo keywords trong title/content
    if (matchedKeywords.length > 0) {
      searchConditions.push({
        OR: matchedKeywords.map((kw) => ({
          OR: [
            { name: { contains: kw, mode: 'insensitive' } },
            { description: { contains: kw, mode: 'insensitive' } },
          ],
        })),
      });
    }

    // Fallback: nếu không có điều kiện nào, lấy sản phẩm featured
    if (searchConditions.length === 0) {
      searchConditions.push({ isFeatured: true });
    }

    // Query sản phẩm
    const products = await prisma.product.findMany({
      where: {
        AND: [
          { isVisible: true },
          { deletedAt: null },
          { id: { notIn: linkedProductIds } }, // Loại trừ sản phẩm đã link
          {
            OR: searchConditions,
          },
        ],
      },
      include: {
        images: {
          take: 1,
          orderBy: { id: 'asc' },
        },
        category: {
          select: { name: true, slug: true },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { ratingAverage: 'desc' },
        { reviewCount: 'desc' },
      ],
      take: limit,
    });

    res.json({
      success: true,
      data: products,
      meta: {
        postId: post.id,
        postTitle: post.title,
        postCategory: post.category?.name,
        matchedKeywords,
        totalFound: products.length,
      },
    });
  } catch (error) {
    console.error('Get recommended products error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy sản phẩm gợi ý!' });
  }
};

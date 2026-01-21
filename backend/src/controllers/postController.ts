import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Helper: Extract product IDs from Lexical JSON content
interface LexicalNode {
  type: string;
  productId?: number;
  displayType?: 'inline-card' | 'sidebar' | 'end-collection';
  customNote?: string;
  isAd?: boolean;
  children?: LexicalNode[];
}

interface ExtractedProduct {
  productId: number;
  displayType: 'inline-card' | 'sidebar' | 'end-collection';
  customNote?: string;
  isAd: boolean;
  position: number;
}

function extractProductsFromContent(content: string): ExtractedProduct[] {
  try {
    const parsed = JSON.parse(content);
    const products: ExtractedProduct[] = [];
    let position = 0;

    function traverse(node: LexicalNode) {
      if (node.type === 'product' && node.productId) {
        products.push({
          productId: node.productId,
          displayType: node.displayType || 'inline-card',
          customNote: node.customNote,
          isAd: node.isAd ?? false,
          position: position++,
        });
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    }

    if (parsed.root) {
      traverse(parsed.root);
    }
    return products;
  } catch {
    // Content is not JSON (might be HTML or plain text)
    return [];
  }
}

// Sync ProductOnPost based on extracted products
async function syncProductOnPost(postId: number, products: ExtractedProduct[]) {
  // Delete existing links that are not in the new list
  const productIds = products.map(p => p.productId);
  
  await prisma.productOnPost.deleteMany({
    where: {
      postId,
      productId: { notIn: productIds.length > 0 ? productIds : [-1] }, // -1 to handle empty array
    },
  });

  // Upsert all products from content
  for (const product of products) {
    await prisma.productOnPost.upsert({
      where: {
        postId_productId: {
          postId,
          productId: product.productId,
        },
      },
      update: {
        position: product.position,
        displayType: product.displayType,
        customNote: product.customNote,
        isAd: product.isAd,
      },
      create: {
        postId,
        productId: product.productId,
        position: product.position,
        displayType: product.displayType,
        customNote: product.customNote,
        isAd: product.isAd,
      },
    });
  }
}

// Get all posts
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, categoryId, isPublished, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };
    if (categoryId) where.categoryId = Number(categoryId);
    if (isPublished !== undefined) where.isPublished = isPublished === 'true';
    if (search) {
      where.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { content: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách bài viết!' });
  }
};

// Get post by ID
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        category: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('Get post by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin bài viết!' });
  }
};

// Get post by slug
export const getPostBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const post = await prisma.post.findFirst({
      where: { 
        slug,
        deletedAt: null,
        isPublished: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        thumbnail: true,
        views: true,
        likeCount: true,
        isPublished: true,
        publishedAt: true,
        adEnabled: true,
        adDelaySeconds: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    // Increment views
    await prisma.post.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    });

    res.json({
      success: true,
      data: { ...post, views: post.views + 1 },
    });
  } catch (error) {
    console.error('Get post by slug error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin bài viết!' });
  }
};

// Create new post
export const createPost = async (req: Request, res: Response) => {
  try {
    const {
      title,
      slug,
      content,
      excerpt,
      thumbnail,
      authorId,
      categoryId,
      isPublished,
      publishedAt,
      adEnabled,
      adDelaySeconds,
    } = req.body;

    if (!title || !slug || !content || !authorId || !categoryId) {
      return res.status(400).json({ 
        error: 'Title, slug, content, authorId và categoryId là bắt buộc!' 
      });
    }

    const existingPost = await prisma.post.findFirst({
      where: { 
        slug,
        deletedAt: null,
      },
    });

    if (existingPost) {
      return res.status(400).json({ error: 'Slug đã được sử dụng!' });
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        thumbnail: thumbnail || null,
        authorId: Number(authorId),
        categoryId: Number(categoryId),
        isPublished: isPublished || false,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        adEnabled: adEnabled ?? false,
        adDelaySeconds: adDelaySeconds ?? 5,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });

    // Auto-sync ProductOnPost from Lexical content
    const extractedProducts = extractProductsFromContent(content);
    if (extractedProducts.length > 0) {
      await syncProductOnPost(post.id, extractedProducts);
    }

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo bài viết!' });
  }
};

// Update post
export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      content,
      excerpt,
      thumbnail,
      categoryId,
      isPublished,
      publishedAt,
      adEnabled,
      adDelaySeconds,
    } = req.body;

    const existingPost = await prisma.post.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    if (slug && slug !== existingPost.slug) {
      const slugExists = await prisma.post.findFirst({
        where: { 
          slug,
          deletedAt: null,
        },
      });

      if (slugExists) {
        return res.status(400).json({ error: 'Slug đã được sử dụng!' });
      }
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (slug) updateData.slug = slug;
    if (content) updateData.content = content;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (categoryId) updateData.categoryId = Number(categoryId);
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
      if (isPublished && !existingPost.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }
    if (publishedAt) updateData.publishedAt = new Date(publishedAt);
    if (adEnabled !== undefined) updateData.adEnabled = adEnabled;
    if (adDelaySeconds !== undefined) updateData.adDelaySeconds = adDelaySeconds;

    const post = await prisma.post.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });

    // Auto-sync ProductOnPost from Lexical content if content was updated
    if (content) {
      const extractedProducts = extractProductsFromContent(content);
      await syncProductOnPost(post.id, extractedProducts);
    }

    res.json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật bài viết!' });
  }
};

// Delete post (soft delete)
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Không tìm thấy bài viết!' });
    }

    await prisma.post.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Đã xóa bài viết thành công!',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa bài viết!' });
  }
};

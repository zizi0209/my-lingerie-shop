import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get all post categories
export const getAllPostCategories = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [categories, total] = await Promise.all([
      prisma.postCategory.findMany({
        where: { deletedAt: null },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      prisma.postCategory.count({ where: { deletedAt: null } }),
    ]);

    res.json({
      success: true,
      data: categories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all post categories error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách danh mục bài viết!' });
  }
};

// Get post category by ID
export const getPostCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.postCategory.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      include: {
        posts: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            thumbnail: true,
            isPublished: true,
            publishedAt: true,
            views: true,
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục bài viết!' });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get post category by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin danh mục bài viết!' });
  }
};

// Get post category by slug
export const getPostCategoryBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const category = await prisma.postCategory.findFirst({
      where: { 
        slug,
        deletedAt: null,
      },
      include: {
        posts: {
          where: { 
            deletedAt: null,
            isPublished: true,
          },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            thumbnail: true,
            publishedAt: true,
            views: true,
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { publishedAt: 'desc' },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục bài viết!' });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get post category by slug error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin danh mục bài viết!' });
  }
};

// Create new post category
export const createPostCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Tên và slug là bắt buộc!' });
    }

    const existingCategory = await prisma.postCategory.findFirst({
      where: { 
        slug,
        deletedAt: null,
      },
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Slug đã được sử dụng!' });
    }

    const category = await prisma.postCategory.create({
      data: { name, slug },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Create post category error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo danh mục bài viết!' });
  }
};

// Update post category
export const updatePostCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body;

    const existingCategory = await prisma.postCategory.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục bài viết!' });
    }

    if (slug && slug !== existingCategory.slug) {
      const slugExists = await prisma.postCategory.findFirst({
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
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;

    const category = await prisma.postCategory.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Update post category error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật danh mục bài viết!' });
  }
};

// Delete post category (soft delete)
export const deletePostCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.postCategory.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục bài viết!' });
    }

    if (category._count.posts > 0) {
      return res.status(400).json({
        error: `Không thể xóa danh mục vì còn ${category._count.posts} bài viết!`,
      });
    }

    await prisma.postCategory.update({
      where: { id: Number(id) },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Đã xóa danh mục bài viết thành công!',
    });
  } catch (error) {
    console.error('Delete post category error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa danh mục bài viết!' });
  }
};

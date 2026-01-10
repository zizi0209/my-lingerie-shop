import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      prisma.category.count(),
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
    console.error('Get all categories error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách danh mục!' });
  }
};

// Get category by ID
export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            salePrice: true,
            isFeatured: true,
            isVisible: true,
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin danh mục!' });
  }
};

// Get category by slug
export const getCategoryBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isVisible: true },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            salePrice: true,
            isFeatured: true,
            images: {
              take: 1,
              select: {
                url: true,
              },
            },
          },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Get category by slug error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin danh mục!' });
  }
};

// Create new category
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, image, productType } = req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({ error: 'Tên và slug là bắt buộc!' });
    }

    // Check if slug already exists
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Slug đã được sử dụng!' });
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        productType: productType || 'SLEEPWEAR',
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo danh mục!' });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image, productType } = req.body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
    }

    // If slug is being updated, check if it's already in use
    if (slug && slug !== existingCategory.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug },
      });

      if (slugExists) {
        return res.status(400).json({ error: 'Slug đã được sử dụng!' });
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description !== undefined) updateData.description = description || null;
    if (image !== undefined) updateData.image = image || null;
    if (productType) updateData.productType = productType;

    // Update category
    const category = await prisma.category.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật danh mục!' });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
    }

    // Check if category has products
    if (category._count.products > 0) {
      return res.status(400).json({
        error: `Không thể xóa danh mục vì còn ${category._count.products} sản phẩm!`,
      });
    }

    // Delete category
    await prisma.category.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa danh mục thành công!',
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa danh mục!' });
  }
};

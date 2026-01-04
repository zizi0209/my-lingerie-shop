import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// ==================== ATTRIBUTE CRUD ====================

// Get all attributes
export const getAllAttributes = async (req: Request, res: Response) => {
  try {
    const attributes = await prisma.attribute.findMany({
      orderBy: { order: 'asc' },
      include: {
        values: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { categories: true },
        },
      },
    });

    res.json({
      success: true,
      data: attributes,
    });
  } catch (error) {
    console.error('Get all attributes error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách thuộc tính!' });
  }
};

// Get attribute by ID
export const getAttributeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attribute = await prisma.attribute.findUnique({
      where: { id: Number(id) },
      include: {
        values: {
          orderBy: { order: 'asc' },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!attribute) {
      return res.status(404).json({ error: 'Không tìm thấy thuộc tính!' });
    }

    res.json({
      success: true,
      data: attribute,
    });
  } catch (error) {
    console.error('Get attribute by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin thuộc tính!' });
  }
};

// Create attribute
export const createAttribute = async (req: Request, res: Response) => {
  try {
    const { name, slug, type = 'SELECT', isFilterable = true, order = 0, values, categoryIds } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Tên và slug là bắt buộc!' });
    }

    // Check if slug exists
    const existing = await prisma.attribute.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Slug đã tồn tại!' });
    }

    const attribute = await prisma.attribute.create({
      data: {
        name,
        slug,
        type,
        isFilterable,
        order,
        values: values ? {
          create: values.map((v: { value: string; slug: string; meta?: object; order?: number }, idx: number) => ({
            value: v.value,
            slug: v.slug,
            meta: v.meta || null,
            order: v.order ?? idx,
          })),
        } : undefined,
        categories: categoryIds ? {
          create: categoryIds.map((catId: number, idx: number) => ({
            categoryId: catId,
            order: idx,
          })),
        } : undefined,
      },
      include: {
        values: true,
        categories: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: attribute,
    });
  } catch (error) {
    console.error('Create attribute error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo thuộc tính!' });
  }
};

// Update attribute
export const updateAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, type, isFilterable, order } = req.body;

    const existing = await prisma.attribute.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy thuộc tính!' });
    }

    // Check slug conflict
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.attribute.findUnique({ where: { slug } });
      if (slugExists) {
        return res.status(400).json({ error: 'Slug đã tồn tại!' });
      }
    }

    const attribute = await prisma.attribute.update({
      where: { id: Number(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(type !== undefined && { type }),
        ...(isFilterable !== undefined && { isFilterable }),
        ...(order !== undefined && { order }),
      },
      include: {
        values: { orderBy: { order: 'asc' } },
      },
    });

    res.json({
      success: true,
      data: attribute,
    });
  } catch (error) {
    console.error('Update attribute error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật thuộc tính!' });
  }
};

// Delete attribute
export const deleteAttribute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attribute = await prisma.attribute.findUnique({
      where: { id: Number(id) },
      include: {
        values: {
          include: {
            _count: { select: { products: true } },
          },
        },
      },
    });

    if (!attribute) {
      return res.status(404).json({ error: 'Không tìm thấy thuộc tính!' });
    }

    // Check if any value is used
    const usedValues = attribute.values.filter(v => v._count.products > 0);
    if (usedValues.length > 0) {
      return res.status(400).json({
        error: `Không thể xóa! ${usedValues.length} giá trị đang được sử dụng.`,
      });
    }

    await prisma.attribute.delete({ where: { id: Number(id) } });

    res.json({
      success: true,
      message: 'Đã xóa thuộc tính thành công!',
    });
  } catch (error) {
    console.error('Delete attribute error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa thuộc tính!' });
  }
};

// ==================== ATTRIBUTE VALUE CRUD ====================

// Add value to attribute
export const addAttributeValue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // attributeId
    const { value, slug, meta, order } = req.body;

    if (!value || !slug) {
      return res.status(400).json({ error: 'Giá trị và slug là bắt buộc!' });
    }

    const attributeValue = await prisma.attributeValue.create({
      data: {
        attributeId: Number(id),
        value,
        slug,
        meta: meta || null,
        order: order || 0,
      },
    });

    res.status(201).json({
      success: true,
      data: attributeValue,
    });
  } catch (error: unknown) {
    console.error('Add attribute value error:', error);
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return res.status(400).json({ error: 'Slug đã tồn tại trong thuộc tính này!' });
    }
    res.status(500).json({ error: 'Lỗi khi thêm giá trị!' });
  }
};

// Update attribute value
export const updateAttributeValue = async (req: Request, res: Response) => {
  try {
    const { valueId } = req.params;
    const { value, slug, meta, order } = req.body;

    const attributeValue = await prisma.attributeValue.update({
      where: { id: Number(valueId) },
      data: {
        ...(value !== undefined && { value }),
        ...(slug !== undefined && { slug }),
        ...(meta !== undefined && { meta }),
        ...(order !== undefined && { order }),
      },
    });

    res.json({
      success: true,
      data: attributeValue,
    });
  } catch (error) {
    console.error('Update attribute value error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật giá trị!' });
  }
};

// Delete attribute value
export const deleteAttributeValue = async (req: Request, res: Response) => {
  try {
    const { valueId } = req.params;

    const value = await prisma.attributeValue.findUnique({
      where: { id: Number(valueId) },
      include: {
        _count: { select: { products: true } },
      },
    });

    if (!value) {
      return res.status(404).json({ error: 'Không tìm thấy giá trị!' });
    }

    if (value._count.products > 0) {
      return res.status(400).json({
        error: `Không thể xóa! Giá trị đang được ${value._count.products} sản phẩm sử dụng.`,
      });
    }

    await prisma.attributeValue.delete({ where: { id: Number(valueId) } });

    res.json({
      success: true,
      message: 'Đã xóa giá trị thành công!',
    });
  } catch (error) {
    console.error('Delete attribute value error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa giá trị!' });
  }
};

// ==================== CATEGORY ATTRIBUTE ====================

// Assign attributes to category
export const assignAttributesToCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { attributeIds } = req.body; // Array of { attributeId, order }

    if (!Array.isArray(attributeIds)) {
      return res.status(400).json({ error: 'attributeIds phải là mảng!' });
    }

    // Delete existing assignments
    await prisma.categoryAttribute.deleteMany({
      where: { categoryId: Number(categoryId) },
    });

    // Create new assignments
    if (attributeIds.length > 0) {
      await prisma.categoryAttribute.createMany({
        data: attributeIds.map((item: { attributeId: number; order?: number }, idx: number) => ({
          categoryId: Number(categoryId),
          attributeId: item.attributeId,
          order: item.order ?? idx,
        })),
      });
    }

    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) },
      include: {
        attributes: {
          orderBy: { order: 'asc' },
          include: {
            attribute: {
              include: { values: { orderBy: { order: 'asc' } } },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Assign attributes to category error:', error);
    res.status(500).json({ error: 'Lỗi khi gán thuộc tính cho danh mục!' });
  }
};

// Get attributes for category
export const getAttributesForCategory = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    const categoryAttributes = await prisma.categoryAttribute.findMany({
      where: { categoryId: Number(categoryId) },
      orderBy: { order: 'asc' },
      include: {
        attribute: {
          include: {
            values: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    res.json({
      success: true,
      data: categoryAttributes.map(ca => ca.attribute),
    });
  } catch (error) {
    console.error('Get attributes for category error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thuộc tính danh mục!' });
  }
};

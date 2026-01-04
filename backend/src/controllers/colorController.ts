import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

/**
 * Màu sắc giờ được lưu trong Attribute system (type = COLOR)
 * Các API này proxy sang Attribute để giữ backward compatibility
 */

// Get all colors (public) - từ Attribute type=COLOR
export const getAllColors = async (req: Request, res: Response) => {
  try {
    const colorAttribute = await prisma.attribute.findFirst({
      where: { type: 'COLOR' },
      include: {
        values: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!colorAttribute) {
      return res.json({ success: true, data: [] });
    }

    // Map to legacy format
    const colors = colorAttribute.values.map(v => ({
      id: v.id,
      name: v.value,
      hexCode: (v.meta as { hexCode?: string } | null)?.hexCode || '#000000',
      isActive: true,
      order: v.order,
      _count: { variants: 0 }, // TODO: count variants if needed
    }));

    res.json({
      success: true,
      data: colors,
    });
  } catch (error) {
    console.error('Get all colors error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách màu sắc!' });
  }
};

// Get colors with products (for filter)
export const getColorsWithProducts = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.query;

    // Get unique color names from product variants
    const variantsWithColors = await prisma.productVariant.findMany({
      where: {
        product: {
          isVisible: true,
          deletedAt: null,
          ...(categoryId ? { categoryId: Number(categoryId) } : {}),
        },
      },
      select: {
        colorName: true,
      },
      distinct: ['colorName'],
    });

    const colorNames = variantsWithColors.map(v => v.colorName);

    // Get color attribute values that match variant color names
    const colorAttribute = await prisma.attribute.findFirst({
      where: { type: 'COLOR' },
      include: {
        values: {
          where: {
            value: { in: colorNames },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    const colors = colorAttribute?.values.map(v => ({
      id: v.id,
      name: v.value,
      hexCode: (v.meta as { hexCode?: string } | null)?.hexCode || '#000000',
    })) || [];

    res.json({
      success: true,
      data: colors,
    });
  } catch (error) {
    console.error('Get colors with products error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách màu sắc!' });
  }
};

// Get color by ID
export const getColorById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attributeValue = await prisma.attributeValue.findUnique({
      where: { id: Number(id) },
      include: {
        attribute: true,
      },
    });

    if (!attributeValue || attributeValue.attribute.type !== 'COLOR') {
      return res.status(404).json({ error: 'Không tìm thấy màu sắc!' });
    }

    const color = {
      id: attributeValue.id,
      name: attributeValue.value,
      hexCode: (attributeValue.meta as { hexCode?: string } | null)?.hexCode || '#000000',
      isActive: true,
      order: attributeValue.order,
      _count: { variants: 0 },
    };

    res.json({
      success: true,
      data: color,
    });
  } catch (error) {
    console.error('Get color by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin màu sắc!' });
  }
};

// Create new color (admin only) - Tạo AttributeValue trong Attribute type=COLOR
export const createColor = async (req: Request, res: Response) => {
  try {
    const { name, hexCode, order = 0 } = req.body;

    if (!name || !hexCode) {
      return res.status(400).json({ error: 'Tên và mã màu là bắt buộc!' });
    }

    // Validate hex code format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(hexCode)) {
      return res.status(400).json({ error: 'Mã màu không hợp lệ! Vui lòng sử dụng định dạng #RRGGBB' });
    }

    // Find or create COLOR attribute
    let colorAttribute = await prisma.attribute.findFirst({
      where: { type: 'COLOR' },
    });

    if (!colorAttribute) {
      colorAttribute = await prisma.attribute.create({
        data: {
          name: 'Màu sắc',
          slug: 'mau-sac',
          type: 'COLOR',
          isFilterable: true,
          order: 0,
        },
      });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if value already exists
    const existingValue = await prisma.attributeValue.findFirst({
      where: {
        attributeId: colorAttribute.id,
        value: name,
      },
    });

    if (existingValue) {
      return res.status(400).json({ error: 'Tên màu đã tồn tại!' });
    }

    const attributeValue = await prisma.attributeValue.create({
      data: {
        attributeId: colorAttribute.id,
        value: name,
        slug,
        meta: { hexCode: hexCode.toUpperCase() },
        order: Number(order),
      },
    });

    // Map to legacy format
    const color = {
      id: attributeValue.id,
      name: attributeValue.value,
      hexCode: hexCode.toUpperCase(),
      isActive: true,
      order: attributeValue.order,
    };

    res.status(201).json({
      success: true,
      data: color,
    });
  } catch (error) {
    console.error('Create color error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo màu sắc!' });
  }
};

// Update color (admin only) - Cập nhật AttributeValue
export const updateColor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, hexCode, order } = req.body;

    const existingValue = await prisma.attributeValue.findUnique({
      where: { id: Number(id) },
      include: { attribute: true },
    });

    if (!existingValue || existingValue.attribute.type !== 'COLOR') {
      return res.status(404).json({ error: 'Không tìm thấy màu sắc!' });
    }

    // If name is being updated, check if it's already in use
    if (name && name !== existingValue.value) {
      const nameExists = await prisma.attributeValue.findFirst({
        where: {
          attributeId: existingValue.attributeId,
          value: name,
        },
      });

      if (nameExists) {
        return res.status(400).json({ error: 'Tên màu đã tồn tại!' });
      }
    }

    // Validate hex code if provided
    if (hexCode) {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexRegex.test(hexCode)) {
        return res.status(400).json({ error: 'Mã màu không hợp lệ!' });
      }
    }

    // Build update data
    const currentMeta = (existingValue.meta as { hexCode?: string } | null) || {};
    const updateData: {
      value?: string;
      slug?: string;
      meta?: { hexCode: string };
      order?: number;
    } = {};
    
    if (name !== undefined) {
      updateData.value = name;
      updateData.slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    if (hexCode !== undefined) {
      updateData.meta = { ...currentMeta, hexCode: hexCode.toUpperCase() };
    }
    if (order !== undefined) updateData.order = Number(order);

    const attributeValue = await prisma.attributeValue.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Map to legacy format
    const color = {
      id: attributeValue.id,
      name: attributeValue.value,
      hexCode: (attributeValue.meta as { hexCode?: string } | null)?.hexCode || '#000000',
      isActive: true,
      order: attributeValue.order,
    };

    res.json({
      success: true,
      data: color,
    });
  } catch (error) {
    console.error('Update color error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật màu sắc!' });
  }
};

// Delete color (admin only) - Xóa AttributeValue
export const deleteColor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attributeValue = await prisma.attributeValue.findUnique({
      where: { id: Number(id) },
      include: {
        attribute: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!attributeValue || attributeValue.attribute.type !== 'COLOR') {
      return res.status(404).json({ error: 'Không tìm thấy màu sắc!' });
    }

    // Check if color is being used in variants
    const variantCount = await prisma.productVariant.count({
      where: { colorName: attributeValue.value },
    });

    if (variantCount > 0) {
      return res.status(400).json({
        error: `Không thể xóa màu sắc vì đang được sử dụng bởi ${variantCount} biến thể sản phẩm!`,
      });
    }

    await prisma.attributeValue.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa màu sắc thành công!',
    });
  } catch (error) {
    console.error('Delete color error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa màu sắc!' });
  }
};

// Reorder colors (admin only) - Cập nhật order của AttributeValue
export const reorderColors = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ!' });
    }

    // Update all attribute values in a transaction
    await prisma.$transaction(
      orders.map(({ id, order }: { id: number; order: number }) =>
        prisma.attributeValue.update({
          where: { id },
          data: { order },
        })
      )
    );

    res.json({
      success: true,
      message: 'Đã cập nhật thứ tự màu sắc!',
    });
  } catch (error) {
    console.error('Reorder colors error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật thứ tự!' });
  }
};

import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get all colors (public)
export const getAllColors = async (req: Request, res: Response) => {
  try {
    const { activeOnly } = req.query;
    
    const where = activeOnly === 'true' ? { isActive: true } : {};

    const colors = await prisma.color.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { variants: true },
        },
      },
    });

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

    // Get colors that have at least one product variant
    const colors = await prisma.color.findMany({
      where: {
        isActive: true,
        variants: {
          some: {
            product: {
              isVisible: true,
              deletedAt: null,
              ...(categoryId ? { categoryId: Number(categoryId) } : {}),
            },
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        hexCode: true,
      },
    });

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

    const color = await prisma.color.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { variants: true },
        },
      },
    });

    if (!color) {
      return res.status(404).json({ error: 'Không tìm thấy màu sắc!' });
    }

    res.json({
      success: true,
      data: color,
    });
  } catch (error) {
    console.error('Get color by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin màu sắc!' });
  }
};

// Create new color (admin only)
export const createColor = async (req: Request, res: Response) => {
  try {
    const { name, hexCode, isActive = true, order = 0 } = req.body;

    if (!name || !hexCode) {
      return res.status(400).json({ error: 'Tên và mã màu là bắt buộc!' });
    }

    // Validate hex code format
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexRegex.test(hexCode)) {
      return res.status(400).json({ error: 'Mã màu không hợp lệ! Vui lòng sử dụng định dạng #RRGGBB' });
    }

    // Check if name already exists
    const existingColor = await prisma.color.findUnique({
      where: { name },
    });

    if (existingColor) {
      return res.status(400).json({ error: 'Tên màu đã tồn tại!' });
    }

    const color = await prisma.color.create({
      data: {
        name,
        hexCode: hexCode.toUpperCase(),
        isActive,
        order: Number(order),
      },
    });

    res.status(201).json({
      success: true,
      data: color,
    });
  } catch (error) {
    console.error('Create color error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo màu sắc!' });
  }
};

// Update color (admin only)
export const updateColor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, hexCode, isActive, order } = req.body;

    const existingColor = await prisma.color.findUnique({
      where: { id: Number(id) },
    });

    if (!existingColor) {
      return res.status(404).json({ error: 'Không tìm thấy màu sắc!' });
    }

    // If name is being updated, check if it's already in use
    if (name && name !== existingColor.name) {
      const nameExists = await prisma.color.findUnique({
        where: { name },
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

    const updateData: {
      name?: string;
      hexCode?: string;
      isActive?: boolean;
      order?: number;
    } = {};
    
    if (name !== undefined) updateData.name = name;
    if (hexCode !== undefined) updateData.hexCode = hexCode.toUpperCase();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = Number(order);

    const color = await prisma.color.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: color,
    });
  } catch (error) {
    console.error('Update color error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật màu sắc!' });
  }
};

// Delete color (admin only)
export const deleteColor = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const color = await prisma.color.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { variants: true },
        },
      },
    });

    if (!color) {
      return res.status(404).json({ error: 'Không tìm thấy màu sắc!' });
    }

    // Check if color is being used
    if (color._count.variants > 0) {
      return res.status(400).json({
        error: `Không thể xóa màu sắc vì đang được sử dụng bởi ${color._count.variants} biến thể sản phẩm!`,
      });
    }

    await prisma.color.delete({
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

// Reorder colors (admin only)
export const reorderColors = async (req: Request, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id, order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ!' });
    }

    // Update all colors in a transaction
    await prisma.$transaction(
      orders.map(({ id, order }: { id: number; order: number }) =>
        prisma.color.update({
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

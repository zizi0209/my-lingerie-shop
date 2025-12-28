import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get all page sections
export const getAllPageSections = async (req: Request, res: Response) => {
  try {
    const { includeHidden = false } = req.query;

    const sections = await prisma.pageSection.findMany({
      where: includeHidden === 'false' ? { isVisible: true } : undefined,
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Get all page sections error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách section!' });
  }
};

// Get page section by ID
export const getPageSectionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const section = await prisma.pageSection.findUnique({
      where: { id: Number(id) },
    });

    if (!section) {
      return res.status(404).json({ error: 'Không tìm thấy section!' });
    }

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Get page section by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin section!' });
  }
};

// Get page section by code
export const getPageSectionByCode = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const section = await prisma.pageSection.findUnique({
      where: { code },
    });

    if (!section) {
      return res.status(404).json({ error: 'Không tìm thấy section!' });
    }

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Get page section by code error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin section!' });
  }
};

// Create new page section
export const createPageSection = async (req: Request, res: Response) => {
  try {
    const { code, name, isVisible = true, order = 0, content } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ error: 'Code và name là bắt buộc!' });
    }

    // Check if code already exists
    const existingSection = await prisma.pageSection.findUnique({
      where: { code },
    });

    if (existingSection) {
      return res.status(400).json({ error: 'Code đã được sử dụng!' });
    }

    // Create page section
    const section = await prisma.pageSection.create({
      data: {
        code,
        name,
        isVisible,
        order,
        content: content || null,
      },
    });

    res.status(201).json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Create page section error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo section!' });
  }
};

// Update page section
export const updatePageSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, isVisible, order, content } = req.body;

    // Check if section exists
    const existingSection = await prisma.pageSection.findUnique({
      where: { id: Number(id) },
    });

    if (!existingSection) {
      return res.status(404).json({ error: 'Không tìm thấy section!' });
    }

    // If code is being updated, check if it's already in use
    if (code && code !== existingSection.code) {
      const codeExists = await prisma.pageSection.findUnique({
        where: { code },
      });

      if (codeExists) {
        return res.status(400).json({ error: 'Code đã được sử dụng!' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (isVisible !== undefined) updateData.isVisible = isVisible;
    if (order !== undefined) updateData.order = order;
    if (content !== undefined) updateData.content = content;

    // Update page section
    const section = await prisma.pageSection.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Update page section error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật section!' });
  }
};

// Delete page section
export const deletePageSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if section exists
    const section = await prisma.pageSection.findUnique({
      where: { id: Number(id) },
    });

    if (!section) {
      return res.status(404).json({ error: 'Không tìm thấy section!' });
    }

    // Delete section
    await prisma.pageSection.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa section thành công!',
    });
  } catch (error) {
    console.error('Delete page section error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa section!' });
  }
};

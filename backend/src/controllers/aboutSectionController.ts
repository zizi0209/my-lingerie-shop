import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

// Get all about sections
export const getAllAboutSections = async (req: Request, res: Response) => {
  try {
    const { includeInactive = 'false' } = req.query;

    const sections = await prisma.aboutSection.findMany({
      where: includeInactive === 'false' ? { isActive: true } : undefined,
      orderBy: { order: 'asc' },
    });

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Get all about sections error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách section!' });
  }
};

// Get about section by ID
export const getAboutSectionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const section = await prisma.aboutSection.findUnique({
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
    console.error('Get about section by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin section!' });
  }
};

// Get about section by sectionKey
export const getAboutSectionByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;

    const section = await prisma.aboutSection.findUnique({
      where: { sectionKey: key },
    });

    if (!section) {
      return res.status(404).json({ error: 'Không tìm thấy section!' });
    }

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Get about section by key error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin section!' });
  }
};

// Update about section (Admin only)
export const updateAboutSection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, subtitle, content, imageUrl, metadata, order, isActive } = req.body;

    const existingSection = await prisma.aboutSection.findUnique({
      where: { id: Number(id) },
    });

    if (!existingSection) {
      return res.status(404).json({ error: 'Không tìm thấy section!' });
    }

    const updateData: {
      title?: string | null;
      subtitle?: string | null;
      content?: string | null;
      imageUrl?: string | null;
      metadata?: Prisma.InputJsonValue;
      order?: number;
      isActive?: boolean;
    } = {};
    
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (content !== undefined) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;

    const section = await prisma.aboutSection.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    console.error('Update about section error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật section!' });
  }
};

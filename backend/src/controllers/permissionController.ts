import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get all permissions
export const getAllPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { roles: true },
        },
      },
    });

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error) {
    console.error('Get all permissions error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách quyền!' });
  }
};

// Get permission by ID
export const getPermissionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: Number(id) },
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!permission) {
      return res.status(404).json({ error: 'Không tìm thấy quyền!' });
    }

    res.json({
      success: true,
      data: permission,
    });
  } catch (error) {
    console.error('Get permission by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin quyền!' });
  }
};

// Create new permission
export const createPermission = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tên quyền là bắt buộc!' });
    }

    const existingPermission = await prisma.permission.findUnique({
      where: { name },
    });

    if (existingPermission) {
      return res.status(400).json({ error: 'Tên quyền đã được sử dụng!' });
    }

    const permission = await prisma.permission.create({
      data: {
        name,
        description: description || null,
      },
    });

    res.status(201).json({
      success: true,
      data: permission,
    });
  } catch (error) {
    console.error('Create permission error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo quyền!' });
  }
};

// Update permission
export const updatePermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingPermission = await prisma.permission.findUnique({
      where: { id: Number(id) },
    });

    if (!existingPermission) {
      return res.status(404).json({ error: 'Không tìm thấy quyền!' });
    }

    if (name && name !== existingPermission.name) {
      const nameExists = await prisma.permission.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(400).json({ error: 'Tên quyền đã được sử dụng!' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const permission = await prisma.permission.update({
      where: { id: Number(id) },
      data: updateData,
    });

    res.json({
      success: true,
      data: permission,
    });
  } catch (error) {
    console.error('Update permission error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật quyền!' });
  }
};

// Delete permission
export const deletePermission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { roles: true },
        },
      },
    });

    if (!permission) {
      return res.status(404).json({ error: 'Không tìm thấy quyền!' });
    }

    if (permission._count.roles > 0) {
      return res.status(400).json({
        error: `Không thể xóa quyền vì đang được sử dụng bởi ${permission._count.roles} vai trò!`,
      });
    }

    await prisma.permission.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa quyền thành công!',
    });
  } catch (error) {
    console.error('Delete permission error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa quyền!' });
  }
};

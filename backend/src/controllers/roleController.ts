import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

// Get all roles
export const getAllRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        permissions: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    res.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error('Get all roles error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách vai trò!' });
  }
};

// Get role by ID
export const getRoleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: {
        permissions: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { users: true, permissions: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Không tìm thấy vai trò!' });
    }

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Get role by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin vai trò!' });
  }
};

// Create new role
export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, permissionIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tên vai trò là bắt buộc!' });
    }

    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return res.status(400).json({ error: 'Tên vai trò đã được sử dụng!' });
    }

    const role = await prisma.role.create({
      data: {
        name,
        description: description || null,
        permissions: permissionIds
          ? {
              connect: permissionIds.map((id: number) => ({ id })),
            }
          : undefined,
      },
      include: {
        permissions: true,
      },
    });

    res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo vai trò!' });
  }
};

// Update role
export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, permissionIds } = req.body;

    const existingRole = await prisma.role.findUnique({
      where: { id: Number(id) },
    });

    if (!existingRole) {
      return res.status(404).json({ error: 'Không tìm thấy vai trò!' });
    }

    if (name && name !== existingRole.name) {
      const nameExists = await prisma.role.findUnique({
        where: { name },
      });

      if (nameExists) {
        return res.status(400).json({ error: 'Tên vai trò đã được sử dụng!' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    if (permissionIds) {
      updateData.permissions = {
        set: permissionIds.map((id: number) => ({ id })),
      };
    }

    const role = await prisma.role.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        permissions: true,
      },
    });

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật vai trò!' });
  }
};

// Delete role
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: Number(id) },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      return res.status(404).json({ error: 'Không tìm thấy vai trò!' });
    }

    if (role._count.users > 0) {
      return res.status(400).json({
        error: `Không thể xóa vai trò vì còn ${role._count.users} người dùng!`,
      });
    }

    await prisma.role.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa vai trò thành công!',
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa vai trò!' });
  }
};

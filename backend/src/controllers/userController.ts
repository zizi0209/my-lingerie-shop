import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET không được cấu hình trong file .env!');
}

const JWT_SECRET = process.env.JWT_SECRET;

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, roleId } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email và password là bắt buộc!' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng!' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        roleId: roleId ? Number(roleId) : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, roleId: user.roleId, roleName: user.role?.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Lỗi khi đăng ký!' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email và password là bắt buộc!' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Email hoặc password không đúng!' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email hoặc password không đúng!' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, roleId: user.roleId, roleName: user.role?.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          role: user.role,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Lỗi khi đăng nhập!' });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, roleId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { deletedAt: null };
    if (roleId) where.roleId = Number(roleId);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          roleId: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách người dùng!' });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin người dùng!' });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, phone, avatar, roleId, isActive, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // If email is being updated, check if it's already in use
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { 
          email,
          deletedAt: null,
        },
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email đã được sử dụng!' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (roleId !== undefined) updateData.roleId = roleId ? Number(roleId) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật người dùng!' });
  }
};

// Delete user (soft delete)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: Number(id) },
      data: { 
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.json({
      success: true,
      message: 'Đã xóa người dùng thành công!',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa người dùng!' });
  }
};

// Get current user profile (requires authentication)
export const getProfile = async (req: Request, res: Response) => {
  try {
    // Assumes authentication middleware adds user to request
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực!' });
    }

    const user = await prisma.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin profile!' });
  }
};

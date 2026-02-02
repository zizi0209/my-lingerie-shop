import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { validate, registerSchema, loginSchema, updateUserSchema, changePasswordSchema } from '../utils/validation';
import { sanitizeUser, sanitizeUsers } from '../utils/sanitize';
import { auditLog } from '../utils/auditLog';
import { AuditActions } from '../utils/constants';
import { sendPasswordChangeNotification } from '../services/emailService';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET không được cấu hình trong file .env!');
}

const JWT_SECRET = process.env.JWT_SECRET;
const LOCKOUT_THRESHOLD = 5; // Failed login attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    // Validate input with Zod
    const validated = validate(registerSchema, req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validated.email,
        deletedAt: null
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng!' });
    }

    // Hash password with bcrypt cost 12 (security best practice)
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Create user - FORCE role to USER, never trust client input for role
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        name: validated.name || null,
        roleId: null, // Users start without a role, admin assigns later
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        tokenVersion: 0
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

    // NOTE: Không ghi audit log cho user tự đăng ký - đây là user action thông thường
    // Audit log chỉ dành cho Admin actions

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        roleId: user.roleId, 
        roleName: user.role?.name,
        tokenVersion: 0
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    
    // Don't expose validation errors in production
    if (error.message && process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Lỗi khi đăng ký!' });
  }
};

// Login user with account lockout protection
export const login = async (req: Request, res: Response) => {
  try {
    // Validate input
    const validated = validate(loginSchema, req.body);

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: validated.email,
        deletedAt: null // Only find active (non-deleted) users
      },
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
      // Don't reveal if email exists
      return res.status(401).json({ error: 'Email hoặc password không đúng!' });
    }

    // Check if account is active
    if (!user.isActive) {
      // Không ghi log cho user thường bị vô hiệu hóa - tránh noise
      return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa!' });
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      // Không ghi log thêm - đã ghi khi lock account rồi
      return res.status(403).json({
        error: `Tài khoản bị khóa do đăng nhập sai quá nhiều. Vui lòng thử lại sau ${minutesLeft} phút.`,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    // Check if social user
    if (!user.password) {
      return res.status(400).json({
        error: 'Tài khoản này đăng ký qua mạng xã hội và không có mật khẩu.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validated.password, user.password);

    if (!isPasswordValid) {
      // Increment failed attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= LOCKOUT_THRESHOLD;
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null
        }
      });

      // Chỉ ghi log khi sắp bị lock (>=3 lần) để tránh noise
      if (failedAttempts >= 3) {
        await auditLog({
          userId: user.id,
          action: AuditActions.LOGIN_FAILED,
          resource: 'USER',
          resourceId: String(user.id),
          severity: shouldLock ? 'CRITICAL' : 'WARNING'
        }, req);
      }

      if (shouldLock) {
        return res.status(403).json({
          error: `Tài khoản đã bị khóa do đăng nhập sai ${LOCKOUT_THRESHOLD} lần. Vui lòng thử lại sau 15 phút.`
        });
      }

      return res.status(401).json({
        error: `Email hoặc password không đúng! (Còn ${LOCKOUT_THRESHOLD - failedAttempts} lần thử)`
      });
    }

    // Success - Reset failed attempts and update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
        lastLoginAt: new Date()
      },
    });

    // Không ghi audit log cho user login thành công - tránh noise
    // Chỉ ghi log cho Admin/Mod login (ở authController)

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        roleId: user.roleId, 
        roleName: user.role?.name,
        tokenVersion: user.tokenVersion
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: sanitizeUser({
          id: user.id,
          email: user.email,
          name: user.name,
          roleId: user.roleId,
          role: user.role,
          createdAt: user.createdAt,
        }),
        token,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.message && process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ error: error.message });
    }
    
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

    // Sanitize all users (remove sensitive fields)
    const sanitizedUsers = sanitizeUsers(users);

    res.json({
      success: true,
      data: sanitizedUsers,
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
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin người dùng!' });
  }
};

// Update user (admin only)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate input
    const validated = validate(updateUserSchema, req.body);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      include: {
        role: true
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // Prevent self role change (admins shouldn't demote themselves)
    if (validated.roleId && req.user && req.user.id === Number(id)) {
      return res.status(400).json({ error: 'Không thể thay đổi vai trò của chính mình!' });
    }

    // If email is being updated, check if it's already in use
    if (validated.email && validated.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: { 
          email: validated.email,
          deletedAt: null,
        },
      });

      if (emailExists) {
        return res.status(400).json({ error: 'Email đã được sử dụng!' });
      }
    }

    // Prepare update data (whitelist approach - only allow validated fields)
    const updateData: any = {};
    if (validated.email) updateData.email = validated.email;
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.phone !== undefined) updateData.phone = validated.phone;
    if (validated.roleId !== undefined) updateData.roleId = validated.roleId;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

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

    // Audit log (critical for role changes)
    const severity = existingUser.roleId !== user.roleId ? 'CRITICAL' : 'INFO';
    const action = existingUser.roleId !== user.roleId 
      ? AuditActions.CHANGE_ROLE 
      : AuditActions.UPDATE_USER;

    await auditLog({
      userId: req.user!.id,
      action,
      resource: 'USER',
      resourceId: String(user.id),
      oldValue: sanitizeUser(existingUser),
      newValue: sanitizeUser(user),
      severity
    }, req);

    res.json({
      success: true,
      data: sanitizeUser(user),
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    
    if (error.message && process.env.NODE_ENV !== 'production') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Lỗi khi cập nhật người dùng!' });
  }
};

// Delete user (soft delete, admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (req.user && req.user.id === Number(id)) {
      return res.status(400).json({ error: 'Không thể xóa tài khoản của chính mình!' });
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: { 
        id: Number(id),
        deletedAt: null,
      },
      include: {
        role: true
      }
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

    // Critical audit log (user deletion)
    await auditLog({
      userId: req.user!.id,
      action: AuditActions.DELETE_USER,
      resource: 'USER',
      resourceId: String(id),
      oldValue: sanitizeUser(user),
      newValue: null,
      severity: 'CRITICAL'
    }, req);

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
    // Get userId from authenticated request
    const userId = req.user?.id;

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
      data: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin profile!' });
  }
};

// Update own profile (authenticated user)
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực!' });
    }

    const { name, phone, avatar } = req.body;
    // NOTE: User measurements are stored in UserPreference model, not User model

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // Prepare update data (only allow specific fields)
    const updateData: { name?: string; phone?: string; avatar?: string } = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
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
        createdAt: true,
        updatedAt: true,
      },
    });

    // Không ghi audit log cho user tự cập nhật profile - đây là user action thông thường

    res.json({
      success: true,
      data: sanitizeUser(user),
      message: 'Cập nhật thông tin thành công!',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật thông tin!' });
  }
};

// Upload avatar (authenticated user)
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực!' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Không có file được upload!' });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Chỉ chấp nhận file ảnh!' });
    }

    // Validate file size (max 5MB)
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Kích thước file tối đa 5MB!' });
    }

    // Import cloudinary dynamically
    const { cloudinary } = await import('../config/cloudinary');

    // Upload to Cloudinary with avatar-specific transformations
    const uploadPromise = new Promise<string>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'lingerie-shop/avatars',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Square crop, focus on face
            { quality: 'auto:good' }, // Good quality
            { fetch_format: 'webp' }, // Auto convert to WebP
          ],
          public_id: `user_${userId}_${Date.now()}`, // Unique filename
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error('Không nhận được kết quả từ Cloudinary!'));
          } else {
            resolve(result.secure_url);
          }
        }
      ).end(req.file!.buffer);
    });

    const avatarUrl = await uploadPromise;

    // Update user avatar in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        phone: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: sanitizeUser(user),
      message: 'Cập nhật ảnh đại diện thành công!',
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Lỗi khi upload ảnh đại diện!' });
  }
};

// Change password (authenticated user)
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực!' });
    }

    // Validate input
    const validated = validate(changePasswordSchema, req.body);

    // Get user with password
    const user = await prisma.user.findFirst({
      where: { 
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng!' });
    }

    // Check if social user (no password)
    if (!user.password) {
      return res.status(400).json({
        error: 'Tài khoản này đăng ký qua mạng xã hội và không có mật khẩu để đổi. Vui lòng quản lý mật khẩu qua nhà cung cấp OAuth.',
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(validated.currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng!' });
    }

    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(validated.newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: 'Mật khẩu mới không được trùng với mật khẩu cũ!' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(validated.newPassword, 12);

    // Update password and increment token version (invalidate all tokens)
    await prisma.user.update({
      where: { id: userId },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Send security notification email (async - don't block response)
    const ip = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    sendPasswordChangeNotification(user.email, user.name, {
      ip,
      userAgent,
      timestamp: new Date()
    }).catch(error => {
      // Log error but don't fail the password change
      console.error('Failed to send password change notification:', error);
    });

    // Không ghi audit log cho user tự đổi mật khẩu - đây là user action thông thường
    // Admin đổi mật khẩu sẽ được log ở admin routes

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.',
    });
  } catch (error: unknown) {
    console.error('Change password error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi khi đổi mật khẩu!';
    if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: 'Lỗi khi đổi mật khẩu!' });
  }
};

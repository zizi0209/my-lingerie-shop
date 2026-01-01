import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET không được cấu hình trong file .env!');
}

const JWT_SECRET = process.env.JWT_SECRET;

interface JwtPayload {
  userId: number;
  email: string;
  roleId: number | null;
  roleName?: string;
  tokenVersion: number;
  iat?: number;
}

export interface AuthUser {
  id: number;
  email: string;
  roleId: number | null;
  roleName: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication middleware with comprehensive security checks
 * - Verifies JWT token
 * - Checks account lock status
 * - Validates token version (for logout all sessions)
 * - Checks password change timestamp
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token không được cung cấp!' });
    }

    // Verify JWT
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token đã hết hạn!' });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Token không hợp lệ!' });
      }
      throw error;
    }

    // CRITICAL: Verify from database, don't trust JWT alone
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        roleId: true,
        role: {
          select: {
            name: true
          }
        },
        isActive: true,
        lockedUntil: true,
        passwordChangedAt: true,
        tokenVersion: true,
        deletedAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Người dùng không tồn tại!' });
    }

    // Check if user is deleted
    if (user.deletedAt) {
      return res.status(401).json({ error: 'Tài khoản đã bị xóa!' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa!' });
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({
        error: `Tài khoản bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.`,
        lockedUntil: user.lockedUntil.toISOString()
      });
    }

    // Check token version (for logout all sessions)
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ 
        error: 'Token đã bị thu hồi. Vui lòng đăng nhập lại!' 
      });
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && decoded.iat) {
      const pwdChangedTime = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < pwdChangedTime) {
        return res.status(401).json({ 
          error: 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại!' 
        });
      }
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name ?? null
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Lỗi xác thực!' });
  }
}

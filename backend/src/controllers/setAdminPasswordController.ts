import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { auditLog } from '../utils/auditLog';
import { revokeAllUserTokens } from '../utils/tokenUtils';

/**
 * POST /api/auth/set-admin-password
 * Set password for admin accounts created via social login
 * This is required for dashboard access (Enterprise Security)
 */
export const setAdminPassword = async (req: Request, res: Response) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Validation
    if (!token || !password || !confirmPassword) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp đầy đủ thông tin (token, password, confirmPassword)'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Mật khẩu xác nhận không khớp'
      });
    }

    // Password strength validation (Admin-grade)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Mật khẩu không đủ mạnh',
        requirements: {
          minLength: 12,
          uppercase: 'Ít nhất 1 chữ hoa',
          lowercase: 'Ít nhất 1 chữ thường',
          number: 'Ít nhất 1 số',
          special: 'Ít nhất 1 ký tự đặc biệt (@$!%*?&)'
        }
      });
    }

    // Find valid token in database
    const setupTokens = await prisma.passwordSetupToken.findMany({
      where: {
        expiresAt: { gte: new Date() }, // Not expired
        usedAt: null, // Not used
        purpose: 'ADMIN_PASSWORD_SETUP'
      },
      include: {
        user: {
          include: {
            role: { select: { name: true } }
          }
        }
      }
    });

    // Find matching token (need to compare hashed)
    let validSetupToken = null;
    for (const setupToken of setupTokens) {
      const isMatch = await bcrypt.compare(token, setupToken.token);
      if (isMatch) {
        validSetupToken = setupToken;
        break;
      }
    }

    if (!validSetupToken) {
      return res.status(400).json({
        error: 'Link thiết lập mật khẩu không hợp lệ hoặc đã hết hạn',
        suggestion: 'Vui lòng liên hệ Super Admin để được gửi link mới'
      });
    }

    const user = validSetupToken.user;

    // Verify user is admin
    const isAdmin = user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN';
    if (!isAdmin) {
      return res.status(403).json({
        error: 'Chức năng này chỉ dành cho tài khoản Admin'
      });
    }

    // Check if user already has password
    if (user.password) {
      return res.status(400).json({
        error: 'Tài khoản này đã có mật khẩu',
        suggestion: 'Sử dụng chức năng "Quên mật khẩu" nếu muốn đổi mật khẩu'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        tokenVersion: { increment: 1 } // Invalidate old sessions
      }
    });

    // Mark token as used
    await prisma.passwordSetupToken.update({
      where: { id: validSetupToken.id },
      data: {
        usedAt: new Date()
      }
    });

    // Revoke all refresh tokens (force re-login)
    await revokeAllUserTokens(user.id);

    // Audit log
    await auditLog({
      userId: user.id,
      action: 'ADMIN_PASSWORD_SETUP_COMPLETED',
      resource: 'user',
      resourceId: String(user.id),
      newValue: {
        role: user.role?.name,
        method: 'password_setup_token',
        previousAuthMethod: 'social_login'
      },
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      message: 'Mật khẩu đã được thiết lập thành công. Bạn có thể đăng nhập vào Admin Dashboard.',
      data: {
        email: user.email,
        role: user.role?.name,
        canAccessDashboard: true
      }
    });

  } catch (error) {
    console.error('Set admin password error:', error);
    res.status(500).json({
      error: 'Lỗi khi thiết lập mật khẩu'
    });
  }
};

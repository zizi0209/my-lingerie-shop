import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { validate, registerSchema, loginSchema } from '../utils/validation';
import { sanitizeUser } from '../utils/sanitize';
import { auditLog } from '../utils/auditLog';
import { AuditActions } from '../utils/constants';
import { AUTH_CONFIG } from '../config/auth';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  getTokenExpiryInfo,
} from '../utils/tokenUtils';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Set refresh token cookie
 */
function setRefreshTokenCookie(res: Response, token: string, maxAge: number) {
  res.cookie(AUTH_CONFIG.COOKIE.NAME, token, {
    ...AUTH_CONFIG.COOKIE.OPTIONS,
    maxAge,
  });
}

/**
 * Clear refresh token cookie
 */
function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(AUTH_CONFIG.COOKIE.NAME, {
    ...AUTH_CONFIG.COOKIE.OPTIONS,
  });
}

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const validated = validate(registerSchema, req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng!' });
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        name: validated.name || null,
        roleId: null,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        tokenVersion: 0,
      },
      include: {
        role: { select: { id: true, name: true } },
      },
    });

    await auditLog({
      userId: user.id,
      action: AuditActions.CREATE_USER,
      resource: 'USER',
      resourceId: String(user.id),
      newValue: sanitizeUser(user),
      severity: 'INFO',
    }, req);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);

    // Get expiry info based on role
    const expiryInfo = getTokenExpiryInfo(user.role?.name ?? null);

    // Set refresh token cookie
    setRefreshTokenCookie(res, refreshToken, expiryInfo.refreshTokenExpiresIn);

    res.status(201).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        expiresIn: expiryInfo.accessTokenExpiresIn,
      },
    });
  } catch (error: unknown) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi khi đăng ký!';
    if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: 'Lỗi khi đăng ký!' });
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const validated = validate(loginSchema, req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        role: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng!' });
    }

    if (user.deletedAt) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại!' });
    }

    if (!user.isActive) {
      await auditLog({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        resource: 'USER',
        resourceId: String(user.id),
        severity: 'WARNING',
      }, req);
      return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa!' });
    }

    // Check lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(403).json({
        error: `Tài khoản bị khóa. Vui lòng thử lại sau ${minutesLeft} phút.`,
        lockedUntil: user.lockedUntil.toISOString(),
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validated.password, user.password);

    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= LOCKOUT_THRESHOLD;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null,
        },
      });

      await auditLog({
        userId: user.id,
        action: AuditActions.LOGIN_FAILED,
        resource: 'USER',
        resourceId: String(user.id),
        severity: shouldLock ? 'CRITICAL' : 'WARNING',
      }, req);

      if (shouldLock) {
        return res.status(403).json({
          error: `Tài khoản đã bị khóa do đăng nhập sai ${LOCKOUT_THRESHOLD} lần. Vui lòng thử lại sau 15 phút.`,
        });
      }

      return res.status(401).json({
        error: `Email hoặc mật khẩu không đúng! (Còn ${LOCKOUT_THRESHOLD - failedAttempts} lần thử)`,
      });
    }

    // Success - reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date(),
        lastLoginAt: new Date(),
      },
    });

    await auditLog({
      userId: user.id,
      action: AuditActions.LOGIN_SUCCESS,
      resource: 'USER',
      resourceId: String(user.id),
      severity: 'INFO',
    }, req);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req);
    const expiryInfo = getTokenExpiryInfo(user.role?.name ?? null);

    // Set refresh token cookie
    setRefreshTokenCookie(res, refreshToken, expiryInfo.refreshTokenExpiresIn);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        expiresIn: expiryInfo.accessTokenExpiresIn,
      },
    });
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Lỗi khi đăng nhập!';
    if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: 'Lỗi khi đăng nhập!' });
  }
};

/**
 * POST /api/auth/refresh
 */
export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies[AUTH_CONFIG.COOKIE.NAME];

    if (!token) {
      return res.status(401).json({ error: 'Refresh token không tồn tại!' });
    }

    const refreshTokenData = await verifyRefreshToken(token);

    if (!refreshTokenData) {
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn!' });
    }

    const { user } = refreshTokenData;

    if (!user.isActive || user.deletedAt) {
      clearRefreshTokenCookie(res);
      return res.status(403).json({ error: 'Tài khoản không hoạt động!' });
    }

    // Token rotation: revoke old token, create new one
    await revokeRefreshToken(token);

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user, req);
    const expiryInfo = getTokenExpiryInfo(user.role?.name ?? null);

    // Set new refresh token cookie
    setRefreshTokenCookie(res, newRefreshToken, expiryInfo.refreshTokenExpiresIn);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: expiryInfo.accessTokenExpiresIn,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    clearRefreshTokenCookie(res);
    res.status(500).json({ error: 'Lỗi khi làm mới token!' });
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies[AUTH_CONFIG.COOKIE.NAME];

    if (token) {
      await revokeRefreshToken(token).catch(() => {});
    }

    clearRefreshTokenCookie(res);

    res.json({
      success: true,
      message: 'Đăng xuất thành công!',
    });
  } catch (error) {
    console.error('Logout error:', error);
    clearRefreshTokenCookie(res);
    res.json({
      success: true,
      message: 'Đăng xuất thành công!',
    });
  }
};

/**
 * POST /api/auth/logout-all
 * Đăng xuất tất cả thiết bị
 */
export const logoutAll = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Chưa xác thực!' });
    }

    await revokeAllUserTokens(userId);
    clearRefreshTokenCookie(res);

    await auditLog({
      userId,
      action: 'LOGOUT_ALL',
      resource: 'USER',
      resourceId: String(userId),
      severity: 'WARNING',
    }, req);

    res.json({
      success: true,
      message: 'Đã đăng xuất khỏi tất cả thiết bị!',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Lỗi khi đăng xuất!' });
  }
};

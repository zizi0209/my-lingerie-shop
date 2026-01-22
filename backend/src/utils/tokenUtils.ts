import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AUTH_CONFIG, isAdminRole } from '../config/auth';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET không được cấu hình trong file .env!');
}

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET;

export interface TokenPayload {
  userId: number;
  email: string;
  roleId: number | null;
  roleName: string | null;
  tokenVersion: number;
  type: 'access' | 'refresh';
}

export interface UserForToken {
  id: number;
  email: string;
  roleId: number | null;
  role?: { name: string } | null;
  tokenVersion: number;
}

/**
 * Generate access token với thời hạn phụ thuộc vào role
 */
export function generateAccessToken(user: UserForToken): string {
  const roleName = user.role?.name ?? null;
  const isAdmin = isAdminRole(roleName);
  const config = isAdmin ? AUTH_CONFIG.ACCESS_TOKEN.ADMIN : AUTH_CONFIG.ACCESS_TOKEN.USER;

  const payload: Omit<TokenPayload, 'type'> = {
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName,
    tokenVersion: user.tokenVersion,
  };

  const signOptions: SignOptions = {
    expiresIn: config.expiresInSeconds,
  };

  return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, signOptions);
}

/**
 * Generate refresh token và lưu vào database
 */
export async function generateRefreshToken(
  user: UserForToken,
  req?: { ip?: string; headers?: { 'user-agent'?: string } }
): Promise<string> {
  const roleName = user.role?.name ?? null;
  const isAdmin = isAdminRole(roleName);
  const config = isAdmin ? AUTH_CONFIG.REFRESH_TOKEN.ADMIN : AUTH_CONFIG.REFRESH_TOKEN.USER;

  // Generate random token
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + config.expiresInMs);

  // Lưu vào database
  await prisma.refreshToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
      userAgent: req?.headers?.['user-agent'] ?? null,
      ipAddress: req?.ip ?? null,
    },
  });

  return token;
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token từ database
 */
export async function verifyRefreshToken(token: string) {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          role: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!refreshToken) return null;
  if (refreshToken.revokedAt) return null;
  if (refreshToken.expiresAt < new Date()) return null;

  return refreshToken;
}

/**
 * Revoke (thu hồi) một refresh token
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.update({
    where: { token },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke tất cả refresh tokens của user
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Cleanup expired tokens (có thể chạy định kỳ)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { not: null } },
      ],
    },
  });
  return result.count;
}

/**
 * Get token expiry info for response
 */
export function getTokenExpiryInfo(roleName: string | null) {
  const isAdmin = isAdminRole(roleName);
  return {
    accessTokenExpiresIn: isAdmin
      ? AUTH_CONFIG.ACCESS_TOKEN.ADMIN.expiresInMs
      : AUTH_CONFIG.ACCESS_TOKEN.USER.expiresInMs,
    refreshTokenExpiresIn: isAdmin
      ? AUTH_CONFIG.REFRESH_TOKEN.ADMIN.expiresInMs
      : AUTH_CONFIG.REFRESH_TOKEN.USER.expiresInMs,
  };
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokens(
  user: { userId: number; email: string; roleId: number | null; roleName?: string | null; tokenVersion: number },
  req?: { ip?: string; headers?: { 'user-agent'?: string } }
) {
  const userForToken: UserForToken = {
    id: user.userId,
    email: user.email,
    roleId: user.roleId,
    role: user.roleName ? { name: user.roleName } : null,
    tokenVersion: user.tokenVersion,
  };

  const accessToken = generateAccessToken(userForToken);
  const refreshToken = await generateRefreshToken(userForToken, req);
  
  const { accessTokenExpiresIn } = getTokenExpiryInfo(user.roleName ?? null);

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenExpiresIn,
  };
}

/**
 * Set refresh token as httpOnly cookie
 */
export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(AUTH_CONFIG.COOKIE.NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_CONFIG.REFRESH_TOKEN.USER.expiresInMs, // Use max expiry
    path: '/',
  });
}

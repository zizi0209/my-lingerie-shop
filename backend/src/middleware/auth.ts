import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET không được cấu hình trong file .env!');
}

const JWT_SECRET = process.env.JWT_SECRET;

import { AuthUser } from './requireAuth';

interface JwtPayload {
  userId: number;
  email: string;
  roleId: number | null;
  roleName?: string;
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token không được cung cấp!' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn!' });
      }

      const payload = decoded as JwtPayload;
      req.user = {
        id: payload.userId,
        email: payload.email,
        roleId: payload.roleId,
        roleName: payload.roleName ?? null
      };
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Lỗi xác thực!' });
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const roleName = req.user?.roleName?.toLowerCase();
  if (roleName !== 'admin') {
    return res.status(403).json({ error: 'Chỉ admin mới có quyền truy cập!' });
  }
  next();
};

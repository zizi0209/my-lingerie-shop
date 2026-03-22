import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './requireAuth';

const resolveAdminEmail = (): string | null => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !adminEmail.trim()) {
    console.error('[VTON] ADMIN_EMAIL chưa được cấu hình. Chặn toàn bộ truy cập VTON.');
    return null;
  }
  return adminEmail.trim().toLowerCase();
};

function checkVtonAdmin(req: Request, res: Response, next: NextFunction) {
  const expectedEmail = resolveAdminEmail();
  if (!expectedEmail) {
    return res.status(403).json({
      error: 'Tính năng chỉ dành cho super admin',
    });
  }

  const userEmail = req.user?.email?.toLowerCase();
  if (!userEmail || userEmail !== expectedEmail) {
    return res.status(403).json({
      error: 'Tính năng chỉ dành cho super admin',
    });
  }

  return next();
}

export const requireVtonAdmin = [requireAuth, checkVtonAdmin];

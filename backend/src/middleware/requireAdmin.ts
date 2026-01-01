import { Request, Response, NextFunction } from 'express';
import { requireAuth } from './requireAuth';

/**
 * Admin authorization middleware
 * Requires user to have ADMIN or SUPER_ADMIN role
 * Must be used after requireAuth
 */
function checkAdmin(req: Request, res: Response, next: NextFunction) {
  const roleName = req.user?.roleName?.toUpperCase();
  
  if (roleName !== 'ADMIN' && roleName !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'Chỉ admin mới có quyền truy cập!'
    });
  }
  
  next();
}

/**
 * Combined middleware: authentication + admin authorization
 * Usage: router.get('/admin/users', requireAdmin, handler)
 */
export const requireAdmin = [requireAuth, checkAdmin];

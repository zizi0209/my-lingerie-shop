import express from 'express';
import { prisma } from '../../lib/prisma';
import { auditLog } from '../../utils/auditLog';
import { z } from 'zod';

const router = express.Router();

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const { 
      page = '1', 
      limit = '20',
      role,
      isActive,
      search,
      hasOrders
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {
      deletedAt: null
    };

    if (role) {
      where.role = {
        name: (role as string).toUpperCase()
      };
    }

    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filter users who have at least one order (customers)
    if (hasOrders === 'true') {
      where.orders = {
        some: {}
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              orders: true
            }
          },
          orders: {
            select: {
              totalAmount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    // Calculate total spent for each user
    const usersWithStats = users.map(user => {
      const totalSpent = user.orders.reduce((sum, order) => sum + order.totalAmount, 0);
      // Remove orders array from response to keep it clean
      const { orders, ...userWithoutOrders } = user;
      return {
        ...userWithoutOrders,
        totalSpent
      };
    });

    res.json({
      success: true,
      data: usersWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách users' 
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            orders: true
          }
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Calculate total spent
    const allOrders = await prisma.order.findMany({
      where: { userId: Number(id) },
      select: { totalAmount: true }
    });
    const totalSpent = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({
      success: true,
      data: {
        ...user,
        totalSpent
      }
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thông tin user' 
    });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role
 */
router.patch('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId, roleName } = req.body;

    if (!roleId && !roleName) {
      return res.status(400).json({
        error: 'Cần cung cấp roleId hoặc roleName'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      },
      include: {
        role: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Find target role
    let targetRole;
    if (roleId) {
      targetRole = await prisma.role.findUnique({
        where: { id: Number(roleId) }
      });
    } else {
      targetRole = await prisma.role.findFirst({
        where: { name: roleName.toUpperCase() }
      });
    }

    if (!targetRole) {
      return res.status(404).json({
        error: 'Role không tồn tại'
      });
    }

    // Prevent changing your own role
    if (currentUser.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể thay đổi role của chính mình'
      });
    }

    // Update role
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { roleId: targetRole.id },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'UPDATE_USER_ROLE',
      resource: 'user',
      resourceId: id,
      oldValue: { role: currentUser.role?.name },
      newValue: { role: targetRole.name },
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Cập nhật role thành công'
    });
  } catch (error) {
    console.error('Admin update user role error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi cập nhật role' 
    });
  }
});

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate user account
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'isActive phải là boolean'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      }
    });

    if (!currentUser) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Prevent deactivating your own account
    if (currentUser.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể thay đổi trạng thái tài khoản của chính mình'
      });
    }

    // Update status
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { isActive },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      resource: 'user',
      resourceId: id,
      oldValue: { isActive: currentUser.isActive },
      newValue: { isActive },
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      data: updatedUser,
      message: `User đã được ${isActive ? 'kích hoạt' : 'vô hiệu hóa'}`
    });
  } catch (error) {
    console.error('Admin update user status error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi cập nhật trạng thái user' 
    });
  }
});

/**
 * PATCH /api/admin/users/:id/unlock
 * Unlock locked user account
 */
router.patch('/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    if (!user.lockedUntil) {
      return res.status(400).json({
        error: 'Tài khoản không bị khóa'
      });
    }

    // Unlock account
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0
      },
      select: {
        id: true,
        email: true,
        name: true,
        lockedUntil: true,
        failedLoginAttempts: true
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'UNLOCK_USER_ACCOUNT',
      resource: 'user',
      resourceId: id,
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Tài khoản đã được mở khóa'
    });
  } catch (error) {
    console.error('Admin unlock user error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi mở khóa tài khoản' 
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Soft delete user (admin only - more restricted than regular delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User không tồn tại' 
      });
    }

    // Prevent deleting your own account
    if (user.id === req.user?.id) {
      return res.status(400).json({
        error: 'Không thể xóa tài khoản của chính mình'
      });
    }

    // Soft delete
    await prisma.user.update({
      where: { id: Number(id) },
      data: { 
        deletedAt: new Date(),
        isActive: false
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: id,
      severity: 'CRITICAL',
      oldValue: { email: user.email, name: user.name }
    }, req);

    res.json({
      success: true,
      message: 'User đã được xóa'
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi xóa user' 
    });
  }
});

/**
 * GET /api/admin/users/:id/audit-logs
 * Get audit logs for specific user
 */
router.get('/:id/audit-logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      page = '1', 
      limit = '20' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId: Number(id) },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      }),
      prisma.auditLog.count({
        where: { userId: Number(id) }
      })
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Admin get user audit logs error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy audit logs' 
    });
  }
});

export default router;

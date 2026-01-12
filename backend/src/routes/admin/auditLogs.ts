import express from 'express';
import { getAuditLogs } from '../../utils/auditLog';
import { prisma } from '../../lib/prisma';

const router = express.Router();

/**
 * GET /api/admin/audit-logs/stats/summary
 * Get audit log statistics
 * NOTE: Must be before /:id route
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const [
      totalLogs,
      bySeverity,
      byAction,
      criticalRecent
    ] = await Promise.all([
      // Total logs in period
      prisma.auditLog.count({
        where: { createdAt: { gte: startDate } }
      }),

      // Logs grouped by severity
      prisma.auditLog.groupBy({
        by: ['severity'],
        _count: { severity: true },
        where: { createdAt: { gte: startDate } }
      }),

      // Top actions
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: { action: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      }),

      // Recent critical logs
      prisma.auditLog.findMany({
        where: {
          severity: 'CRITICAL',
          createdAt: { gte: startDate }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        period: {
          days: daysNum,
          startDate,
          endDate: new Date()
        },
        summary: {
          total: totalLogs,
          bySeverity: bySeverity.map(item => ({
            severity: item.severity,
            count: item._count.severity
          })),
          topActions: byAction.map(item => ({
            action: item.action,
            count: item._count.action
          }))
        },
        criticalRecent
      }
    });
  } catch (error) {
    console.error('Audit logs stats error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy thống kê audit logs' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/actions/list
 * Get list of all available actions (for filtering)
 * Chỉ lấy các action quan trọng từ Admin
 */
router.get('/actions/list', async (req, res) => {
  try {
    // Danh sách các action quan trọng cần hiển thị
    const importantActions = [
      // User Management
      'UPDATE_USER_ROLE', 'ACTIVATE_USER', 'DEACTIVATE_USER', 
      'UNLOCK_USER_ACCOUNT', 'DELETE_USER', 'LOCK_USER', 'CHANGE_ROLE',
      // Product Management  
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'UPDATE_PRODUCT_PRICE', 'UPDATE_PRODUCT_STOCK',
      // Order Management
      'UPDATE_ORDER_STATUS', 'CANCEL_ORDER', 'REFUND_ORDER',
      // Category Management
      'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
      // System Config
      'UPDATE_SYSTEM_CONFIG', 'DELETE_SYSTEM_CONFIG', 'UPDATE_SETTINGS',
      // Security
      'LOGIN_FAILED', 'LOGIN_SUCCESS', 'DASHBOARD_AUTH_FAILED', 'DASHBOARD_AUTH_SUCCESS',
      'PASSWORD_CHANGE', 'UPDATE_PERMISSIONS', 'LOGOUT_ALL'
    ];

    const actions = await prisma.auditLog.findMany({
      where: {
        action: { in: importantActions }
      },
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' }
    });

    res.json({
      success: true,
      data: actions.map(a => a.action)
    });
  } catch (error) {
    console.error('Get audit actions error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách actions' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/resources/list
 * Get list of all available resources (for filtering)
 */
router.get('/resources/list', async (req, res) => {
  try {
    const resources = await prisma.auditLog.findMany({
      select: { resource: true },
      distinct: ['resource'],
      orderBy: { resource: 'asc' }
    });

    res.json({
      success: true,
      data: resources.map(r => r.resource)
    });
  } catch (error) {
    console.error('Get audit resources error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách resources' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/admins/list
 * Get list of admin users who have audit logs (for filtering)
 */
router.get('/admins/list', async (req, res) => {
  try {
    const admins = await prisma.auditLog.findMany({
      where: {
        user: {
          role: { NOT: { name: 'USER' } }
        }
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: { select: { name: true } }
          }
        }
      },
      distinct: ['userId']
    });

    const uniqueAdmins = admins.map(a => a.user).filter(Boolean);

    res.json({
      success: true,
      data: uniqueAdmins
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy danh sách admin' 
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get all audit logs with filtering and pagination
 * Chỉ lấy logs từ Admin/Mod actions
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      userId,
      severity,
      startDate,
      endDate,
      resource
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    // Danh sách các action quan trọng
    const importantActions = [
      'UPDATE_USER_ROLE', 'ACTIVATE_USER', 'DEACTIVATE_USER', 
      'UNLOCK_USER_ACCOUNT', 'DELETE_USER', 'LOCK_USER', 'CHANGE_ROLE',
      'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
      'UPDATE_PRODUCT_PRICE', 'UPDATE_PRODUCT_STOCK',
      'UPDATE_ORDER_STATUS', 'CANCEL_ORDER', 'REFUND_ORDER',
      'CREATE_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY',
      'UPDATE_SYSTEM_CONFIG', 'DELETE_SYSTEM_CONFIG', 'UPDATE_SETTINGS',
      'LOGIN_FAILED', 'LOGIN_SUCCESS', 'DASHBOARD_AUTH_FAILED', 'DASHBOARD_AUTH_SUCCESS',
      'PASSWORD_CHANGE', 'UPDATE_PERMISSIONS', 'LOGOUT_ALL', 'UPDATE', 'CREATE', 'DELETE'
    ];

    // Build where clause
    const where: Record<string, unknown> = {
      // Chỉ lấy Admin actions hoặc CRITICAL/WARNING
      OR: [
        { action: { in: importantActions } },
        { severity: { in: ['WARNING', 'CRITICAL'] } }
      ],
      // Chỉ lấy từ Admin/Mod
      user: {
        role: { NOT: { name: 'USER' } }
      }
    };

    // Apply filters
    if (action) where.action = action as string;
    if (userId) where.userId = parseInt(userId as string);
    if (severity) where.severity = severity as string;
    if (resource) where.resource = resource as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate as string);
    }

    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.auditLog.count({ where })
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
    console.error('Get audit logs error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy audit logs' 
    });
  }
});

/**
 * GET /api/admin/audit-logs/:id
 * Get single audit log by ID
 * NOTE: Must be LAST because it's a dynamic route
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({
        error: 'Audit log không tồn tại'
      });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Get audit log by ID error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy audit log' 
    });
  }
});

export default router;

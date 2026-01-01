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
 */
router.get('/actions/list', async (req, res) => {
  try {
    const actions = await prisma.auditLog.findMany({
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
 * GET /api/admin/audit-logs
 * Get all audit logs with filtering and pagination
 * NOTE: Must be after specific routes
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
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page

    const options: any = {
      page: pageNum,
      limit: limitNum
    };

    if (action) options.action = action as string;
    if (userId) options.userId = parseInt(userId as string);
    if (severity) options.severity = severity as string;
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);

    // Add resource filter if provided
    const where: any = {};
    if (options.action) where.action = options.action;
    if (options.userId) where.userId = options.userId;
    if (options.severity) where.severity = options.severity;
    if (resource) where.resource = resource as string;
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
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
              name: true
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

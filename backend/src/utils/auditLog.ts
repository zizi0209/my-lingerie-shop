import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { AuditSeverityType } from './constants';

const prisma = new PrismaClient();

export interface AuditLogData {
  userId: number;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: any;
  newValue?: any;
  severity?: AuditSeverityType;
}

/**
 * Create audit log entry
 * @param data - Audit log data
 * @param req - Express request object (for IP and user agent)
 */
export async function auditLog(
  data: AuditLogData,
  req?: Request
): Promise<void> {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
        newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
        severity: data.severity || 'INFO',
        ipAddress: req?.ip || req?.socket.remoteAddress,
        userAgent: req?.get('user-agent'),
      }
    });

    // Alert on critical events
    if (data.severity === 'CRITICAL') {
      await sendCriticalAlert(log);
    }
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Send alert for critical security events
 */
async function sendCriticalAlert(log: any): Promise<void> {
  // TODO: Implement your alerting system (Slack, email, PagerDuty, etc.)
  console.error('🚨 CRITICAL SECURITY EVENT:', {
    action: log.action,
    userId: log.userId,
    resource: `${log.resource}:${log.resourceId}`,
    timestamp: log.createdAt,
    ipAddress: log.ipAddress
  });
}

/**
 * Get audit logs with pagination
 */
export async function getAuditLogs(options: {
  page?: number;
  limit?: number;
  action?: string;
  userId?: number;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const {
    page = 1,
    limit = 50,
    action,
    userId,
    severity,
    startDate,
    endDate
  } = options;

  const where: any = {};
  if (action) where.action = action;
  if (userId) where.userId = userId;
  if (severity) where.severity = severity;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

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
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

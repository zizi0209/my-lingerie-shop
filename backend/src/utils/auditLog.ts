import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { AuditSeverityType } from './constants';

const prisma = new PrismaClient();

// Type-safe audit value - can be primitive, object, or array
export type AuditValue = string | number | boolean | null | undefined | AuditValueObject | AuditValueArray;
export interface AuditValueObject {
  [key: string]: AuditValue;
}
export interface AuditValueArray extends Array<AuditValue> {}

export interface AuditLogData {
  userId: number;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: AuditValue;
  newValue?: AuditValue;
  severity?: AuditSeverityType;
}

/**
 * Create audit log entry
 * @param data - Audit log data
 * @param req - Express request object (for IP and user agent)
 * @param options - Additional options (throwOnError for CRITICAL operations)
 */
export async function auditLog(
  data: AuditLogData,
  req?: Request,
  options?: { throwOnError?: boolean }
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

    // 🔒 CRITICAL: For CRITICAL operations, throw error to prevent operation without audit
    if (options?.throwOnError || data.severity === 'CRITICAL') {
      throw new Error('Audit log creation failed for CRITICAL operation. Operation aborted for security.');
    }

    // For non-critical operations, log but don't throw
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

  interface WhereClause {
    action?: string;
    userId?: number;
    severity?: string;
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
  }

  const where: WhereClause = {};
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

import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { AuditSeverityType } from './constants';

const prisma = new PrismaClient();

// Alerting configuration from environment
const ALERT_CONFIG = {
  SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL,
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
  ALERT_EMAIL: process.env.ALERT_EMAIL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || 'alerts@lingerie-shop.com',
};

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
  const alertPayload = {
    action: log.action,
    userId: log.userId,
    resource: `${log.resource}:${log.resourceId}`,
    timestamp: log.createdAt,
    ipAddress: log.ipAddress,
    details: log.newValue,
  };

  // Always log to console
  console.error('🚨 CRITICAL SECURITY EVENT:', alertPayload);

  // Send to configured alerting channels
  const alertPromises: Promise<void>[] = [];

  if (ALERT_CONFIG.SLACK_WEBHOOK_URL) {
    alertPromises.push(sendSlackAlert(alertPayload));
  }

  if (ALERT_CONFIG.DISCORD_WEBHOOK_URL) {
    alertPromises.push(sendDiscordAlert(alertPayload));
  }

  if (ALERT_CONFIG.ALERT_EMAIL && ALERT_CONFIG.SMTP_HOST) {
    alertPromises.push(sendEmailAlert(alertPayload));
  }

  // Execute all alerts in parallel, don't throw on individual failures
  await Promise.allSettled(alertPromises);
}

/**
 * Send alert to Slack webhook
 */
async function sendSlackAlert(payload: Record<string, any>): Promise<void> {
  if (!ALERT_CONFIG.SLACK_WEBHOOK_URL) return;

  try {
    const response = await fetch(ALERT_CONFIG.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '🚨 *CRITICAL SECURITY ALERT*',
        attachments: [
          {
            color: 'danger',
            fields: [
              { title: 'Action', value: payload.action, short: true },
              { title: 'User ID', value: String(payload.userId), short: true },
              { title: 'Resource', value: payload.resource, short: true },
              { title: 'IP Address', value: payload.ipAddress || 'N/A', short: true },
              { title: 'Timestamp', value: new Date(payload.timestamp).toISOString(), short: false },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Slack alert failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

/**
 * Send alert to Discord webhook
 */
async function sendDiscordAlert(payload: Record<string, any>): Promise<void> {
  if (!ALERT_CONFIG.DISCORD_WEBHOOK_URL) return;

  try {
    const response = await fetch(ALERT_CONFIG.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🚨 **CRITICAL SECURITY ALERT**',
        embeds: [
          {
            color: 0xff0000, // Red
            fields: [
              { name: 'Action', value: payload.action, inline: true },
              { name: 'User ID', value: String(payload.userId), inline: true },
              { name: 'Resource', value: payload.resource, inline: true },
              { name: 'IP Address', value: payload.ipAddress || 'N/A', inline: true },
              { name: 'Timestamp', value: new Date(payload.timestamp).toISOString(), inline: false },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Discord alert failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Failed to send Discord alert:', error);
  }
}

/**
 * Send alert via email (basic implementation using fetch to SMTP API)
 * For production, consider using nodemailer or a transactional email service
 */
async function sendEmailAlert(payload: Record<string, any>): Promise<void> {
  if (!ALERT_CONFIG.ALERT_EMAIL || !ALERT_CONFIG.SMTP_HOST) return;

  // Log email alert details (actual email sending requires nodemailer or similar)
  console.warn('📧 Email alert would be sent to:', ALERT_CONFIG.ALERT_EMAIL);
  console.warn('Email content:', {
    subject: `🚨 CRITICAL SECURITY ALERT: ${payload.action}`,
    body: `
CRITICAL SECURITY EVENT DETECTED

Action: ${payload.action}
User ID: ${payload.userId}
Resource: ${payload.resource}
IP Address: ${payload.ipAddress || 'N/A'}
Timestamp: ${new Date(payload.timestamp).toISOString()}

Please investigate immediately.
    `.trim(),
  });

  // NOTE: To enable actual email sending, install nodemailer:
  // npm install nodemailer @types/nodemailer
  // Then uncomment and configure the following:
  /*
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: ALERT_CONFIG.SMTP_HOST,
    port: Number(ALERT_CONFIG.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: ALERT_CONFIG.SMTP_USER,
      pass: ALERT_CONFIG.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: ALERT_CONFIG.SMTP_FROM,
    to: ALERT_CONFIG.ALERT_EMAIL,
    subject: `🚨 CRITICAL SECURITY ALERT: ${payload.action}`,
    text: `...email body...`,
  });
  */
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

import express from 'express';
import { prisma } from '../../lib/prisma';
import { auditLog } from '../../utils/auditLog';

const router = express.Router();

/**
 * GET /api/admin/system-config
 * Get all system configurations
 */
router.get('/', async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });

    // Convert to key-value object for easier frontend usage
    const configObject: Record<string, string> = {};
    configs.forEach(config => {
      configObject[config.key] = config.value;
    });

    res.json({
      success: true,
      data: configObject,
      raw: configs
    });
  } catch (error) {
    console.error('Get system config error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy cấu hình hệ thống' 
    });
  }
});

/**
 * GET /api/admin/system-config/:key
 * Get specific config by key
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });

    if (!config) {
      return res.status(404).json({ 
        error: 'Không tìm thấy cấu hình' 
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Get config by key error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy cấu hình' 
    });
  }
});

/**
 * PUT /api/admin/system-config
 * Update multiple configs at once
 */
router.put('/', async (req, res) => {
  try {
    const configs = req.body;

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({
        error: 'Dữ liệu không hợp lệ'
      });
    }

    const updates = [];
    const oldValues: Record<string, string> = {};

    // Get old values first
    const existingConfigs = await prisma.systemConfig.findMany({
      where: {
        key: { in: Object.keys(configs) }
      }
    });
    existingConfigs.forEach(c => {
      oldValues[c.key] = c.value;
    });

    // Upsert each config
    for (const [key, value] of Object.entries(configs)) {
      if (typeof value === 'string') {
        const update = prisma.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
        updates.push(update);
      }
    }

    await prisma.$transaction(updates);

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'UPDATE_SYSTEM_CONFIG',
      resource: 'system_config',
      resourceId: 'bulk',
      oldValue: oldValues,
      newValue: configs,
      severity: 'WARNING'
    }, req);

    // Get updated configs
    const updatedConfigs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });

    const configObject: Record<string, string> = {};
    updatedConfigs.forEach(config => {
      configObject[config.key] = config.value;
    });

    res.json({
      success: true,
      data: configObject,
      message: 'Cập nhật cấu hình thành công'
    });
  } catch (error) {
    console.error('Update system config error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi cập nhật cấu hình' 
    });
  }
});

/**
 * PUT /api/admin/system-config/:key
 * Update single config
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (typeof value !== 'string') {
      return res.status(400).json({
        error: 'Giá trị phải là chuỗi'
      });
    }

    const existing = await prisma.systemConfig.findUnique({
      where: { key }
    });

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { 
        value,
        description: description !== undefined ? description : undefined
      },
      create: { 
        key, 
        value,
        description: description || null
      }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'UPDATE_SYSTEM_CONFIG',
      resource: 'system_config',
      resourceId: key,
      oldValue: existing ? { value: existing.value } : null,
      newValue: { value },
      severity: 'WARNING'
    }, req);

    res.json({
      success: true,
      data: config,
      message: 'Cập nhật cấu hình thành công'
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi cập nhật cấu hình' 
    });
  }
});

/**
 * DELETE /api/admin/system-config/:key
 * Delete config
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;

    const existing = await prisma.systemConfig.findUnique({
      where: { key }
    });

    if (!existing) {
      return res.status(404).json({ 
        error: 'Không tìm thấy cấu hình' 
      });
    }

    await prisma.systemConfig.delete({
      where: { key }
    });

    // Audit log
    await auditLog({
      userId: req.user!.id,
      action: 'DELETE_SYSTEM_CONFIG',
      resource: 'system_config',
      resourceId: key,
      oldValue: { key, value: existing.value },
      severity: 'CRITICAL'
    }, req);

    res.json({
      success: true,
      message: 'Xóa cấu hình thành công'
    });
  } catch (error) {
    console.error('Delete config error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi xóa cấu hình' 
    });
  }
});

export default router;

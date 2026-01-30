import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/seed/system-config
 * Seeds default SystemConfig data
 */
router.post('/system-config', async (req, res) => {
  try {
    const defaultConfigs = [
      { key: 'store_name', value: 'Lingerie Shop', description: 'Tên cửa hàng' },
      { key: 'primary_color', value: '#f43f5e', description: 'Màu chủ đạo (hex)' },
      { key: 'store_logo', value: '', description: 'URL logo cửa hàng' },
      { key: 'store_description', value: 'Premium lingerie collection for modern women', description: 'Mô tả cửa hàng' },
      { key: 'store_email', value: 'contact@lingerie.shop', description: 'Email liên hệ' },
      { key: 'store_phone', value: '+84 123 456 789', description: 'Số điện thoại' },
      { key: 'store_address', value: 'Hồ Chí Minh, Việt Nam', description: 'Địa chỉ cửa hàng' },
      { key: 'social_facebook', value: '', description: 'Facebook URL' },
      { key: 'social_instagram', value: '', description: 'Instagram URL' },
      { key: 'social_tiktok', value: '', description: 'TikTok URL' },
      { key: 'social_zalo', value: '', description: 'Zalo URL' },
    ];

    const results = [];
    for (const config of defaultConfigs) {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: config.key },
      });

      if (existing) {
        results.push({ key: config.key, status: 'exists' });
      } else {
        await prisma.systemConfig.create({ data: config });
        results.push({ key: config.key, status: 'created' });
      }
    }

    res.json({
      success: true,
      message: 'SystemConfig seeded successfully',
      results,
    });
  } catch (error: any) {
    console.error('Seed system config error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to seed system config',
    });
  }
});

/**
 * POST /api/seed/admin
 * Seeds default admin user
 */
router.post('/admin', async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mylingerie.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecure123!@#';

    // Check if admin exists
    const existingAdmin = await prisma.user.findFirst({
      where: { email: adminEmail },
    });

    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin user already exists',
        email: adminEmail,
      });
    }

    // Get or create Admin role
    let adminRole = await prisma.role.findFirst({
      where: { name: 'Admin' },
    });

    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator with full access',
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Administrator',
        role: {
          connect: { id: adminRole.id }
        }
      },
    });

    res.json({
      success: true,
      message: 'Admin user created successfully',
      email: admin.email,
      roleId: admin.roleId,
    });
  } catch (error: any) {
    console.error('Seed admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to seed admin user',
    });
  }
});

/**
 * POST /api/seed/all
 * Seeds all default data
 */
router.post('/all', async (req, res) => {
  try {
    const results: any = {};

    // Seed SystemConfig
    const configResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/system-config`, {
      method: 'POST',
    });
    results.systemConfig = await configResponse.json();

    // Seed Admin
    const adminResponse = await fetch(`${req.protocol}://${req.get('host')}/api/seed/admin`, {
      method: 'POST',
    });
    results.admin = await adminResponse.json();

    res.json({
      success: true,
      message: 'All seed operations completed',
      results,
    });
  } catch (error: any) {
    console.error('Seed all error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to seed all data',
    });
  }
});

export default router;

import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

/**
 * GET /api/public/config
 * Public endpoint to fetch basic store config (logo, brand color, name)
 * No authentication required - for login page & frontend theme
 */
router.get('/', async (req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'store_name',
            'store_logo',
            'primary_color',
            'store_description'
          ]
        }
      }
    });

    const configObject: Record<string, string> = {};
    configs.forEach(config => {
      configObject[config.key] = config.value;
    });

    // Set defaults if not configured
    if (!configObject.store_name) configObject.store_name = 'Admin Panel';
    if (!configObject.primary_color) configObject.primary_color = '#f43f5e';

    res.json({
      success: true,
      data: configObject
    });
  } catch (error) {
    console.error('Get public config error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi lấy cấu hình' 
    });
  }
});

export default router;

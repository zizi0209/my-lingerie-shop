import express from 'express';
import { prisma } from '../lib/prisma';

const router = express.Router();

/**
 * GET /api/public/config
 * Public endpoint to fetch basic store config (logo, brand color, name)
 * No authentication required - for login page & frontend theme
 */
router.get('/', async (_req, res) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'store_name',
            'store_logo',
            'primary_color',
            'store_description',
            'store_email',
            'store_phone',
            'store_address',
            'social_facebook',
            'social_instagram',
            'social_tiktok',
            'social_zalo',
          'bank_name',
          'bank_account_number',
          'bank_account_holder',
          'bank_vietqr_code',
            'enable_remote_tryon',
            'enable_onnx_tryon',
            'onnx_tryon_manifest_url',
            'onnx_wasm_base_url'
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
    if (!configObject.enable_remote_tryon) configObject.enable_remote_tryon = 'true';
    if (!configObject.enable_onnx_tryon) configObject.enable_onnx_tryon = 'false';
    if (!configObject.onnx_tryon_manifest_url)
      configObject.onnx_tryon_manifest_url = '/static/onnx/tryon/manifest.json';
    if (!configObject.onnx_wasm_base_url) configObject.onnx_wasm_base_url = '/onnxruntime/';

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

/**
 * SIZE SYSTEM API ROUTES
 *
 * RESTful API endpoints for multi-regional size management
 *
 * Endpoints:
 * - GET    /api/products/:productId/sizes - Get product sizes for region
 * - POST   /api/size-finder/recommend     - Get size recommendation
 * - GET    /api/size-standards/:category/conversions - Get conversion matrix
 * - POST   /api/sizes/convert             - Convert size between regions
 * - GET    /api/regions                   - Get available regions
 * - PUT    /api/users/me/region           - Update user region preference
 */

import { Router, Request, Response } from 'express';
import { sizeResolutionService } from '../services/size-resolution.service';
import { regionDetectionService } from '../services/region-detection.service';
import { z } from 'zod';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const BraMeasurementsSchema = z.object({
  bandSize: z.object({
    value: z.number().min(28).max(52),
    unit: z.enum(['in', 'cm']),
  }),
  cupSize: z.object({
    value: z.string(),
    letterCode: z.string(),
    volume: z.number().min(0).max(20),
  }),
  underBust: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(['in', 'cm']),
  }),
  bust: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(['in', 'cm']),
  }),
});

const PantyMeasurementsSchema = z.object({
  size: z.object({
    value: z.string(),
    numeric: z.number().optional(),
  }),
  waist: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(['in', 'cm']),
  }),
  hip: z.object({
    min: z.number(),
    max: z.number(),
    unit: z.enum(['in', 'cm']),
  }),
});

const SizeRecommendationRequestSchema = z.object({
  productId: z.string(),
  category: z.enum(['BRA', 'PANTY', 'SET', 'SLEEPWEAR', 'SHAPEWEAR']),
  measurements: z.union([BraMeasurementsSchema, PantyMeasurementsSchema]),
  region: z.string().optional(),
});

const SizeConversionRequestSchema = z.object({
  fromRegion: z.string(),
  toRegion: z.string(),
  size: z.string(),
  category: z.string(),
});

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Detect and attach region to request
 */
async function detectRegionMiddleware(
  req: Request,
  res: Response,
  next: Function
) {
  try {
    const userId = (req as any).user?.id;
    const region = await regionDetectionService.detectRegion(req, userId);
    (req as any).detectedRegion = region;
    next();
  } catch (error) {
    console.error('Region detection error:', error);
    (req as any).detectedRegion = {
      regionCode: 'US',
      regionName: 'United States',
      currency: 'USD',
      confidence: 'low',
      source: 'default',
      lengthUnit: 'in',
      weightUnit: 'lb',
    };
    next();
  }
}

// Apply to all routes
router.use(detectRegionMiddleware);

// ============================================
// GET PRODUCT SIZES
// ============================================

/**
 * GET /api/products/:productId/sizes
 *
 * Query params:
 * - region: Region code (optional, auto-detected if not provided)
 * - includeConversions: Include size conversions (default: false)
 *
 * Response:
 * {
 *   productId: string;
 *   region: string;
 *   sizes: Array<{
 *     id: string;
 *     displaySize: string;
 *     universalCode: string;
 *     stock: number;
 *     isAvailable: boolean;
 *     measurements: object;
 *     conversions?: Array<{
 *       region: string;
 *       regionName: string;
 *       size: string;
 *       confidence: number;
 *     }>;
 *   }>;
 * }
 */
router.get('/products/:productId/sizes', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const regionCode =
      (req.query.region as string) || (req as any).detectedRegion.regionCode;
    const includeConversions = req.query.includeConversions === 'true';

    const sizes = await sizeResolutionService.getProductSizes({
      productId,
      regionCode,
      includeConversions,
    });

    res.json({
      success: true,
      data: sizes,
      meta: {
        detectedRegion: (req as any).detectedRegion,
      },
    });
  } catch (error) {
    console.error('Get product sizes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product sizes',
    });
  }
});

// ============================================
// SIZE RECOMMENDATION
// ============================================

/**
 * POST /api/size-finder/recommend
 *
 * Request body:
 * {
 *   productId: string;
 *   category: 'BRA' | 'PANTY' | ...;
 *   measurements: BraMeasurements | PantyMeasurements;
 *   region?: string;
 * }
 *
 * Response:
 * {
 *   recommendedSize: string;
 *   confidence: number;
 *   alternativeSizes: string[];
 *   fitNotes: string[];
 *   measurements: object;
 * }
 */
router.post('/size-finder/recommend', async (req: Request, res: Response) => {
  try {
    const validated = SizeRecommendationRequestSchema.parse(req.body);

    const regionCode =
      validated.region || (req as any).detectedRegion.regionCode;

    const recommendation = await sizeResolutionService.recommendSize({
      productId: validated.productId,
      regionCode,
      measurements: {
        category: validated.category,
        measurements: validated.measurements as any,
      },
    });

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'No size recommendation available',
      });
    }

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    console.error('Size recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get size recommendation',
    });
  }
});

// ============================================
// SIZE CONVERSION
// ============================================

/**
 * POST /api/sizes/convert
 *
 * Request body:
 * {
 *   fromRegion: string;
 *   toRegion: string;
 *   size: string;
 *   category: string;
 * }
 *
 * Response:
 * {
 *   fromRegion: string;
 *   fromSize: string;
 *   toRegion: string;
 *   toSize: string;
 *   confidence: number;
 *   notes?: string;
 * }
 */
router.post('/sizes/convert', async (req: Request, res: Response) => {
  try {
    const validated = SizeConversionRequestSchema.parse(req.body);

    const conversion = await sizeResolutionService.convertSize({
      fromRegion: validated.fromRegion,
      toRegion: validated.toRegion,
      size: validated.size,
      category: validated.category,
    });

    if (!conversion) {
      return res.status(404).json({
        success: false,
        error: 'Size conversion not found',
      });
    }

    res.json({
      success: true,
      data: conversion,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    console.error('Size conversion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to convert size',
    });
  }
});

// ============================================
// CONVERSION MATRIX
// ============================================

/**
 * GET /api/size-standards/:category/conversions
 *
 * Returns full conversion matrix for a category
 *
 * Response:
 * {
 *   category: string;
 *   regions: Array<{ code: string; name: string }>;
 *   sizes: {
 *     [regionCode]: Array<{
 *       displaySize: string;
 *       universalCode: string;
 *       measurements: object;
 *     }>;
 *   };
 * }
 */
router.get(
  '/size-standards/:category/conversions',
  async (req: Request, res: Response) => {
    try {
      const { category } = req.params;

      const matrix = await sizeResolutionService.getConversionMatrix(category);

      res.json({
        success: true,
        data: matrix,
      });
    } catch (error) {
      console.error('Get conversion matrix error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversion matrix',
      });
    }
  }
);

// ============================================
// REGIONS
// ============================================

/**
 * GET /api/regions
 *
 * Get all available regions
 *
 * Response:
 * {
 *   regions: Array<{
 *     code: string;
 *     name: string;
 *     currency: string;
 *     lengthUnit: 'in' | 'cm';
 *     weightUnit: 'lb' | 'kg';
 *   }>;
 * }
 */
router.get('/regions', async (req: Request, res: Response) => {
  try {
    const regions = await regionDetectionService.getAvailableRegions();

    res.json({
      success: true,
      data: {
        regions,
        current: (req as any).detectedRegion,
      },
    });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get regions',
    });
  }
});

// ============================================
// UPDATE USER REGION PREFERENCE
// ============================================

/**
 * PUT /api/users/me/region
 *
 * Update authenticated user's region preference
 *
 * Request body:
 * {
 *   regionCode: string;
 * }
 */
router.put('/users/me/region', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { regionCode } = req.body;

    if (!regionCode) {
      return res.status(400).json({
        success: false,
        error: 'regionCode is required',
      });
    }

    await regionDetectionService.updateUserRegionPreference(userId, regionCode);

    // Update session
    if (req.session) {
      req.session.region = regionCode;
    }

    res.json({
      success: true,
      message: 'Region preference updated',
    });
  } catch (error) {
    console.error('Update region preference error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update region preference',
    });
  }
});

// Export router
export default router;

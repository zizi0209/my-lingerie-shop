/**
 * SIZE SYSTEM API ROUTES V2
 *
 * Comprehensive API for Lingerie Size System
 * Includes: Sister Sizing, Brand Fit, Cup Progression
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sisterSizingService } from '../services/sister-sizing.service';
import { brandFitService } from '../services/brand-fit.service';
import { cupProgressionService } from '../services/cup-progression.service';
import { requireAdmin } from '../middleware/requireAdmin';

const router = Router();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const GetSisterSizesSchema = z.object({
  universalCode: z.string(),
});

const GetAlternativesSchema = z.object({
  productId: z.string(),
  requestedSize: z.string(),
  regionCode: z.string(),
});

const ConvertCupSchema = z.object({
  fromRegion: z.string(),
  toRegion: z.string(),
  cupLetter: z.string(),
});

const BrandFitAdjustmentSchema = z.object({
  brandId: z.string(),
  userNormalSize: z.string(),
  regionCode: z.string(),
});

const BrandFitFeedbackSchema = z.object({
  brandId: z.string(),
  productId: z.number(),
  normalSize: z.string(),
  boughtSize: z.string(),
  fitRating: z.number().min(1).max(5),
  fitComment: z.string().optional(),
  orderId: z.number().optional(),
});

// ============================================
// SISTER SIZING ENDPOINTS
// ============================================

/**
 * GET /api/sizes/sister/:universalCode
 *
 * Get sister sizes for a given size
 */
router.get('/sizes/sister/:universalCode', async (req: Request, res: Response) => {
  try {
    const { universalCode } = req.params;

    const result = await sisterSizingService.getSisterSizes({
      universalCode,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Get sister sizes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get sister sizes',
    });
  }
});

/**
 * GET /api/products/:productId/sizes/alternatives
 *
 * Get available sister size alternatives when requested size is out of stock
 *
 * Query params:
 * - requestedSize: The size user wants (e.g., "34C")
 * - regionCode: Region code (e.g., "US")
 */
router.get(
  '/products/:productId/sizes/alternatives',
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const { requestedSize, regionCode } = req.query;

      if (!requestedSize || !regionCode) {
        return res.status(400).json({
          success: false,
          error: 'requestedSize and regionCode are required',
        });
      }

      const result = await sisterSizingService.getAvailableSisterSizes({
        productId: parseInt(productId),
        requestedSize: requestedSize as string,
        regionCode: regionCode as string,
        sessionId: req.sessionID,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get alternatives error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alternatives',
      });
    }
  }
);

/**
 * GET /api/sizes/sister-family/:universalCode
 *
 * Get all sizes with same cup volume (sister size family)
 */
router.get(
  '/sizes/sister-family/:universalCode',
  async (req: Request, res: Response) => {
    try {
      const { universalCode } = req.params;
      const { regionCode } = req.query;

      if (!regionCode) {
        return res.status(400).json({
          success: false,
          error: 'regionCode is required',
        });
      }

      const family = await sisterSizingService.getSisterSizeFamily({
        universalCode,
        regionCode: regionCode as string,
      });

      res.json({
        success: true,
        data: family,
      });
    } catch (error: any) {
      console.error('Get sister family error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get sister family',
      });
    }
  }
);

/**
 * POST /api/sizes/sister/accept
 *
 * Mark sister size recommendation as accepted
 */
router.post('/sizes/sister/accept', async (req: Request, res: Response) => {
  try {
    const { recommendationId } = req.body;
    const userId = (req as any).user?.id;

    if (!recommendationId) {
      return res.status(400).json({
        success: false,
        error: 'recommendationId is required',
      });
    }

    await sisterSizingService.acceptRecommendation(recommendationId, userId);

    res.json({
      success: true,
      message: 'Recommendation accepted',
    });
  } catch (error: any) {
    console.error('Accept recommendation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to accept recommendation',
    });
  }
});

/**
 * GET /api/sizes/sister/stats
 *
 * Get sister size acceptance statistics
 */
router.get('/sizes/sister/stats', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const dateRange = from && to
      ? {
          from: new Date(from as string),
          to: new Date(to as string),
        }
      : undefined;

    const stats = await sisterSizingService.getAcceptanceStats(dateRange);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats',
    });
  }
});

/**
 * GET /api/sizes/out-of-stock
 *
 * Get frequently out-of-stock sizes
 */
router.get('/sizes/out-of-stock', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const sizes = await sisterSizingService.getFrequentlyOutOfStockSizes(limit);

    res.json({
      success: true,
      data: sizes,
    });
  } catch (error: any) {
    console.error('Get out-of-stock sizes error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get out-of-stock sizes',
    });
  }
});

// ============================================
// CUP PROGRESSION ENDPOINTS
// ============================================

/**
 * POST /api/sizes/cup/convert
 *
 * Convert cup letter between regions
 *
 * Body:
 * {
 *   "fromRegion": "US",
 *   "toRegion": "EU",
 *   "cupLetter": "DD"
 * }
 */
router.post('/sizes/cup/convert', async (req: Request, res: Response) => {
  try {
    const validated = ConvertCupSchema.parse(req.body);

    const result = await cupProgressionService.convertCupLetter(validated);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Cup conversion not found',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    console.error('Cup conversion error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to convert cup',
    });
  }
});

/**
 * GET /api/sizes/cup/progression/:regionCode
 *
 * Get full cup progression for a region
 */
router.get(
  '/sizes/cup/progression/:regionCode',
  async (req: Request, res: Response) => {
    try {
      const { regionCode } = req.params;

      const progression = cupProgressionService.getRegionCupProgression(
        regionCode.toUpperCase()
      );

      res.json({
        success: true,
        data: {
          regionCode,
          progression,
        },
      });
    } catch (error: any) {
      console.error('Get cup progression error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get cup progression',
      });
    }
  }
);

/**
 * GET /api/sizes/cup/matrix/:cupVolume
 *
 * Get cup conversion matrix for a specific cup volume
 */
router.get('/sizes/cup/matrix/:cupVolume', async (req: Request, res: Response) => {
  try {
    const cupVolume = parseInt(req.params.cupVolume);

    const matrix = await cupProgressionService.getConversionMatrix(cupVolume);

    res.json({
      success: true,
      data: {
        cupVolume,
        matrix,
      },
    });
  } catch (error: any) {
    console.error('Get cup matrix error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get cup matrix',
    });
  }
});

// ============================================
// BRAND FIT ENDPOINTS
// ============================================

/**
 * POST /api/brands/fit/adjust
 *
 * Get size adjustment for a brand
 *
 * Body:
 * {
 *   "brandId": "brand_vs",
 *   "userNormalSize": "34C",
 *   "regionCode": "US"
 * }
 */
router.post('/brands/fit/adjust', async (req: Request, res: Response) => {
  try {
    const validated = BrandFitAdjustmentSchema.parse(req.body);

    const result = await brandFitService.adjustSizeForBrand(validated);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    console.error('Brand fit adjustment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to adjust size for brand',
    });
  }
});

/**
 * GET /api/brands/:brandId/fit
 *
 * Get brand fit profile
 */
router.get('/brands/:brandId/fit', async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;

    const profile = await brandFitService.getBrandProfile(brandId);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Brand not found',
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    console.error('Get brand fit error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get brand fit',
    });
  }
});

/**
 * GET /api/brands/fit/all
 *
 * Get all brand fit profiles
 */
router.get('/brands/fit/all', async (req: Request, res: Response) => {
  try {
    const profiles = await brandFitService.getAllBrandProfiles();

    res.json({
      success: true,
      data: profiles,
    });
  } catch (error: any) {
    console.error('Get all brand fits error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get brand fits',
    });
  }
});

/**
 * POST /api/brands/fit/feedback
 *
 * Submit brand fit feedback
 *
 * Body:
 * {
 *   "brandId": "brand_vs",
 *   "productId": 123,
 *   "normalSize": "34C",
 *   "boughtSize": "36D",
 *   "fitRating": 3,
 *   "fitComment": "Fits perfectly!",
 *   "orderId": 456
 * }
 */
router.post('/brands/fit/feedback', async (req: Request, res: Response) => {
  try {
    const validated = BrandFitFeedbackSchema.parse(req.body);
    const userId = (req as any).user?.id;

    const result = await brandFitService.submitFitFeedback({
      ...validated,
      userId,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.issues,
      });
    }

    console.error('Submit fit feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to submit feedback',
    });
  }
});

/**
 * GET /api/brands/:brandId/fit/stats
 *
 * Get brand fit statistics
 */
router.get('/brands/:brandId/fit/stats', async (req: Request, res: Response) => {
  try {
    const { brandId } = req.params;

    const stats = await brandFitService.getBrandFitStats(brandId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get brand fit stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stats',
    });
  }
});

/**
 * GET /api/brands/:brandId/fit/suggested-adjustment
 *
 * Get AI-suggested brand adjustment based on feedback
 */
router.get(
  '/brands/:brandId/fit/suggested-adjustment',
  async (req: Request, res: Response) => {
    try {
      const { brandId } = req.params;

      const suggestion = await brandFitService.calculateSuggestedAdjustment(
        brandId
      );

      res.json({
        success: true,
        data: suggestion,
      });
    } catch (error: any) {
      console.error('Get suggested adjustment error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get suggested adjustment',
      });
    }
  }
);

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * POST /api/sizes/seed-cup-progression
 *
 * Seed cup progression data (admin only)
 */
router.post('/sizes/seed-cup-progression', requireAdmin, async (req: Request, res: Response) => {
  try {
    const count = await cupProgressionService.seedCupProgressionMap();

    res.json({
      success: true,
      message: `Seeded ${count} cup progression entries`,
    });
  } catch (error: any) {
    console.error('Seed cup progression error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to seed cup progression',
    });
  }
});

export default router;

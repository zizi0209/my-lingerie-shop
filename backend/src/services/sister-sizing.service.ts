/**
 * SISTER SIZING SERVICE
 *
 * Handles sister size calculations and recommendations
 * for out-of-stock scenarios
 *
 * Sister Sizing Rule:
 * - Sister Down: Band -2 inches (-5cm), Same cup volume
 * - Sister Up:   Band +2 inches (+5cm), Same cup volume
 *
 * Example: 34C
 * - Sister Down: 32D (tighter band, same cup volume)
 * - Sister Up:   36B (looser band, same cup volume)
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SizeInfo {
  universalCode: string;
  displaySize: string;
  bandSize: number;
  cupVolume: number;
  cupLetter: string;
  regionCode: string;
  measurements: any;
}

export interface SisterSizeResult {
  original: SizeInfo;
  sisterDown: SizeInfo | null;
  sisterUp: SizeInfo | null;
}

export interface AlternativeSizeOption {
  size: string;
  universalCode: string;
  type: 'SISTER_DOWN' | 'SISTER_UP';
  stock: number;
  fitNote: string;
  bandDifference: number; // in cm
  availableColors?: string[];
}

export interface SisterSizeRecommendationResult {
  requestedSize: string;
  isAvailable: boolean;
  stock?: number;
  alternatives: AlternativeSizeOption[];
  message?: string;
}

// ============================================
// SISTER SIZING SERVICE
// ============================================

export class SisterSizingService {
  /**
   * Get sister sizes for a given size
   */
  async getSisterSizes(params: {
    universalCode: string;
    includeStock?: boolean;
  }): Promise<SisterSizeResult> {
    const { universalCode } = params;

    // Check cache first
    const cacheKey = `sister-sizes:${universalCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get original size
    const originalSize = await prisma.regionalSize.findUnique({
      where: { universalCode },
      include: {
        region: true,
        standard: true,
      },
    });

    if (!originalSize) {
      throw new Error(`Size not found: ${universalCode}`);
    }

    const bandSize = originalSize.bandSize;
    const cupVolume = originalSize.cupVolume;
    const regionId = originalSize.regionId;
    const standardId = originalSize.standardId;

    // Find sister down (band -5cm, same cup volume)
    const sisterDown = await prisma.regionalSize.findFirst({
      where: {
        standardId,
        regionId,
        bandSize: bandSize - 5,
        cupVolume,
      },
      include: {
        region: true,
        standard: true,
      },
    });

    // Find sister up (band +5cm, same cup volume)
    const sisterUp = await prisma.regionalSize.findFirst({
      where: {
        standardId,
        regionId,
        bandSize: bandSize + 5,
        cupVolume,
      },
      include: {
        region: true,
        standard: true,
      },
    });

    const result: SisterSizeResult = {
      original: this.formatSizeInfo(originalSize),
      sisterDown: sisterDown ? this.formatSizeInfo(sisterDown) : null,
      sisterUp: sisterUp ? this.formatSizeInfo(sisterUp) : null,
    };

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * Get available sister size alternatives for a product
   * when requested size is out of stock
   */
  async getAvailableSisterSizes(params: {
    productId: number;
    requestedSize: string;
    regionCode: string;
    sessionId?: string;
  }): Promise<SisterSizeRecommendationResult> {
    const { productId, requestedSize, regionCode, sessionId } = params;

    // Find the requested variant
    const requestedVariant = await prisma.productVariant.findFirst({
      where: {
        productId,
        OR: [
          { size: requestedSize },
          { baseSize: requestedSize },
        ],
      },
    });

    if (!requestedVariant) {
      return {
        requestedSize,
        isAvailable: false,
        alternatives: [],
        message: 'Size not available for this product',
      };
    }

    // Check if in stock
    const isAvailable = requestedVariant.stock > 0;

    if (isAvailable) {
      return {
        requestedSize,
        isAvailable: true,
        stock: requestedVariant.stock,
        alternatives: [],
      };
    }

    // Get sister sizes
    const uic = requestedVariant.baseSizeUIC || `UIC_BRA_${requestedVariant.size.replace(/\s/g, '_')}`;
    const sisters = await this.getSisterSizes({
      universalCode: uic,
    });

    const alternatives: AlternativeSizeOption[] = [];

    // Check sister down availability
    if (sisters.sisterDown) {
      const sisterDownVariants = await prisma.productVariant.findMany({
        where: {
          productId,
          baseSizeUIC: sisters.sisterDown.universalCode,
          stock: {
            gt: 0,
          },
        },
      });

      if (sisterDownVariants.length > 0) {
        const totalStock = sisterDownVariants.reduce((sum, v) => sum + v.stock, 0);
        const availableColors = sisterDownVariants.map((v) => v.colorName);

        alternatives.push({
          size: sisters.sisterDown.displaySize,
          universalCode: sisters.sisterDown.universalCode,
          type: 'SISTER_DOWN',
          stock: totalStock,
          bandDifference: -5,
          fitNote: this.generateFitNote('SISTER_DOWN', sisters.original, sisters.sisterDown),
          availableColors,
        });
      }
    }

    // Check sister up availability
    if (sisters.sisterUp) {
      const sisterUpVariants = await prisma.productVariant.findMany({
        where: {
          productId,
          baseSizeUIC: sisters.sisterUp.universalCode,
          stock: {
            gt: 0,
          },
        },
      });

      if (sisterUpVariants.length > 0) {
        const totalStock = sisterUpVariants.reduce((sum, v) => sum + v.stock, 0);
        const availableColors = sisterUpVariants.map((v) => v.colorName);

        alternatives.push({
          size: sisters.sisterUp.displaySize,
          universalCode: sisters.sisterUp.universalCode,
          type: 'SISTER_UP',
          stock: totalStock,
          bandDifference: 5,
          fitNote: this.generateFitNote('SISTER_UP', sisters.original, sisters.sisterUp),
          availableColors,
        });
      }
    }

    // Log recommendation for analytics
    if (alternatives.length > 0 && sessionId) {
      await this.logRecommendation({
        productId,
        variantId: requestedVariant.id,
        requestedSize,
        requestedUIC: uic,
        recommendedSize: alternatives[0].size,
        recommendedUIC: alternatives[0].universalCode,
        recommendationType: alternatives[0].type,
        sessionId,
        regionCode,
      });
    }

    return {
      requestedSize,
      isAvailable: false,
      stock: 0,
      alternatives,
      message: alternatives.length > 0
        ? 'Size is out of stock, but sister sizes are available'
        : 'Size is out of stock and no sister sizes available',
    };
  }

  /**
   * Get all sizes with same cup volume (sister size family)
   */
  async getSisterSizeFamily(params: {
    universalCode: string;
    regionCode: string;
  }): Promise<SizeInfo[]> {
    // Get original size
    const originalSize = await prisma.regionalSize.findUnique({
      where: { universalCode: params.universalCode },
    });

    if (!originalSize) {
      throw new Error('Size not found');
    }

    // Get all sizes with same cup volume in the region
    const family = await prisma.regionalSize.findMany({
      where: {
        regionId: params.regionCode,
        cupVolume: originalSize.cupVolume,
        standardId: originalSize.standardId,
      },
      include: {
        region: true,
        standard: true,
      },
      orderBy: {
        bandSize: 'asc',
      },
    });

    return family.map((size) => this.formatSizeInfo(size));
  }

  /**
   * Mark sister size recommendation as accepted
   */
  async acceptRecommendation(recommendationId: string, userId?: number): Promise<void> {
    await prisma.sisterSizeRecommendation.update({
      where: { id: recommendationId },
      data: {
        accepted: true,
        acceptedAt: new Date(),
        userId,
      },
    });
  }

  /**
   * Get sister size acceptance statistics
   */
  async getAcceptanceStats(dateRange?: { from: Date; to: Date }) {
    const where: any = {};

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to,
      };
    }

    const stats = await prisma.sisterSizeRecommendation.groupBy({
      by: ['recommendationType'],
      where,
      _count: {
        id: true,
        accepted: true,
      },
    });

    return stats.map((stat) => ({
      type: stat.recommendationType,
      totalRecommendations: stat._count?.id || 0,
      acceptedRecommendations: stat._count?.accepted || 0,
      acceptanceRate:
        (stat._count?.id || 0) > 0
          ? ((stat._count?.accepted || 0) / (stat._count?.id || 0)) * 100
          : 0,
    }));
  }

  /**
   * Get frequently out-of-stock sizes
   */
  async getFrequentlyOutOfStockSizes(limit: number = 20) {
    const outOfStockRequests = await prisma.sisterSizeRecommendation.groupBy({
      by: ['requestedSize', 'productId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    return outOfStockRequests.map((req) => ({
      size: req.requestedSize,
      productId: req.productId,
      outOfStockRequests: req._count.id,
    }));
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private formatSizeInfo(size: any): SizeInfo {
    return {
      universalCode: size.universalCode,
      displaySize: size.displaySize,
      bandSize: size.bandSize,
      cupVolume: size.cupVolume,
      cupLetter: size.cupLetter,
      regionCode: size.region?.code || size.regionId,
      measurements: size.measurements,
    };
  }

  private generateFitNote(
    type: 'SISTER_DOWN' | 'SISTER_UP',
    original: SizeInfo,
    sister: SizeInfo
  ): string {
    if (type === 'SISTER_DOWN') {
      return `Band will be tighter. ${sister.displaySize} has a snugger band than ${original.displaySize} but the same cup volume. Good if you prefer more support.`;
    } else {
      return `Band will be looser. ${sister.displaySize} has a more relaxed band than ${original.displaySize} but the same cup volume. Good if you prefer more comfort.`;
    }
  }

  private async logRecommendation(params: {
    productId: number;
    variantId: number;
    requestedSize: string;
    requestedUIC: string;
    recommendedSize: string;
    recommendedUIC: string;
    recommendationType: 'SISTER_DOWN' | 'SISTER_UP';
    sessionId: string;
    regionCode: string;
    userId?: number;
  }): Promise<void> {
    try {
      await prisma.sisterSizeRecommendation.create({
        data: {
          productId: params.productId,
          variantId: params.variantId,
          requestedSize: params.requestedSize,
          requestedUIC: params.requestedUIC,
          recommendedSize: params.recommendedSize,
          recommendedUIC: params.recommendedUIC,
          recommendationType: params.recommendationType,
          sessionId: params.sessionId,
          regionCode: params.regionCode,
          userId: params.userId,
        },
      });
    } catch (error) {
      // Don't fail the main flow if logging fails
      console.error('Failed to log sister size recommendation:', error);
    }
  }

  /**
   * Invalidate sister size cache
   */
  async invalidateCache(universalCode?: string): Promise<void> {
    if (universalCode) {
      await redis.del(`sister-sizes:${universalCode}`);
    } else {
      const keys = await redis.keys('sister-sizes:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }
}

// Export singleton instance
export const sisterSizingService = new SisterSizingService();

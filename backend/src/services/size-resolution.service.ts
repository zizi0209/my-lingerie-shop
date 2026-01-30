/**
 * SIZE RESOLUTION SERVICE
 *
 * Enterprise-grade service for managing multi-regional size systems
 *
 * Features:
 * - Region-based size display
 * - Size conversion between regions
 * - Size recommendation engine
 * - Performance-optimized with caching
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface BraMeasurements {
  bandSize: {
    value: number;
    unit: 'in' | 'cm';
    min?: number;
    max?: number;
  };
  cupSize: {
    value: string;
    letterCode: string;
    volume: number;
  };
  underBust: {
    min: number;
    max: number;
    unit: 'in' | 'cm';
  };
  bust: {
    min: number;
    max: number;
    unit: 'in' | 'cm';
  };
  cupDepth?: number;
  wireWidth?: number;
}

export interface PantyMeasurements {
  size: {
    value: string;
    numeric?: number;
  };
  waist: {
    min: number;
    max: number;
    unit: 'in' | 'cm';
  };
  hip: {
    min: number;
    max: number;
    unit: 'in' | 'cm';
  };
  rise?: {
    value: number;
    unit: 'in' | 'cm';
  };
}

export interface UserMeasurements {
  category: 'BRA' | 'PANTY' | 'SET' | 'SLEEPWEAR' | 'SHAPEWEAR';
  measurements: BraMeasurements | PantyMeasurements;
}

export interface ProductSizeResponse {
  productId: string;
  region: string;
  sizes: Array<{
    id: string;
    displaySize: string;
    universalCode: string;
    stock: number;
    isAvailable: boolean;
    measurements: BraMeasurements | PantyMeasurements;
    conversions?: Array<{
      region: string;
      regionName: string;
      size: string;
      confidence: number;
    }>;
  }>;
}

export interface SizeConversionResult {
  fromRegion: string;
  fromSize: string;
  toRegion: string;
  toSize: string;
  confidence: number;
  notes?: string;
}

export interface SizeRecommendation {
  recommendedSize: string;
  confidence: number;
  alternativeSizes: string[];
  fitNotes: string[];
  measurements: BraMeasurements | PantyMeasurements;
}

// ============================================
// SIZE RESOLUTION SERVICE
// ============================================

export class SizeResolutionService {
  /**
   * Get available sizes for a product based on user's region
   */
  async getProductSizes(params: {
    productId: string;
    regionCode: string;
    includeConversions?: boolean;
  }): Promise<ProductSizeResponse> {
    const { productId, regionCode, includeConversions = false } = params;

    // Cache key
    const cacheKey = `product-sizes:${productId}:${regionCode}:${includeConversions}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get product with sizes
    const productSizes = await (prisma as any).productSize.findMany({
      where: {
        productId: parseInt(productId),
        regionalSize: {
          regionId: regionCode,
        },
      },
      include: {
        regionalSize: {
          include: {
            region: true,
            standard: true,
          },
        },
      },
      orderBy: {
        regionalSize: {
          sortOrder: 'asc',
        },
      },
    });

    // Format response
    const sizes = await Promise.all(
      productSizes.map(async (ps: any) => {
        const size: any = {
          id: ps.id,
          displaySize: ps.regionalSize.displaySize,
          universalCode: ps.regionalSize.universalCode,
          stock: ps.stock,
          isAvailable: ps.isAvailable && ps.stock > 0,
          measurements: ps.regionalSize.measurements as BraMeasurements | PantyMeasurements,
        };

        // Include conversions if requested
        if (includeConversions) {
          size.conversions = await this.getSizeConversions({
            universalCode: ps.regionalSize.universalCode,
            currentRegion: regionCode,
          });
        }

        return size;
      })
    );

    const response: ProductSizeResponse = {
      productId,
      region: regionCode,
      sizes,
    };

    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(response));

    return response;
  }

  /**
   * Get size conversions for all regions
   */
  async getSizeConversions(params: {
    universalCode: string;
    currentRegion: string;
  }): Promise<Array<{
    region: string;
    regionName: string;
    size: string;
    confidence: number;
  }>> {
    // Get all regional sizes with the same universal code
    const regionalSizes = await prisma.regionalSize.findMany({
      where: {
        universalCode: params.universalCode,
        regionId: {
          not: params.currentRegion,
        },
      },
      include: {
        region: true,
      },
    });

    return regionalSizes.map((rs) => ({
      region: rs.region.code,
      regionName: rs.region.name,
      size: rs.displaySize,
      confidence: 1.0, // Same universal code = perfect match
    }));
  }

  /**
   * Convert size between regions
   */
  async convertSize(params: {
    fromRegion: string;
    toRegion: string;
    size: string;
    category: string;
  }): Promise<SizeConversionResult | null> {
    const { fromRegion, toRegion, size, category } = params;

    // Cache key
    const cacheKey = `size-conversion:${fromRegion}:${toRegion}:${category}:${size}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get source standard
    const fromStandard = await prisma.sizeStandard.findFirst({
      where: {
        regionId: fromRegion,
        category: category.toUpperCase(),
      },
    });

    // Get target standard
    const toStandard = await prisma.sizeStandard.findFirst({
      where: {
        regionId: toRegion,
        category: category.toUpperCase(),
      },
    });

    if (!fromStandard || !toStandard) {
      return null;
    }

    // Look up conversion
    const conversion = await prisma.sizeConversion.findFirst({
      where: {
        fromStandardId: fromStandard.id,
        fromSize: size,
        toStandardId: toStandard.id,
      },
    });

    if (!conversion) {
      // Try reverse lookup
      const reverseConversion = await prisma.sizeConversion.findFirst({
        where: {
          fromStandardId: toStandard.id,
          toStandardId: fromStandard.id,
          toSize: size,
        },
      });

      if (reverseConversion) {
        const result: SizeConversionResult = {
          fromRegion,
          fromSize: size,
          toRegion,
          toSize: reverseConversion.fromSize,
          confidence: reverseConversion.confidence,
          notes: reverseConversion.notes || undefined,
        };

        await redis.setex(cacheKey, 86400, JSON.stringify(result));
        return result;
      }

      return null;
    }

    const result: SizeConversionResult = {
      fromRegion,
      fromSize: size,
      toRegion,
      toSize: conversion.toSize,
      confidence: conversion.confidence,
      notes: conversion.notes || undefined,
    };

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, JSON.stringify(result));

    return result;
  }

  /**
   * Recommend size based on user measurements
   */
  async recommendSize(params: {
    measurements: UserMeasurements;
    productId: string;
    regionCode: string;
  }): Promise<SizeRecommendation | null> {
    const { measurements, productId, regionCode } = params;

    // Get all sizes for this product in the region
    const productSizes = await this.getProductSizes({
      productId,
      regionCode,
      includeConversions: false,
    });

    if (productSizes.sizes.length === 0) {
      return null;
    }

    // Find best match based on measurements
    const matches: Array<{
      size: string;
      score: number;
      sizeMeasurements: BraMeasurements | PantyMeasurements;
    }> = [];

    for (const size of productSizes.sizes) {
      if (!size.isAvailable) continue;

      const score = this.calculateFitScore(
        measurements.measurements,
        size.measurements,
        measurements.category
      );

      matches.push({
        size: size.displaySize,
        score,
        sizeMeasurements: size.measurements,
      });
    }

    // Sort by score (descending)
    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      return null;
    }

    const bestMatch = matches[0];
    const alternatives = matches.slice(1, 4).map((m) => m.size);

    // Generate fit notes
    const fitNotes = this.generateFitNotes(
      measurements.measurements,
      bestMatch.sizeMeasurements,
      measurements.category
    );

    return {
      recommendedSize: bestMatch.size,
      confidence: bestMatch.score,
      alternativeSizes: alternatives,
      fitNotes,
      measurements: bestMatch.sizeMeasurements,
    };
  }

  /**
   * Calculate fit score (0-1) based on measurements
   */
  private calculateFitScore(
    userMeasurements: BraMeasurements | PantyMeasurements,
    sizeMeasurements: BraMeasurements | PantyMeasurements,
    category: string
  ): number {
    if (category === 'BRA') {
      return this.calculateBraFitScore(
        userMeasurements as BraMeasurements,
        sizeMeasurements as BraMeasurements
      );
    } else if (category === 'PANTY') {
      return this.calculatePantyFitScore(
        userMeasurements as PantyMeasurements,
        sizeMeasurements as PantyMeasurements
      );
    }

    return 0;
  }

  /**
   * Calculate bra fit score
   */
  private calculateBraFitScore(
    user: BraMeasurements,
    size: BraMeasurements
  ): number {
    let score = 0;

    // Band size match (50% weight)
    const bandDiff = Math.abs(user.bandSize.value - size.bandSize.value);
    const bandScore = Math.max(0, 1 - bandDiff / 4); // Allow 4" tolerance
    score += bandScore * 0.5;

    // Cup size match (50% weight)
    const cupDiff = Math.abs(user.cupSize.volume - size.cupSize.volume);
    const cupScore = Math.max(0, 1 - cupDiff / 2); // Allow 2 cup sizes tolerance
    score += cupScore * 0.5;

    return score;
  }

  /**
   * Calculate panty fit score
   */
  private calculatePantyFitScore(
    user: PantyMeasurements,
    size: PantyMeasurements
  ): number {
    // Check if waist is in range
    const waistFits =
      user.waist.min >= size.waist.min && user.waist.max <= size.waist.max;
    const waistScore = waistFits ? 1 : 0;

    // Check if hip is in range
    const hipFits =
      user.hip.min >= size.hip.min && user.hip.max <= size.hip.max;
    const hipScore = hipFits ? 1 : 0;

    // Average of waist and hip
    return (waistScore + hipScore) / 2;
  }

  /**
   * Generate fit notes based on measurements
   */
  private generateFitNotes(
    userMeasurements: BraMeasurements | PantyMeasurements,
    sizeMeasurements: BraMeasurements | PantyMeasurements,
    category: string
  ): string[] {
    const notes: string[] = [];

    if (category === 'BRA') {
      const user = userMeasurements as BraMeasurements;
      const size = sizeMeasurements as BraMeasurements;

      // Band fit notes
      if (user.bandSize.value < size.bandSize.min!) {
        notes.push('Band may be slightly loose. Consider sister sizing down.');
      } else if (user.bandSize.value > size.bandSize.max!) {
        notes.push('Band may be slightly tight. Consider sister sizing up.');
      } else {
        notes.push('Band should fit comfortably.');
      }

      // Cup fit notes
      if (user.cupSize.volume < size.cupSize.volume) {
        notes.push('Cup may have extra room. Perfect for padded styles.');
      } else if (user.cupSize.volume > size.cupSize.volume) {
        notes.push('Cup may be snug. Ensure full coverage.');
      } else {
        notes.push('Cup should provide excellent support.');
      }
    } else if (category === 'PANTY') {
      const user = userMeasurements as PantyMeasurements;
      const size = sizeMeasurements as PantyMeasurements;

      // Waist notes
      if (user.waist.min < size.waist.min) {
        notes.push('Waist may be loose. Consider sizing down.');
      } else if (user.waist.max > size.waist.max) {
        notes.push('Waist may be snug. Consider sizing up.');
      }

      // Hip notes
      if (user.hip.min < size.hip.min) {
        notes.push('Hip coverage may be generous.');
      } else if (user.hip.max > size.hip.max) {
        notes.push('Hip fit may be snug.');
      }
    }

    return notes;
  }

  /**
   * Get full conversion matrix for a category
   */
  async getConversionMatrix(category: string): Promise<any> {
    const cacheKey = `conversion-matrix:${category}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get all regions
    const regions = await prisma.region.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    // Get all standards for this category
    const standards = await prisma.sizeStandard.findMany({
      where: {
        category: category.toUpperCase(),
      },
      include: {
        region: true,
        sizes: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // Build matrix
    const matrix: any = {
      category,
      regions: regions.map((r) => ({ code: r.code, name: r.name })),
      sizes: {},
    };

    for (const standard of standards) {
      matrix.sizes[standard.region.code] = standard.sizes.map((s) => ({
        displaySize: s.displaySize,
        universalCode: s.universalCode,
        measurements: s.measurements,
      }));
    }

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, JSON.stringify(matrix));

    return matrix;
  }

  /**
   * Invalidate product size cache
   */
  async invalidateProductSizeCache(productId: string): Promise<void> {
    const regions = await prisma.region.findMany();

    for (const region of regions) {
      await redis.del(`product-sizes:${productId}:${region.code}:false`);
      await redis.del(`product-sizes:${productId}:${region.code}:true`);
    }
  }
}

// Export singleton instance
export const sizeResolutionService = new SizeResolutionService();

/**
 * BRAND FIT SERVICE
 *
 * Handles brand-specific size adjustments
 *
 * Problem: Different brands fit differently
 * - Victoria's Secret: True to size
 * - Agent Provocateur: Runs small (+1 band, +1 cup)
 * - Bluebella: Runs large (-1 band)
 *
 * This service adjusts size recommendations based on brand fit profiles
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { cupProgressionService } from './cup-progression.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============================================
// TYPE DEFINITIONS
// ============================================

export type FitType = 'TRUE_TO_SIZE' | 'RUNS_SMALL' | 'RUNS_LARGE';

export interface BrandFitProfile {
  id: string;
  name: string;
  slug: string;
  fitType: FitType;
  bandAdjustment: number; // -2, -1, 0, +1, +2
  cupAdjustment: number; // -1, 0, +1
  fitNotes: string;
  fitConfidence: number; // 0-1
}

export interface SizeAdjustmentResult {
  originalSize: string;
  recommendedSize: string;
  bandAdjustment: number;
  cupAdjustment: number;
  fitType: FitType;
  fitNote: string;
  confidence: number;
}

export interface BrandFitFeedbackData {
  brandId: string;
  productId: number;
  userId?: number;
  normalSize: string;
  boughtSize: string;
  fitRating: number; // 1-5 (1=too small, 3=perfect, 5=too large)
  fitComment?: string;
  orderId?: number;
}

// ============================================
// BRAND FIT SERVICE
// ============================================

export class BrandFitService {
  /**
   * Adjust size recommendation based on brand fit profile
   */
  async adjustSizeForBrand(params: {
    brandId: string;
    userNormalSize: string;
    regionCode: string;
  }): Promise<SizeAdjustmentResult> {
    const { brandId, userNormalSize, regionCode } = params;

    // Check cache
    const cacheKey = `brand-fit:${brandId}:${userNormalSize}:${regionCode}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get brand profile
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      throw new Error(`Brand not found: ${brandId}`);
    }

    // If true to size, no adjustment needed
    if (brand.fitType === 'TRUE_TO_SIZE') {
      const result: SizeAdjustmentResult = {
        originalSize: userNormalSize,
        recommendedSize: userNormalSize,
        bandAdjustment: 0,
        cupAdjustment: 0,
        fitType: 'TRUE_TO_SIZE',
        fitNote: brand.fitNotes || 'True to size',
        confidence: brand.fitConfidence,
      };
      return result;
    }

    // Parse user size
    const parsed = this.parseSize(userNormalSize);
    if (!parsed) {
      throw new Error(`Invalid size format: ${userNormalSize}`);
    }

    // Apply band adjustment (each adjustment = 2 inches = 5cm)
    const adjustedBandSize = parsed.bandCm + brand.bandAdjustment * 5;

    // Apply cup adjustment
    const adjustedCupVolume = parsed.cupVolume + brand.cupAdjustment;

    // Get adjusted cup letter for this region
    const adjustedCupLetter = cupProgressionService.getCupLetter(
      regionCode,
      adjustedCupVolume
    );

    if (!adjustedCupLetter) {
      throw new Error(
        `No cup letter found for volume ${adjustedCupVolume} in region ${regionCode}`
      );
    }

    // Find the adjusted size in database
    const adjustedSize = await prisma.regionalSize.findFirst({
      where: {
        bandSize: adjustedBandSize,
        cupVolume: adjustedCupVolume,
        region: {
          code: regionCode,
        },
      },
    });

    const recommendedSize = adjustedSize
      ? adjustedSize.displaySize
      : this.formatSize(adjustedBandSize, adjustedCupLetter, regionCode);

    // Generate fit note
    const fitNote = this.generateFitNote(
      brand.fitType,
      brand.fitNotes || '',
      userNormalSize,
      recommendedSize,
      brand.bandAdjustment,
      brand.cupAdjustment
    );

    const result: SizeAdjustmentResult = {
      originalSize: userNormalSize,
      recommendedSize,
      bandAdjustment: brand.bandAdjustment,
      cupAdjustment: brand.cupAdjustment,
      fitType: brand.fitType as FitType,
      fitNote,
      confidence: brand.fitConfidence,
    };

    // Cache for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * Get brand fit profile
   */
  async getBrandProfile(brandId: string): Promise<BrandFitProfile | null> {
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) return null;

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      fitType: brand.fitType as FitType,
      bandAdjustment: brand.bandAdjustment,
      cupAdjustment: brand.cupAdjustment,
      fitNotes: brand.fitNotes || '',
      fitConfidence: brand.fitConfidence,
    };
  }

  /**
   * Get all brands with fit profiles
   */
  async getAllBrandProfiles(): Promise<BrandFitProfile[]> {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      fitType: brand.fitType as FitType,
      bandAdjustment: brand.bandAdjustment,
      cupAdjustment: brand.cupAdjustment,
      fitNotes: brand.fitNotes || '',
      fitConfidence: brand.fitConfidence,
    }));
  }

  /**
   * Submit brand fit feedback
   */
  async submitFitFeedback(
    feedback: BrandFitFeedbackData
  ): Promise<{ id: string }> {
    const created = await prisma.brandFitFeedback.create({
      data: {
        brandId: feedback.brandId,
        productId: feedback.productId,
        userId: feedback.userId,
        normalSize: feedback.normalSize,
        boughtSize: feedback.boughtSize,
        fitRating: feedback.fitRating,
        fitComment: feedback.fitComment,
        isVerified: !!feedback.orderId,
        orderId: feedback.orderId,
      },
    });

    // Update brand fit confidence based on feedback
    await this.updateBrandFitConfidence(feedback.brandId);

    return { id: created.id };
  }

  /**
   * Get brand fit feedback statistics
   */
  async getBrandFitStats(brandId: string) {
    const feedbacks = await prisma.brandFitFeedback.findMany({
      where: {
        brandId,
        isVerified: true,
      },
    });

    if (feedbacks.length === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        fitDistribution: {},
      };
    }

    const totalFeedback = feedbacks.length;
    const averageRating =
      feedbacks.reduce((sum, f) => sum + f.fitRating, 0) / totalFeedback;

    // Fit distribution (how many people rated 1-5)
    const fitDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    feedbacks.forEach((f) => {
      fitDistribution[f.fitRating] = (fitDistribution[f.fitRating] || 0) + 1;
    });

    return {
      totalFeedback,
      averageRating,
      fitDistribution,
    };
  }

  /**
   * Calculate suggested brand adjustment based on feedback
   */
  async calculateSuggestedAdjustment(brandId: string): Promise<{
    suggestedFitType: FitType;
    suggestedBandAdjustment: number;
    suggestedCupAdjustment: number;
    confidence: number;
  }> {
    const feedbacks = await prisma.brandFitFeedback.findMany({
      where: {
        brandId,
        isVerified: true,
      },
    });

    if (feedbacks.length < 10) {
      // Not enough data
      return {
        suggestedFitType: 'TRUE_TO_SIZE',
        suggestedBandAdjustment: 0,
        suggestedCupAdjustment: 0,
        confidence: 0,
      };
    }

    const stats = await this.getBrandFitStats(brandId);

    // Calculate fit type based on average rating
    // 1-2: RUNS_LARGE (people had to size down)
    // 3: TRUE_TO_SIZE
    // 4-5: RUNS_SMALL (people had to size up)

    let suggestedFitType: FitType = 'TRUE_TO_SIZE';
    let suggestedBandAdjustment = 0;
    let suggestedCupAdjustment = 0;

    if (stats.averageRating < 2.5) {
      suggestedFitType = 'RUNS_LARGE';
      suggestedBandAdjustment = -1;
    } else if (stats.averageRating > 3.5) {
      suggestedFitType = 'RUNS_SMALL';
      suggestedBandAdjustment = 1;
    }

    // Calculate confidence (more feedback = higher confidence)
    const confidence = Math.min(feedbacks.length / 100, 1.0);

    return {
      suggestedFitType,
      suggestedBandAdjustment,
      suggestedCupAdjustment,
      confidence,
    };
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * Create or update brand fit profile
   */
  async upsertBrandProfile(params: {
    brandId?: string;
    name: string;
    slug: string;
    fitType: FitType;
    bandAdjustment: number;
    cupAdjustment: number;
    fitNotes?: string;
  }): Promise<BrandFitProfile> {
    const brand = await prisma.brand.upsert({
      where: {
        id: params.brandId || 'new',
      },
      create: {
        name: params.name,
        slug: params.slug,
        fitType: params.fitType,
        bandAdjustment: params.bandAdjustment,
        cupAdjustment: params.cupAdjustment,
        fitNotes: params.fitNotes,
        fitConfidence: 0.5,
      },
      update: {
        fitType: params.fitType,
        bandAdjustment: params.bandAdjustment,
        cupAdjustment: params.cupAdjustment,
        fitNotes: params.fitNotes,
      },
    });

    // Invalidate cache
    await this.invalidateCache(brand.id);

    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      fitType: brand.fitType as FitType,
      bandAdjustment: brand.bandAdjustment,
      cupAdjustment: brand.cupAdjustment,
      fitNotes: brand.fitNotes || '',
      fitConfidence: brand.fitConfidence,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private parseSize(size: string): {
    bandCm: number;
    cupVolume: number;
    cupLetter: string;
  } | null {
    const match = size.match(/^(\d+)([A-Z]+)$/i);
    if (!match) return null;

    const bandDisplay = parseInt(match[1]);
    const cupLetter = match[2].toUpperCase();

    // Assume US standard for parsing (you can make this dynamic)
    const cupVolume = cupProgressionService.getCupVolume('US', cupLetter);

    // Convert band to cm (assume inches if < 50, otherwise already cm)
    const bandCm = bandDisplay < 50 ? Math.round(bandDisplay * 2.54) : bandDisplay;

    return {
      bandCm,
      cupVolume,
      cupLetter,
    };
  }

  private formatSize(
    bandCm: number,
    cupLetter: string,
    regionCode: string
  ): string {
    // Format band based on region
    const usesInches = regionCode === 'US' || regionCode === 'UK';
    const bandDisplay = usesInches
      ? Math.round(bandCm / 2.54)
      : bandCm;

    return `${bandDisplay}${cupLetter}`;
  }

  private generateFitNote(
    fitType: string,
    baseFitNotes: string,
    originalSize: string,
    recommendedSize: string,
    bandAdjustment: number,
    cupAdjustment: number
  ): string {
    let note = baseFitNotes;

    if (originalSize !== recommendedSize) {
      note += `\n\nNormally wear ${originalSize}? We recommend ${recommendedSize} in this brand.`;

      if (bandAdjustment !== 0) {
        const direction = bandAdjustment > 0 ? 'up' : 'down';
        note += ` (Band runs ${Math.abs(bandAdjustment)} size${Math.abs(bandAdjustment) > 1 ? 's' : ''} ${direction})`;
      }

      if (cupAdjustment !== 0) {
        const direction = cupAdjustment > 0 ? 'small' : 'large';
        note += ` (Cup runs ${direction})`;
      }
    }

    return note.trim();
  }

  private async updateBrandFitConfidence(brandId: string): Promise<void> {
    const stats = await this.getBrandFitStats(brandId);

    // Confidence increases with more verified feedback
    const confidence = Math.min(stats.totalFeedback / 100, 1.0);

    await prisma.brand.update({
      where: { id: brandId },
      data: { fitConfidence: confidence },
    });

    // Invalidate cache
    await this.invalidateCache(brandId);
  }

  /**
   * Invalidate brand fit cache
   */
  async invalidateCache(brandId?: string): Promise<void> {
    if (brandId) {
      const keys = await redis.keys(`brand-fit:${brandId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      const keys = await redis.keys('brand-fit:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }
}

// Export singleton instance
export const brandFitService = new BrandFitService();

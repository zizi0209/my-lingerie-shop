/**
 * CUP PROGRESSION SERVICE
 *
 * Handles cup letter conversions between regions
 * CRITICAL: Uses mapping tables, NOT mathematical formulas!
 *
 * Cup naming differs by region:
 * - US:  A, B, C, D, DD, DDD, G, H
 * - UK:  A, B, C, D, DD, E, F, FF, G, GG
 * - EU:  A, B, C, D, E, F, G, H
 *
 * Example:
 * - US 34DD  = UK 34DD = EU 75E  (volume 5)
 * - US 34DDD = UK 34E  = EU 75F  (volume 6)
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// ============================================
// HARDCODED CUP PROGRESSION TABLES
// ============================================

export const CUP_PROGRESSIONS: Record<string, string[]> = {
  US: ['AA', 'A', 'B', 'C', 'D', 'DD', 'DDD', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
  UK: ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ', 'K'],
  EU: ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
  FR: ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
  AU: ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'FF', 'G', 'GG', 'H', 'HH', 'J', 'JJ'],
  JP: ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
  VN: ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G', 'H', 'I', 'J'], // Follow US/UK hybrid
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CupConversionResult {
  fromRegion: string;
  fromCupLetter: string;
  fromCupVolume: number;
  toRegion: string;
  toCupLetter: string;
  toCupVolume: number;
  isExactMatch: boolean;
}

export interface CupProgressionInfo {
  regionCode: string;
  cupLetter: string;
  cupVolume: number;
  index: number;
  nextCup: string | null;
  previousCup: string | null;
}

// ============================================
// CUP PROGRESSION SERVICE
// ============================================

export class CupProgressionService {
  /**
   * Convert cup letter from one region to another
   * CRITICAL: Uses mapping table, NOT math!
   */
  async convertCupLetter(params: {
    fromRegion: string;
    toRegion: string;
    cupLetter: string;
  }): Promise<CupConversionResult | null> {
    const { fromRegion, toRegion, cupLetter } = params;

    // Check cache
    const cacheKey = `cup-conversion:${fromRegion}:${toRegion}:${cupLetter}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get progressions
    const fromProgression = CUP_PROGRESSIONS[fromRegion];
    const toProgression = CUP_PROGRESSIONS[toRegion];

    if (!fromProgression || !toProgression) {
      console.error(`Invalid region: ${fromRegion} or ${toRegion}`);
      return null;
    }

    // Find cup volume (index in progression array)
    const cupVolume = fromProgression.indexOf(cupLetter);

    if (cupVolume === -1) {
      console.error(`Invalid cup letter '${cupLetter}' for region ${fromRegion}`);
      return null;
    }

    // Get equivalent cup letter in target region
    const toCupLetter = toProgression[cupVolume];

    if (!toCupLetter) {
      console.error(
        `No equivalent cup for volume ${cupVolume} in region ${toRegion}`
      );
      return null;
    }

    const result: CupConversionResult = {
      fromRegion,
      fromCupLetter: cupLetter,
      fromCupVolume: cupVolume + 1, // Volume 1-based for display
      toRegion,
      toCupLetter,
      toCupVolume: cupVolume + 1,
      isExactMatch: true,
    };

    // Cache for 24 hours
    await redis.setex(cacheKey, 86400, JSON.stringify(result));

    return result;
  }

  /**
   * Get cup volume from cup letter and region
   */
  getCupVolume(regionCode: string, cupLetter: string): number {
    const progression = CUP_PROGRESSIONS[regionCode];
    if (!progression) {
      throw new Error(`Invalid region code: ${regionCode}`);
    }

    const volume = progression.indexOf(cupLetter);
    if (volume === -1) {
      throw new Error(
        `Invalid cup letter '${cupLetter}' for region ${regionCode}`
      );
    }

    return volume + 1; // Return 1-based volume
  }

  /**
   * Get cup letter from cup volume and region
   */
  getCupLetter(regionCode: string, cupVolume: number): string | null {
    const progression = CUP_PROGRESSIONS[regionCode];
    if (!progression) {
      throw new Error(`Invalid region code: ${regionCode}`);
    }

    // Convert 1-based volume to 0-based index
    const index = cupVolume - 1;

    if (index < 0 || index >= progression.length) {
      return null;
    }

    return progression[index];
  }

  /**
   * Validate if a cup letter exists in a region
   */
  isValidCupLetter(regionCode: string, cupLetter: string): boolean {
    const progression = CUP_PROGRESSIONS[regionCode];
    return progression ? progression.includes(cupLetter) : false;
  }

  /**
   * Get cup progression info for a specific cup
   */
  getCupProgressionInfo(
    regionCode: string,
    cupLetter: string
  ): CupProgressionInfo | null {
    const progression = CUP_PROGRESSIONS[regionCode];
    if (!progression) return null;

    const index = progression.indexOf(cupLetter);
    if (index === -1) return null;

    return {
      regionCode,
      cupLetter,
      cupVolume: index + 1,
      index,
      nextCup: progression[index + 1] || null,
      previousCup: progression[index - 1] || null,
    };
  }

  /**
   * Get full cup progression for a region
   */
  getRegionCupProgression(regionCode: string): string[] {
    const progression = CUP_PROGRESSIONS[regionCode];
    if (!progression) {
      throw new Error(`Invalid region code: ${regionCode}`);
    }
    return [...progression]; // Return copy
  }

  /**
   * Convert full size with band and cup
   */
  async convertFullSize(params: {
    fromRegion: string;
    toRegion: string;
    bandSize: number; // In cm (normalized)
    cupLetter: string;
  }): Promise<{
    fromSize: string;
    toSize: string;
    toBand: number;
    toCupLetter: string;
  } | null> {
    const { fromRegion, toRegion, bandSize, cupLetter } = params;

    // Convert cup letter
    const cupConversion = await this.convertCupLetter({
      fromRegion,
      toRegion,
      cupLetter,
    });

    if (!cupConversion) return null;

    // Band size conversion (cm to inches or vice versa)
    const toBand = this.convertBandSize(bandSize, fromRegion, toRegion);

    // Format display sizes
    const fromBandDisplay = this.formatBandSize(bandSize, fromRegion);
    const toBandDisplay = this.formatBandSize(toBand, toRegion);

    return {
      fromSize: `${fromBandDisplay}${cupLetter}`,
      toSize: `${toBandDisplay}${cupConversion.toCupLetter}`,
      toBand,
      toCupLetter: cupConversion.toCupLetter,
    };
  }

  /**
   * Seed cup progression map to database
   */
  async seedCupProgressionMap(): Promise<number> {
    let count = 0;

    for (const [regionCode, progression] of Object.entries(CUP_PROGRESSIONS)) {
      for (let i = 0; i < progression.length; i++) {
        await prisma.cupProgressionMap.upsert({
          where: {
            regionCode_cupVolume: {
              regionCode,
              cupVolume: i + 1,
            },
          },
          create: {
            regionCode,
            cupVolume: i + 1,
            cupLetter: progression[i],
            isStandard: true,
          },
          update: {
            cupLetter: progression[i],
          },
        });
        count++;
      }
    }

    console.log(`Seeded ${count} cup progression entries`);
    return count;
  }

  /**
   * Load cup progression from database
   * (Allows admin to customize progressions)
   */
  async loadCustomCupProgression(regionCode: string): Promise<string[]> {
    const maps = await prisma.cupProgressionMap.findMany({
      where: { regionCode, isStandard: true },
      orderBy: { cupVolume: 'asc' },
    });

    if (maps.length === 0) {
      // Fallback to hardcoded
      return this.getRegionCupProgression(regionCode);
    }

    return maps.map((m) => m.cupLetter);
  }

  /**
   * Get cup conversion matrix for all regions
   */
  async getConversionMatrix(cupVolume: number): Promise<Record<string, string>> {
    const matrix: Record<string, string> = {};

    for (const regionCode of Object.keys(CUP_PROGRESSIONS)) {
      const cupLetter = this.getCupLetter(regionCode, cupVolume);
      if (cupLetter) {
        matrix[regionCode] = cupLetter;
      }
    }

    return matrix;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Convert band size between regions
   */
  private convertBandSize(
    bandSizeCm: number,
    fromRegion: string,
    toRegion: string
  ): number {
    // US, UK use inches; others use cm
    const fromUsesInches = fromRegion === 'US' || fromRegion === 'UK';
    const toUsesInches = toRegion === 'US' || toRegion === 'UK';

    if (fromUsesInches && !toUsesInches) {
      // Convert inches to cm
      return Math.round(bandSizeCm * 2.54);
    } else if (!fromUsesInches && toUsesInches) {
      // Convert cm to inches
      return Math.round(bandSizeCm / 2.54);
    }

    return bandSizeCm; // No conversion needed
  }

  /**
   * Format band size for display
   */
  private formatBandSize(bandSizeCm: number, regionCode: string): string {
    const usesInches = regionCode === 'US' || regionCode === 'UK';

    if (usesInches) {
      const inches = Math.round(bandSizeCm / 2.54);
      return inches.toString();
    }

    return bandSizeCm.toString();
  }

  /**
   * Invalidate cup conversion cache
   */
  async invalidateCache(): Promise<void> {
    const keys = await redis.keys('cup-conversion:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate size string format
 */
export function parseSizeString(size: string): {
  band: number;
  cup: string;
} | null {
  const match = size.match(/^(\d+)([A-Z]+)$/i);
  if (!match) return null;

  return {
    band: parseInt(match[1]),
    cup: match[2].toUpperCase(),
  };
}

/**
 * Validate region code
 */
export function isValidRegionCode(code: string): boolean {
  return Object.keys(CUP_PROGRESSIONS).includes(code);
}

// Export singleton instance
export const cupProgressionService = new CupProgressionService();

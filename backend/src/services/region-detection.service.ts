// @ts-nocheck - Old service, not part of Size System V2
/**
 * REGION DETECTION SERVICE
 *
 * Automatically detect user's region based on multiple signals
 *
 * Priority order:
 * 1. User's saved preference (from profile)
 * 2. Session/cookie preference
 * 3. Accept-Language header
 * 4. IP geolocation
 * 5. Default to US
 */

import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
import geoip from 'geoip-lite';

const prisma = new PrismaClient();

// Region code mapping
const COUNTRY_TO_REGION: Record<string, string> = {
  // United States
  US: 'US',

  // United Kingdom
  GB: 'UK',

  // European Union
  AT: 'EU', // Austria
  BE: 'EU', // Belgium
  BG: 'EU', // Bulgaria
  HR: 'EU', // Croatia
  CY: 'EU', // Cyprus
  CZ: 'EU', // Czech Republic
  DK: 'EU', // Denmark
  EE: 'EU', // Estonia
  FI: 'EU', // Finland
  DE: 'EU', // Germany
  GR: 'EU', // Greece
  HU: 'EU', // Hungary
  IE: 'EU', // Ireland
  IT: 'EU', // Italy
  LV: 'EU', // Latvia
  LT: 'EU', // Lithuania
  LU: 'EU', // Luxembourg
  MT: 'EU', // Malta
  NL: 'EU', // Netherlands
  PL: 'EU', // Poland
  PT: 'EU', // Portugal
  RO: 'EU', // Romania
  SK: 'EU', // Slovakia
  SI: 'EU', // Slovenia
  ES: 'EU', // Spain
  SE: 'EU', // Sweden

  // France (separate from EU for sizing)
  FR: 'FR',

  // Australia
  AU: 'AU',

  // Japan
  JP: 'JP',

  // Vietnam
  VN: 'VN',
};

// Language to region mapping
const LANGUAGE_TO_REGION: Record<string, string> = {
  'en-US': 'US',
  'en-GB': 'UK',
  'en-AU': 'AU',
  'fr-FR': 'FR',
  'fr-BE': 'EU',
  'de-DE': 'EU',
  'de-AT': 'EU',
  'it-IT': 'EU',
  'es-ES': 'EU',
  'ja-JP': 'JP',
  'vi-VN': 'VN',
};

export interface RegionDetectionResult {
  regionCode: string;
  regionName: string;
  currency: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'user_preference' | 'session' | 'language' | 'geoip' | 'default';
  lengthUnit: 'in' | 'cm';
  weightUnit: 'lb' | 'kg';
}

export class RegionDetectionService {
  /**
   * Detect user's region from request
   */
  async detectRegion(req: Request, userId?: number): Promise<RegionDetectionResult> {
    let regionCode: string | null = null;
    let source: RegionDetectionResult['source'] = 'default';
    let confidence: RegionDetectionResult['confidence'] = 'low';

    // 1. Check user's saved preference (highest priority)
    if (userId) {
      const userPreference = await prisma.userPreference.findUnique({
        where: { userId },
      });

      if (userPreference?.preferredRegion) {
        regionCode = userPreference.preferredRegion;
        source = 'user_preference';
        confidence = 'high';
      }
    }

    // 2. Check session/cookie preference
    if (!regionCode && req.session?.region) {
      regionCode = req.session.region as string;
      source = 'session';
      confidence = 'high';
    }

    // 3. Check Accept-Language header
    if (!regionCode) {
      const language = req.headers['accept-language'];
      if (language) {
        const primaryLang = this.parsePrimaryLanguage(language);
        regionCode = LANGUAGE_TO_REGION[primaryLang] || null;
        if (regionCode) {
          source = 'language';
          confidence = 'medium';
        }
      }
    }

    // 4. IP Geolocation
    if (!regionCode) {
      const ip = this.getClientIP(req);
      if (ip) {
        const geo = geoip.lookup(ip);
        if (geo) {
          regionCode = COUNTRY_TO_REGION[geo.country] || null;
          if (regionCode) {
            source = 'geoip';
            confidence = 'medium';
          }
        }
      }
    }

    // 5. Default to US
    if (!regionCode) {
      regionCode = 'US';
      source = 'default';
      confidence = 'low';
    }

    // Get region details
    const region = await prisma.region.findUnique({
      where: { code: regionCode },
    });

    if (!region) {
      // Fallback to US
      const defaultRegion = await prisma.region.findUnique({
        where: { code: 'US' },
      });

      return {
        regionCode: 'US',
        regionName: defaultRegion?.name || 'United States',
        currency: defaultRegion?.currency || 'USD',
        confidence: 'low',
        source: 'default',
        lengthUnit: 'in',
        weightUnit: 'lb',
      };
    }

    // Determine units
    const lengthUnit = this.getLengthUnit(regionCode);
    const weightUnit = this.getWeightUnit(regionCode);

    return {
      regionCode: region.code,
      regionName: region.name,
      currency: region.currency,
      confidence,
      source,
      lengthUnit,
      weightUnit,
    };
  }

  /**
   * Get user's preferred measurement units
   */
  async getUserPreferredUnits(userId: number): Promise<{
    length: 'in' | 'cm';
    weight: 'lb' | 'kg';
  }> {
    const userPreference = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (userPreference?.preferredLengthUnit && userPreference?.preferredWeightUnit) {
      return {
        length: userPreference.preferredLengthUnit as 'in' | 'cm',
        weight: userPreference.preferredWeightUnit as 'lb' | 'kg',
      };
    }

    // Fallback to region defaults
    const region = await this.detectRegion({} as Request, userId);

    return {
      length: region.lengthUnit,
      weight: region.weightUnit,
    };
  }

  /**
   * Update user's region preference
   */
  async updateUserRegionPreference(
    userId: number,
    regionCode: string
  ): Promise<void> {
    await prisma.userPreference.upsert({
      where: { userId },
      update: {
        preferredRegion: regionCode,
        preferredLengthUnit: this.getLengthUnit(regionCode),
        preferredWeightUnit: this.getWeightUnit(regionCode),
      },
      create: {
        userId,
        preferredRegion: regionCode,
        preferredLengthUnit: this.getLengthUnit(regionCode),
        preferredWeightUnit: this.getWeightUnit(regionCode),
      },
    });
  }

  /**
   * Get all available regions
   */
  async getAvailableRegions(): Promise<Array<{
    code: string;
    name: string;
    currency: string;
    lengthUnit: 'in' | 'cm';
    weightUnit: 'lb' | 'kg';
  }>> {
    const regions = await prisma.region.findMany({
      where: { isActive: true },
      orderBy: { priority: 'asc' },
    });

    return regions.map((r) => ({
      code: r.code,
      name: r.name,
      currency: r.currency,
      lengthUnit: this.getLengthUnit(r.code),
      weightUnit: this.getWeightUnit(r.code),
    }));
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Parse primary language from Accept-Language header
   */
  private parsePrimaryLanguage(acceptLanguage: string): string {
    // Example: "en-US,en;q=0.9,vi;q=0.8"
    const languages = acceptLanguage.split(',');
    if (languages.length === 0) return '';

    const primaryLang = languages[0].split(';')[0].trim();
    return primaryLang;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string | null {
    // Check various headers (CloudFlare, nginx, etc.)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',');
      return ips[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return realIP as string;
    }

    const cfConnectingIP = req.headers['cf-connecting-ip'];
    if (cfConnectingIP) {
      return cfConnectingIP as string;
    }

    return req.socket.remoteAddress || null;
  }

  /**
   * Get length unit for region
   */
  private getLengthUnit(regionCode: string): 'in' | 'cm' {
    // US, UK use inches; rest use cm
    return regionCode === 'US' || regionCode === 'UK' ? 'in' : 'cm';
  }

  /**
   * Get weight unit for region
   */
  private getWeightUnit(regionCode: string): 'lb' | 'kg' {
    // US uses pounds; rest use kg
    return regionCode === 'US' ? 'lb' : 'kg';
  }
}

// Export singleton instance
export const regionDetectionService = new RegionDetectionService();

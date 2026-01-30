/**
 * TYPE DEFINITIONS FOR SIZE SYSTEM V2
 *
 * Sister Sizing, Cup Progression, and Brand Fit features
 */

// ============================================
// SISTER SIZING TYPES
// ============================================

export interface SisterSize {
  size: string;
  universalCode: string;
  bandSize: number; // in cm
  cupVolume: number; // 1-20
  bandDifference: number; // -5 for sister down, +5 for sister up
  regionCode: string;
}

export interface SisterSizeResult {
  original: SisterSize;
  sisterDown: SisterSize | null;
  sisterUp: SisterSize | null;
}

export interface SisterSizeAlternative {
  size: string;
  universalCode: string;
  type: 'SISTER_DOWN' | 'SISTER_UP';
  stock: number;
  fitNote: string;
  bandDifference: number;
}

export interface SisterSizeRecommendationResult {
  isAvailable: boolean;
  requestedSize: string;
  currentStock: number;
  alternatives: SisterSizeAlternative[];
  recommendationId?: string; // For tracking acceptance
}

// ============================================
// CUP PROGRESSION TYPES
// ============================================

export type RegionCode = 'US' | 'UK' | 'EU' | 'FR' | 'AU' | 'JP' | 'VN';

export interface CupConversionResult {
  fromRegion: RegionCode;
  toRegion: RegionCode;
  fromCupLetter: string;
  toCupLetter: string;
  cupVolume: number;
}

export interface CupProgressionInfo {
  regionCode: RegionCode;
  cupLetter: string;
  cupVolume: number;
  nextCup: string | null;
  previousCup: string | null;
  isFirstCup: boolean;
  isLastCup: boolean;
}

export interface ConversionMatrix {
  cupVolume: number;
  matrix: Record<RegionCode, string>;
}

// ============================================
// BRAND FIT TYPES
// ============================================

export type FitType = 'TRUE_TO_SIZE' | 'RUNS_SMALL' | 'RUNS_LARGE';

export interface BrandFitProfile {
  brandId: string;
  brandName: string;
  fitType: FitType;
  bandAdjustment: number; // -1, 0, or 1
  cupAdjustment: number; // -1, 0, or 1
  fitNotes: string | null;
  confidence: number; // 0-100
  totalFeedback: number;
}

export interface SizeAdjustmentResult {
  brandId: string;
  brandName: string;
  originalSize: string;
  recommendedSize: string;
  fitType: FitType;
  fitNote: string;
  confidence: number;
}

export interface BrandFitFeedback {
  brandId: string;
  productId: number;
  normalSize: string; // Size they normally wear
  boughtSize: string; // Size they actually bought
  fitRating: number; // 1-5: 1=too small, 3=perfect, 5=too large
  fitComment?: string;
}

export interface BrandFitStats {
  brandId: string;
  totalFeedback: number;
  averageFitRating: number;
  fitDistribution: {
    tooSmall: number; // rating 1-2
    perfect: number; // rating 3
    tooLarge: number; // rating 4-5
  };
  confidence: number;
}

// ============================================
// UI COMPONENT PROPS
// ============================================

export interface SisterSizeAlertProps {
  productId: number;
  requestedSize: string;
  regionCode: RegionCode;
  onSizeSelect: (size: string) => void;
}

export interface BrandFitNoticeProps {
  brandId: string;
  userNormalSize?: string;
  regionCode: RegionCode;
  onSizeRecommended?: (recommendedSize: string) => void;
}

export interface RegionSwitcherProps {
  currentRegion: RegionCode;
  onRegionChange: (region: RegionCode) => void;
  className?: string;
}

export interface SizeChartConversionProps {
  selectedSize?: string;
  regionCode: RegionCode;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface SisterSizeApiResponse {
  original: SisterSize;
  sisterDown: SisterSize | null;
  sisterUp: SisterSize | null;
}

export interface AlternativesApiResponse {
  isAvailable: boolean;
  requestedSize: string;
  currentStock: number;
  alternatives: SisterSizeAlternative[];
  recommendationId?: string;
}

// ============================================
// REGION & SIZE PREFERENCE TYPES
// ============================================

export interface RegionPreference {
  regionCode: RegionCode;
  unitSystem: 'metric' | 'imperial';
  displayName: string;
}

export const REGION_PREFERENCES: Record<RegionCode, RegionPreference> = {
  US: { regionCode: 'US', unitSystem: 'imperial', displayName: 'United States' },
  UK: { regionCode: 'UK', unitSystem: 'imperial', displayName: 'United Kingdom' },
  EU: { regionCode: 'EU', unitSystem: 'metric', displayName: 'Europe' },
  FR: { regionCode: 'FR', unitSystem: 'metric', displayName: 'France' },
  AU: { regionCode: 'AU', unitSystem: 'metric', displayName: 'Australia' },
  JP: { regionCode: 'JP', unitSystem: 'metric', displayName: 'Japan' },
  VN: { regionCode: 'VN', unitSystem: 'metric', displayName: 'Việt Nam' },
};

/**
 * API CLIENT FOR SIZE SYSTEM V2
 *
 * Handles all API calls to Size System V2 backend endpoints
 */

import axios from 'axios';
import type {
  ApiResponse,
  SisterSizeApiResponse,
  AlternativesApiResponse,
  CupConversionResult,
  ConversionMatrix,
  SizeAdjustmentResult,
  BrandFitProfile,
  BrandFitFeedback,
  BrandFitStats,
  RegionCode,
} from '@/types/size-system-v2';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ============================================
// SISTER SIZING API
// ============================================

/**
 * Get sister sizes for a given size (universal code)
 */
export async function getSisterSizes(
  universalCode: string
): Promise<SisterSizeApiResponse> {
  const response = await axios.get<ApiResponse<SisterSizeApiResponse>>(
    `${API_BASE_URL}/api/sizes/sister/${universalCode}`
  );
  return response.data.data;
}

/**
 * Get available sister sizes when requested size is out of stock
 */
export async function getAvailableSisterSizes(
  productId: number,
  requestedSize: string,
  regionCode: RegionCode
): Promise<AlternativesApiResponse> {
  const response = await axios.get<ApiResponse<AlternativesApiResponse>>(
    `${API_BASE_URL}/api/products/${productId}/sizes/alternatives`,
    {
      params: { requestedSize, regionCode },
    }
  );
  return response.data.data;
}

/**
 * Accept a sister size recommendation (tracking)
 */
export async function acceptSisterSizeRecommendation(
  recommendationId: string,
  userId?: number
): Promise<void> {
  await axios.post(`${API_BASE_URL}/api/sizes/sister/accept`, {
    recommendationId,
    userId,
  });
}

// ============================================
// CUP PROGRESSION API
// ============================================

/**
 * Convert cup letter between regions
 */
export async function convertCupLetter(
  fromRegion: RegionCode,
  toRegion: RegionCode,
  cupLetter: string
): Promise<CupConversionResult> {
  const response = await axios.post<ApiResponse<CupConversionResult>>(
    `${API_BASE_URL}/api/sizes/cup/convert`,
    { fromRegion, toRegion, cupLetter }
  );
  return response.data.data;
}

/**
 * Get cup progression for a region
 */
export async function getCupProgression(
  regionCode: RegionCode
): Promise<string[]> {
  const response = await axios.get<ApiResponse<{ progression: string[] }>>(
    `${API_BASE_URL}/api/sizes/cup/progression/${regionCode}`
  );
  return response.data.data.progression;
}

/**
 * Get conversion matrix for a cup volume
 */
export async function getCupConversionMatrix(
  cupVolume: number
): Promise<ConversionMatrix> {
  const response = await axios.get<ApiResponse<ConversionMatrix>>(
    `${API_BASE_URL}/api/sizes/cup/matrix/${cupVolume}`
  );
  return response.data.data;
}

// ============================================
// BRAND FIT API
// ============================================

/**
 * Get recommended size for a brand (with fit adjustment)
 */
export async function getBrandFitAdjustment(
  brandId: string,
  userNormalSize: string,
  regionCode: RegionCode
): Promise<SizeAdjustmentResult> {
  const response = await axios.post<ApiResponse<SizeAdjustmentResult>>(
    `${API_BASE_URL}/api/brands/fit/adjust`,
    { brandId, userNormalSize, regionCode }
  );
  return response.data.data;
}

/**
 * Get brand fit profile
 */
export async function getBrandFitProfile(
  brandId: string
): Promise<BrandFitProfile> {
  const response = await axios.get<ApiResponse<BrandFitProfile>>(
    `${API_BASE_URL}/api/brands/${brandId}/fit`
  );
  return response.data.data;
}

/**
 * Submit brand fit feedback
 */
export async function submitBrandFitFeedback(
  feedback: BrandFitFeedback
): Promise<void> {
  await axios.post(`${API_BASE_URL}/api/brands/fit/feedback`, feedback);
}

/**
 * Get brand fit statistics
 */
export async function getBrandFitStats(
  brandId: string
): Promise<BrandFitStats> {
  const response = await axios.get<ApiResponse<BrandFitStats>>(
    `${API_BASE_URL}/api/brands/${brandId}/fit/stats`
  );
  return response.data.data;
}

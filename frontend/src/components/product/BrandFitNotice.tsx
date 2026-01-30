"use client";

/**
 * BRAND FIT NOTICE COMPONENT
 *
 * Displays when a brand runs small/large
 * Recommends size adjustment based on brand fit profile
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, Loader2 } from 'lucide-react';
import { getBrandFitAdjustment } from '@/lib/sizeSystemApi';
import type {
  SizeAdjustmentResult,
  RegionCode,
  FitType
} from '@/types/size-system-v2';

interface BrandFitNoticeProps {
  brandId?: string; // Make it optional
  userNormalSize?: string;
  regionCode: RegionCode;
  onSizeRecommended?: (recommendedSize: string) => void;
  className?: string;
}

const FIT_TYPE_CONFIG: Record<FitType, {
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  badgeColor: string;
}> = {
  RUNS_SMALL: {
    icon: '📏',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-200',
    badgeColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
  RUNS_LARGE: {
    icon: '📐',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-800 dark:text-blue-200',
    badgeColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  TRUE_TO_SIZE: {
    icon: '✓',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-800 dark:text-green-200',
    badgeColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  },
};

export default function BrandFitNotice({
  brandId,
  userNormalSize,
  regionCode,
  onSizeRecommended,
  className = '',
}: BrandFitNoticeProps) {
  const [data, setData] = useState<SizeAdjustmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!brandId || !userNormalSize) return;

    const fetchFitAdjustment = async () => {
      setLoading(true);
      try {
        const result = await getBrandFitAdjustment(brandId, userNormalSize, regionCode);
        setData(result);

        // Notify parent if size changed
        if (result.recommendedSize !== result.originalSize && onSizeRecommended) {
          onSizeRecommended(result.recommendedSize);
        }
      } catch (error) {
        console.error('Error fetching brand fit:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFitAdjustment();
  }, [brandId, userNormalSize, regionCode, onSizeRecommended]);

  if (loading) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Checking brand fit...
          </span>
        </div>
      </div>
    );
  }

  // Don't show for TRUE_TO_SIZE
  if (!data || data.fitType === 'TRUE_TO_SIZE') return null;

  const config = FIT_TYPE_CONFIG[data.fitType];

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 shrink-0 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center text-2xl">
          {config.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className={`w-4 h-4 ${config.textColor}`} />
            <span className={`text-sm font-bold uppercase ${config.textColor}`}>
              BRAND FIT NOTICE
            </span>
          </div>
          <p className={`text-lg font-bold ${config.textColor}`}>
            This brand runs {data.fitType === 'RUNS_SMALL' ? 'small' : 'large'}
          </p>
        </div>
      </div>

      {/* Size Recommendation */}
      {data.recommendedSize !== data.originalSize && (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Your normal size:
            </span>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              {data.originalSize}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              We recommend:
            </span>
            <span className={`text-xl font-bold ${config.badgeColor} px-3 py-1 rounded-lg`}>
              {data.recommendedSize}
            </span>
          </div>
        </div>
      )}

      {/* Fit Note */}
      <p className={`text-sm ${config.textColor} mb-3`}>
        {data.fitNote}
      </p>

      {/* Confidence */}
      {data.confidence >= 70 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                data.confidence >= 90
                  ? 'bg-green-500'
                  : data.confidence >= 70
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${data.confidence}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {data.confidence}% confident
          </span>
        </div>
      )}

      {/* Show Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 text-sm ${config.textColor} hover:underline`}
      >
        <Info className="w-4 h-4" />
        <span>{showDetails ? 'Hide details' : 'Learn more'}</span>
      </button>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            <strong className="text-gray-900 dark:text-white">{data.brandName}</strong> is known for running{' '}
            {data.fitType === 'RUNS_SMALL' ? 'smaller' : 'larger'} than standard sizes.
          </p>
          <p>
            Based on {data.confidence >= 70 ? 'numerous' : 'some'} customer reviews, we recommend{' '}
            {data.fitType === 'RUNS_SMALL' ? 'sizing up' : 'sizing down'} for the best fit.
          </p>
        </div>
      )}
    </div>
  );
}

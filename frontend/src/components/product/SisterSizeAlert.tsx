"use client";

/**
 * SISTER SIZE ALERT COMPONENT
 *
 * Displays when requested size is out of stock
 * Shows sister size alternatives with same cup volume
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { getAvailableSisterSizes, acceptSisterSizeRecommendation } from '@/lib/sizeSystemApi';
import type {
  SisterSizeAlternative,
  AlternativesApiResponse,
  RegionCode
} from '@/types/size-system-v2';

interface SisterSizeAlertProps {
  productId: number;
  requestedSize: string;
  regionCode: RegionCode;
  onSizeSelect: (size: string, universalCode: string) => void;
  className?: string;
}

export default function SisterSizeAlert({
  productId,
  requestedSize,
  regionCode,
  onSizeSelect,
  className = '',
}: SisterSizeAlertProps) {
  const [data, setData] = useState<AlternativesApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLearnMore, setShowLearnMore] = useState(false);

  useEffect(() => {
    const fetchAlternatives = async () => {
      setLoading(true);
      try {
        const result = await getAvailableSisterSizes(productId, requestedSize, regionCode);
        setData(result);
      } catch (error) {
        console.error('Error fetching sister sizes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlternatives();
  }, [productId, requestedSize, regionCode]);

  const handleSizeSelect = async (alternative: SisterSizeAlternative) => {
    // Track acceptance
    if (data?.recommendationId) {
      try {
        await acceptSisterSizeRecommendation(data.recommendationId);
      } catch (error) {
        console.error('Error tracking recommendation:', error);
      }
    }

    // Notify parent
    onSizeSelect(alternative.size, alternative.universalCode);
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    );
  }

  // Don't show if size is available
  if (!data || data.isAvailable) return null;

  // Don't show if no alternatives
  if (data.alternatives.length === 0) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              SIZE {requestedSize.toUpperCase()} IS OUT OF STOCK
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              Unfortunately, we don't have alternative sizes available right now. Please check back later or contact us.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            SIZE {requestedSize.toUpperCase()} IS OUT OF STOCK
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Try these sister sizes with the same cup volume:
          </p>
        </div>
      </div>

      {/* Sister Size Alternatives */}
      <div className="space-y-3">
        {data.alternatives.map((alternative) => (
          <div
            key={alternative.size}
            className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {alternative.size}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    alternative.type === 'SISTER_DOWN'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  }`}>
                    {alternative.type === 'SISTER_DOWN' ? 'TIGHTER BAND' : 'LOOSER BAND'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {alternative.fitNote}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {alternative.stock} in stock
                </p>
              </div>
              <button
                onClick={() => handleSizeSelect(alternative)}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition"
              >
                Select
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Learn More */}
      <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800">
        <button
          onClick={() => setShowLearnMore(!showLearnMore)}
          className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition"
        >
          <Info className="w-4 h-4" />
          <span>What is sister sizing?</span>
          {showLearnMore ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showLearnMore && (
          <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">
              <strong className="text-gray-900 dark:text-white">Sister sizes</strong> have the same cup volume but different band sizes.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Sister Down</strong> (e.g., 32D): Tighter band, same cup volume
              </li>
              <li>
                <strong>Sister Up</strong> (e.g., 36B): Looser band, same cup volume
              </li>
            </ul>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              Example: 34C = 32D = 36B (all have the same cup volume)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

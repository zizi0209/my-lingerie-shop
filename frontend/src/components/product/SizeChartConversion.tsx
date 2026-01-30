"use client";

/**
 * SIZE CHART CONVERSION TAB
 *
 * Displays international size conversions within Size Guide Modal
 * Shows US, UK, EU equivalents for bra sizes with cup progression
 */

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getCupConversionMatrix } from '@/lib/sizeSystemApi';
import type { ConversionMatrix, RegionCode } from '@/types/size-system-v2';

interface SizeChartConversionProps {
  selectedSize?: string; // e.g., "34C"
  regionCode: RegionCode;
  className?: string;
}

// Hardcoded cup volume mapping for common sizes
const COMMON_SIZES: { size: string; bandCm: number; cupVolume: number }[] = [
  { size: '32A', bandCm: 81, cupVolume: 4 },
  { size: '32B', bandCm: 81, cupVolume: 5 },
  { size: '32C', bandCm: 81, cupVolume: 6 },
  { size: '32D', bandCm: 81, cupVolume: 7 },
  { size: '32DD', bandCm: 81, cupVolume: 6 },
  { size: '34A', bandCm: 86, cupVolume: 4 },
  { size: '34B', bandCm: 86, cupVolume: 5 },
  { size: '34C', bandCm: 86, cupVolume: 6 },
  { size: '34D', bandCm: 86, cupVolume: 7 },
  { size: '34DD', bandCm: 86, cupVolume: 6 },
  { size: '36A', bandCm: 91, cupVolume: 4 },
  { size: '36B', bandCm: 91, cupVolume: 5 },
  { size: '36C', bandCm: 91, cupVolume: 6 },
  { size: '36D', bandCm: 91, cupVolume: 7 },
];

export default function SizeChartConversion({
  selectedSize,
  regionCode,
  className = '',
}: SizeChartConversionProps) {
  const [conversions, setConversions] = useState<Record<string, ConversionMatrix>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversions = async () => {
      setLoading(true);
      setError(null);

      try {
        const uniqueVolumes = [...new Set(COMMON_SIZES.map(s => s.cupVolume))];
        const conversionsMap: Record<string, ConversionMatrix> = {};

        // Fetch conversion matrices for all cup volumes
        await Promise.all(
          uniqueVolumes.map(async (volume) => {
            try {
              const matrix = await getCupConversionMatrix(volume);
              conversionsMap[volume] = matrix;
            } catch (err) {
              console.error(`Error fetching conversion for volume ${volume}:`, err);
            }
          })
        );

        setConversions(conversionsMap);
      } catch (err) {
        setError('Failed to load size conversions');
        console.error('Error fetching conversions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversions();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}>
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Introduction */}
      <div className="mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          International bra size conversions. Your current region is <strong>{regionCode}</strong>.
        </p>
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>⚠️ Important:</strong> Cup sizes are NOT mathematically equivalent!{' '}
            US DD = EU E, but UK uses different progression. Always use this conversion table.
          </p>
        </div>
      </div>

      {/* Conversion Table */}
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 sticky left-0 bg-gray-100 dark:bg-gray-800">
                Band (in)
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                US Size
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                UK Size
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                EU Size
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                FR Size
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {COMMON_SIZES.map((sizeInfo) => {
              const isSelected = selectedSize === sizeInfo.size;
              const matrix = conversions[sizeInfo.cupVolume];

              if (!matrix) return null;

              // Parse band from size (e.g., "34C" -> "34")
              const band = sizeInfo.size.replace(/[A-Z]+$/, '');
              const euBand = Math.round(sizeInfo.bandCm / 5) * 5; // Convert to EU band (75, 80, 85, etc.)

              return (
                <tr
                  key={sizeInfo.size}
                  className={`transition ${
                    isSelected
                      ? 'bg-black/5 dark:bg-white/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <td
                    className={`px-4 py-3 whitespace-nowrap sticky left-0 font-semibold ${
                      isSelected
                        ? 'text-black dark:text-white bg-black/5 dark:bg-white/10 ring-2 ring-black dark:ring-white ring-inset'
                        : 'text-gray-900 dark:text-white bg-white dark:bg-gray-900'
                    }`}
                  >
                    {band}"
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    <span className={isSelected ? 'font-bold text-black dark:text-white' : ''}>
                      {band}{matrix.matrix.US}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {band}{matrix.matrix.UK}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {euBand}{matrix.matrix.EU}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {euBand}{matrix.matrix.FR}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cup Progression Explanation */}
      <div className="mt-6 space-y-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-2">
            Understanding Cup Progressions
          </h4>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p>
              <strong>US:</strong> A, B, C, D, <span className="underline">DD</span>, <span className="underline">DDD</span>, G, H
            </p>
            <p>
              <strong>UK:</strong> A, B, C, D, <span className="underline">DD</span>, <span className="underline">E</span>, F, FF
            </p>
            <p>
              <strong>EU/FR:</strong> A, B, C, D, <span className="underline">E</span>, <span className="underline">F</span>, G, H
            </p>
          </div>
          <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
            Notice: US uses "DD" and "DDD", UK uses "E" and "FF", EU uses "E" and "F" for the same cup volumes!
          </p>
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
            Common Conversion Mistakes
          </h4>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-red-500 shrink-0">✗</span>
              <span>US 34DD ≠ EU 34DD (EU doesn't have DD!)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">✓</span>
              <span>US 34DD = EU 75E (correct conversion)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 shrink-0">✗</span>
              <span>UK 34E ≠ US 34E (US uses DDD, not E!)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">✓</span>
              <span>UK 34E = US 34DDD (correct conversion)</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

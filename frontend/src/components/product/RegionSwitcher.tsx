"use client";

/**
 * REGION SWITCHER COMPONENT
 *
 * Allows users to switch between regional size standards (US, UK, EU, etc.)
 * Used in size charts and product pages
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import type { RegionCode } from '@/types/size-system-v2';
import { REGION_PREFERENCES } from '@/types/size-system-v2';

interface RegionSwitcherProps {
  currentRegion: RegionCode;
  onRegionChange: (region: RegionCode) => void;
  className?: string;
  availableRegions?: RegionCode[];
}

const DEFAULT_REGIONS: RegionCode[] = ['VN', 'US', 'UK', 'EU', 'FR', 'AU', 'JP'];

export default function RegionSwitcher({
  currentRegion,
  onRegionChange,
  className = '',
  availableRegions = DEFAULT_REGIONS,
}: RegionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleRegionSelect = (region: RegionCode) => {
    onRegionChange(region);
    setIsOpen(false);
  };

  const currentPref = REGION_PREFERENCES[currentRegion];

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        aria-label="Select region"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">Region:</span>
        <span className="font-semibold">{currentRegion}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Select size region
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {availableRegions.map((region) => {
              const pref = REGION_PREFERENCES[region];
              const isSelected = region === currentRegion;

              return (
                <button
                  key={region}
                  onClick={() => handleRegionSelect(region)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                    isSelected ? 'bg-gray-50 dark:bg-gray-800' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {region}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {pref.displayName}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {pref.unitSystem === 'imperial' ? 'Inches' : 'CM'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              💡 <strong>Tip:</strong> Choose your region to see sizes in your preferred format.
              This won't affect shipping location.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

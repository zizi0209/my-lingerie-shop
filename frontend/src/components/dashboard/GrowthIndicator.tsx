'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GrowthIndicatorProps {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export default function GrowthIndicator({
  value,
  percentage,
  trend,
  size = 'md',
  showValue = false,
  className = ''
}: GrowthIndicatorProps) {
  const colors = {
    up: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
    down: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
    neutral: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10'
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`inline-flex items-center gap-1 rounded-full font-semibold ${colors[trend]} ${sizes[size]} ${className}`}>
      <Icon size={iconSizes[size]} />
      <span>
        {percentage > 0 ? '+' : ''}{percentage}%
      </span>
      {showValue && (
        <span className="opacity-75">
          ({value > 0 ? '+' : ''}{value.toLocaleString('vi-VN')})
        </span>
      )}
    </div>
  );
}

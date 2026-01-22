'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

export type DatePreset = 
  | 'today' 
  | 'yesterday' 
  | 'last7days' 
  | 'last30days' 
  | 'thisMonth' 
  | 'lastMonth' 
  | 'thisYear' 
  | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: DatePreset;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  compareEnabled: boolean;
  onCompareChange: (enabled: boolean) => void;
  className?: string;
}

const PRESETS: Array<{
  value: DatePreset;
  label: string;
  icon: string;
  recommended?: boolean;
}> = [
  { value: 'today', label: 'Hôm nay', icon: '📅' },
  { value: 'yesterday', label: 'Hôm qua', icon: '📆' },
  { value: 'last7days', label: '7 ngày qua', icon: '📊' },
  { value: 'last30days', label: '30 ngày qua', icon: '📈' },
  { value: 'thisMonth', label: 'Tháng này', icon: '🗓️', recommended: true },
  { value: 'lastMonth', label: 'Tháng trước', icon: '📋' },
  { value: 'thisYear', label: 'Năm nay', icon: '🎯' },
  { value: 'custom', label: 'Tùy chỉnh', icon: '⚙️' },
];

export default function DateRangePicker({
  value,
  onChange,
  compareEnabled,
  onCompareChange,
  className = ''
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>(value.preset || 'thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  };

  const getDateRangeFromPreset = (preset: DatePreset): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case 'today':
        return { startDate: today, endDate: now, preset: 'today' };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { startDate: yesterday, endDate: yesterdayEnd, preset: 'yesterday' };
      
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return { startDate: last7, endDate: now, preset: 'last7days' };
      
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return { startDate: last30, endDate: now, preset: 'last30days' };
      
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: monthStart, endDate: now, preset: 'thisMonth' };
      
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { startDate: lastMonthStart, endDate: lastMonthEnd, preset: 'lastMonth' };
      
      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { startDate: yearStart, endDate: now, preset: 'thisYear' };
      
      case 'custom':
        if (customStart && customEnd) {
          return {
            startDate: new Date(customStart),
            endDate: new Date(customEnd),
            preset: 'custom'
          };
        }
        // Fallback to last 7 days
        const fallbackLast7 = new Date(today);
        fallbackLast7.setDate(fallbackLast7.getDate() - 7);
        return { startDate: fallbackLast7, endDate: now, preset: 'custom' };
      
      default:
        const defaultStart = new Date(today);
        defaultStart.setDate(defaultStart.getDate() - 7);
        return { startDate: defaultStart, endDate: now, preset: 'last7days' };
    }
  };

  const handlePresetClick = (preset: DatePreset) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      const range = getDateRangeFromPreset(preset);
      onChange(range);
      setIsOpen(false);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const range: DateRange = {
        startDate: new Date(customStart),
        endDate: new Date(customEnd),
        preset: 'custom'
      };
      onChange(range);
      setIsOpen(false);
    }
  };

  const getLabel = (): string => {
    const preset = PRESETS.find(p => p.value === value.preset);
    if (preset && value.preset !== 'custom') {
      return preset.label;
    }
    return `${formatDate(value.startDate)} - ${formatDate(value.endDate)}`;
  };

  const getPreviousPeriodLabel = (): string => {
    const duration = value.endDate.getTime() - value.startDate.getTime();
    const previousEnd = new Date(value.startDate.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration);
    
    return `${formatDate(previousStart)} - ${formatDate(previousEnd)}`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <Calendar size={16} />
        <span>{getLabel()}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="absolute right-0 top-full mt-2 w-[400px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Chọn khoảng thời gian</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {/* Presets */}
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                    selectedPreset === preset.value
                      ? 'bg-primary-50 dark:bg-primary-500/10 border-2 border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'bg-slate-50 dark:bg-slate-700/50 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xl">{preset.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{preset.label}</span>
                      {preset.recommended && (
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          Khuyên dùng
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedPreset === preset.value && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}

              {/* Custom Date Inputs */}
              {selectedPreset === 'custom' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Từ ngày
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Đến ngày
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    onClick={handleCustomApply}
                    disabled={!customStart || !customEnd}
                    className="w-full py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    Áp dụng
                  </button>
                </div>
              )}
            </div>

            {/* Footer - Comparison Toggle */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareEnabled}
                  onChange={(e) => onCompareChange(e.target.checked)}
                  className="w-4 h-4 text-primary-500 border-slate-300 rounded focus:ring-primary-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    So sánh với kỳ trước
                  </span>
                  {compareEnabled && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sẽ so sánh với: {getPreviousPeriodLabel()}
                    </p>
                  )}
                </div>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Date Range Utilities for Dashboard Analytics

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

export interface ComparisonDateRange {
  current: DateRange;
  previous: DateRange;
}

/**
 * Lấy date range từ preset
 */
export function getDateRangeFromPreset(preset: DatePreset, customStart?: Date, customEnd?: Date): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return {
        startDate: today,
        endDate: now,
        preset: 'today'
      };
      
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return {
        startDate: yesterday,
        endDate: yesterdayEnd,
        preset: 'yesterday'
      };
      
    case 'last7days':
      const last7 = new Date(today);
      last7.setDate(last7.getDate() - 7);
      return {
        startDate: last7,
        endDate: now,
        preset: 'last7days'
      };
      
    case 'last30days':
      const last30 = new Date(today);
      last30.setDate(last30.getDate() - 30);
      return {
        startDate: last30,
        endDate: now,
        preset: 'last30days'
      };
      
    case 'thisMonth':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: monthStart,
        endDate: now,
        preset: 'thisMonth'
      };
      
    case 'lastMonth':
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
        preset: 'lastMonth'
      };
      
    case 'thisYear':
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: yearStart,
        endDate: now,
        preset: 'thisYear'
      };
      
    case 'custom':
      if (!customStart || !customEnd) {
        // Fallback to last 7 days
        const fallbackStart = new Date(today);
        fallbackStart.setDate(fallbackStart.getDate() - 7);
        return {
          startDate: fallbackStart,
          endDate: now,
          preset: 'custom'
        };
      }
      return {
        startDate: customStart,
        endDate: customEnd,
        preset: 'custom'
      };
      
    default:
      // Default to last 7 days
      const defaultStart = new Date(today);
      defaultStart.setDate(defaultStart.getDate() - 7);
      return {
        startDate: defaultStart,
        endDate: now,
        preset: 'last7days'
      };
  }
}

/**
 * Tính toán kỳ trước (previous period) để so sánh
 */
export function getPreviousPeriod(current: DateRange): DateRange {
  const duration = current.endDate.getTime() - current.startDate.getTime();
  const previousEnd = new Date(current.startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  
  return {
    startDate: previousStart,
    endDate: previousEnd
  };
}

/**
 * Tính toán % tăng trưởng
 */
export function calculateGrowth(current: number, previous: number): {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
} {
  if (previous === 0) {
    return {
      value: current,
      percentage: current > 0 ? 100 : 0,
      trend: current > 0 ? 'up' : 'neutral'
    };
  }
  
  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  
  return {
    value: diff,
    percentage: Math.round(percentage * 10) / 10,
    trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral'
  };
}

/**
 * Format date range thành label hiển thị
 */
export function formatDateRangeLabel(range: DateRange): string {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  switch (range.preset) {
    case 'today':
      return 'Hôm nay';
    case 'yesterday':
      return 'Hôm qua';
    case 'last7days':
      return '7 ngày qua';
    case 'last30days':
      return '30 ngày qua';
    case 'thisMonth':
      return 'Tháng này';
    case 'lastMonth':
      return 'Tháng trước';
    case 'thisYear':
      return 'Năm nay';
    case 'custom':
      return `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`;
    default:
      return `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`;
  }
}

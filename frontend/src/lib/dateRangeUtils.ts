// Date Range Utilities for Frontend
// Convert DateRange to period param for backward compatibility with backend

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset?: string;
}

/**
 * Convert DateRange to period param for backend API
 * Ensures consistent conversion across all dashboard pages
 */
export function dateRangeToPeriod(dateRange: DateRange): '24hours' | '7days' | '30days' | '90days' {
  const duration = dateRange.endDate.getTime() - dateRange.startDate.getTime();
  const days = Math.ceil(duration / (1000 * 60 * 60 * 24));
  
  // Map days to period
  if (days <= 1) return '24hours';
  if (days <= 7) return '7days';
  if (days <= 30) return '30days';
  return '90days';
}

/**
 * Format date range for display
 */
export function formatDateRange(dateRange: DateRange): string {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  switch (dateRange.preset) {
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
      return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
    default:
      return `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`;
  }
}

/**
 * Get duration in days
 */
export function getDurationInDays(dateRange: DateRange): number {
  const duration = dateRange.endDate.getTime() - dateRange.startDate.getTime();
  return Math.ceil(duration / (1000 * 60 * 60 * 24));
}

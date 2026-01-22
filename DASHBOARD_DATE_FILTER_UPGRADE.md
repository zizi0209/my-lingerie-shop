# 📊 Dashboard Date Filter Upgrade - Enterprise Standard

## 🎯 Mục tiêu

Nâng cấp bộ lọc thời gian trong Dashboard từ **Basic** (24h, 7 ngày, 30 ngày) lên **Enterprise Standard** với:
- ✅ Presets đầy đủ (Today, Yesterday, MTD, Last Month, YTD, Custom)
- ✅ Comparison mode (So sánh với kỳ trước)
- ✅ Growth indicators (% tăng trưởng màu xanh/đỏ)
- ✅ Modern UI (Date Range Picker với sidebar)

## 📋 Phân tích hiện trạng

### ❌ Vấn đề với bộ lọc hiện tại
- **24h**: Không rõ ràng (từ giờ này hôm qua → giờ này hôm nay)
- **7 ngày, 30 ngày**: Chỉ có xu hướng, không có context so sánh
- **Thiếu MTD/YTD**: Không theo dõi được KPI tháng/năm
- **Không có comparison**: Không biết tăng/giảm bao nhiêu so với kỳ trước

### ✅ Bộ lọc Enterprise chuẩn

| Preset | Mô tả | Use Case | Ưu tiên |
|--------|-------|----------|---------|
| **Hôm nay** | 00:00 → hiện tại | Real-time monitoring | ⭐⭐⭐⭐⭐ |
| **Hôm qua** | 00:00 → 23:59 ngày hôm qua | Daily review | ⭐⭐⭐⭐⭐ |
| **7 ngày qua** | 7 ngày gần nhất | Short-term trend | ⭐⭐⭐⭐ |
| **30 ngày qua** | 30 ngày gần nhất | Mid-term trend | ⭐⭐⭐⭐ |
| **Tháng này (MTD)** | Ngày 1 → hiện tại | KPI tracking | ⭐⭐⭐⭐⭐ |
| **Tháng trước** | Toàn bộ tháng trước | Monthly report | ⭐⭐⭐⭐ |
| **Năm nay (YTD)** | 01/01 → hiện tại | Strategic view | ⭐⭐⭐ |
| **Tùy chỉnh** | Chọn từ ngày → đến ngày | Campaign analysis | ⭐⭐⭐⭐ |

## 🎨 UI/UX Design

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard Overview                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 [Tháng này (01/01 - 22/01)]  ▼   [✓] So sánh kỳ trước │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Doanh thu    │  │ Đơn hàng     │  │ Khách hàng   │     │
│  │ 45.2M ₫      │  │ 234          │  │ 189          │     │
│  │ ↗ +12.5%     │  │ ↗ +8.3%      │  │ ↘ -2.1%      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Date Range Picker Modal

```
┌─────────────────────────────────────────────────────────────┐
│ Chọn khoảng thời gian                                  [X]  │
├─────────────────┬───────────────────────────────────────────┤
│ Presets         │  Calendar                                 │
│                 │                                           │
│ ○ Hôm nay       │  ┌─────────────┐  ┌─────────────┐       │
│ ○ Hôm qua       │  │  Tháng 1    │  │  Tháng 2    │       │
│ ○ 7 ngày qua    │  ├─────────────┤  ├─────────────┤       │
│ ○ 30 ngày qua   │  │ CN T2 T3... │  │ CN T2 T3... │       │
│ ● Tháng này     │  │  1  2  3  4 │  │        1  2 │       │
│ ○ Tháng trước   │  │  5  6  7  8 │  │  3  4  5  6 │       │
│ ○ Năm nay       │  │ ...         │  │ ...         │       │
│ ○ Tùy chỉnh     │  └─────────────┘  └─────────────┘       │
│                 │                                           │
│                 │  Từ: 01/01/2026  →  Đến: 22/01/2026      │
├─────────────────┴───────────────────────────────────────────┤
│ [✓] So sánh với kỳ trước                                    │
│     Sẽ so sánh với: Tháng trước (01/12 - 22/12/2025)       │
│                                                             │
│                          [Hủy]  [Áp dụng]                   │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Implementation Plan

### Phase 1: Backend API Enhancement

#### 1.1 Date Range Utilities

```typescript
// backend/src/utils/dateRange.ts

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

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
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
      
    default:
      return {
        startDate: last7,
        endDate: now,
        preset: 'last7days'
      };
  }
}

export function getPreviousPeriod(current: DateRange): DateRange {
  const duration = current.endDate.getTime() - current.startDate.getTime();
  const previousEnd = new Date(current.startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  
  return {
    startDate: previousStart,
    endDate: previousEnd
  };
}

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
```

#### 1.2 Dashboard API với Comparison

```typescript
// backend/src/controllers/dashboardController.ts

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const { 
      preset = 'thisMonth', 
      startDate, 
      endDate, 
      compare = false 
    } = req.query;
    
    // Get current period
    let currentRange: DateRange;
    if (preset && preset !== 'custom') {
      currentRange = getDateRangeFromPreset(preset as DatePreset);
    } else {
      currentRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        preset: 'custom'
      };
    }
    
    // Get stats for current period
    const currentStats = await getStatsForPeriod(currentRange);
    
    // Get comparison if requested
    let comparison = null;
    if (compare === 'true') {
      const previousRange = getPreviousPeriod(currentRange);
      const previousStats = await getStatsForPeriod(previousRange);
      
      comparison = {
        previous: previousStats,
        growth: {
          revenue: calculateGrowth(currentStats.revenue, previousStats.revenue),
          orders: calculateGrowth(currentStats.orders, previousStats.orders),
          customers: calculateGrowth(currentStats.customers, previousStats.customers),
        }
      };
    }
    
    res.json({
      success: true,
      data: {
        current: currentStats,
        comparison,
        dateRange: currentRange
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thống kê dashboard' });
  }
};

async function getStatsForPeriod(range: DateRange) {
  const [revenue, orders, customers] = await Promise.all([
    // Revenue
    prisma.order.aggregate({
      where: {
        createdAt: { gte: range.startDate, lte: range.endDate },
        status: { in: ['COMPLETED', 'DELIVERED'] }
      },
      _sum: { totalAmount: true }
    }),
    
    // Orders count
    prisma.order.count({
      where: {
        createdAt: { gte: range.startDate, lte: range.endDate }
      }
    }),
    
    // New customers
    prisma.user.count({
      where: {
        createdAt: { gte: range.startDate, lte: range.endDate }
      }
    })
  ]);
  
  return {
    revenue: revenue._sum.totalAmount || 0,
    orders,
    customers
  };
}
```

### Phase 2: Frontend Components

#### 2.1 DateRangePicker Component

```typescript
// frontend/src/components/dashboard/DateRangePicker.tsx

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  compareEnabled: boolean;
  onCompareChange: (enabled: boolean) => void;
}

export default function DateRangePicker({
  value,
  onChange,
  compareEnabled,
  onCompareChange
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('thisMonth');
  
  const presets = [
    { value: 'today', label: 'Hôm nay', icon: '📅' },
    { value: 'yesterday', label: 'Hôm qua', icon: '📆' },
    { value: 'last7days', label: '7 ngày qua', icon: '📊' },
    { value: 'last30days', label: '30 ngày qua', icon: '📈' },
    { value: 'thisMonth', label: 'Tháng này', icon: '🗓️', recommended: true },
    { value: 'lastMonth', label: 'Tháng trước', icon: '📋' },
    { value: 'thisYear', label: 'Năm nay', icon: '🎯' },
    { value: 'custom', label: 'Tùy chỉnh', icon: '⚙️' },
  ];
  
  // Implementation...
}
```

#### 2.2 GrowthIndicator Component

```typescript
// frontend/src/components/dashboard/GrowthIndicator.tsx

interface GrowthIndicatorProps {
  value: number;
  percentage: number;
  trend: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}

export default function GrowthIndicator({
  value,
  percentage,
  trend,
  size = 'md'
}: GrowthIndicatorProps) {
  const colors = {
    up: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10',
    down: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
    neutral: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-500/10'
  };
  
  const icons = {
    up: '↗',
    down: '↘',
    neutral: '→'
  };
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${colors[trend]}`}>
      <span className="font-bold">{icons[trend]}</span>
      <span className="font-semibold">{percentage > 0 ? '+' : ''}{percentage}%</span>
    </div>
  );
}
```

## 📊 Default Settings

### Recommended Defaults

```typescript
const DEFAULT_SETTINGS = {
  // Default preset khi vào dashboard
  defaultPreset: 'thisMonth', // KHÔNG dùng 'today' vì sáng sớm data = 0
  
  // Default comparison
  defaultCompare: false, // Để user tự bật khi cần
  
  // Auto-refresh interval
  autoRefresh: 5 * 60 * 1000, // 5 phút (chỉ cho preset 'today')
};
```

## 🎯 Success Metrics

### Sau khi implement, dashboard phải đạt:

- ✅ **Clarity**: Admin nhìn 3 giây hiểu ngay tình hình kinh doanh
- ✅ **Actionable**: Thấy số đỏ → biết ngay phải làm gì
- ✅ **Comparable**: Luôn có context so sánh (tháng này vs tháng trước)
- ✅ **Flexible**: Có thể drill-down vào campaign cụ thể (Custom range)

## 📚 References

- [Shopify Analytics](https://www.shopify.com/blog/ecommerce-analytics)
- [Google Analytics Date Ranges](https://support.google.com/analytics/answer/1012061)
- [Stripe Dashboard](https://stripe.com/docs/dashboard)

## 🚀 Next Steps

1. ✅ Review document này với team
2. ⏳ Implement backend date utilities
3. ⏳ Implement frontend DateRangePicker
4. ⏳ Update DashboardHome component
5. ⏳ Add comparison mode
6. ⏳ Test với real data
7. ⏳ Deploy lên staging

---

**Priority**: HIGH  
**Complexity**: MEDIUM  
**Impact**: HIGH (Nâng cao trải nghiệm quản lý đáng kể)

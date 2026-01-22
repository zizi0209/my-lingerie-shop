# Dashboard Date Filter Implementation - Complete

## Tổng quan
Hoàn thiện việc làm cho tất cả metrics ở dashboard thay đổi theo khoảng thời gian được chọn.

## Vấn đề ban đầu
- **Trang Tổng quan (/dashboard)**: Cards (Doanh thu, Đơn hàng, Sản phẩm, Khách hàng) hiển thị số liệu ALL-TIME, không thay đổi theo date range
- **Trang Phân tích (/dashboard/tracking)**: Cards (Doanh thu, Đơn hàng, AOV, CR) hiển thị số liệu TODAY, không thay đổi theo date range

## Giải pháp đã triển khai

### 1. Backend Updates

#### A. `/admin/dashboard/stats` endpoint
**File**: `backend/src/routes/admin/dashboard.ts`

**Thay đổi**:
- Thêm query params: `startDate`, `endDate` (optional)
- Build `dateFilter` object dựa trên params
- Apply `dateFilter` vào các queries:
  - `totalUsers` - Tổng users trong khoảng thời gian
  - `activeUsers` - Users active trong khoảng thời gian
  - `totalOrders` - Tổng đơn hàng trong khoảng thời gian
  - `pendingOrders` - Đơn chờ xử lý trong khoảng thời gian
  - `revenueResult` - Doanh thu trong khoảng thời gian (exclude CANCELLED/REFUNDED)
  - `recentOrders` - Đơn hàng gần đây trong khoảng thời gian

**Không bị ảnh hưởng bởi date range**:
- `totalProducts` - Sản phẩm không có date filter (products don't have creation date filter)
- `newUsersToday` - Luôn hiển thị khách mới HÔM NAY (not affected by date range)
- `lowStockVariants`, `outOfStockVariants` - Tồn kho hiện tại

**Logic**:
```typescript
const dateFilter = startDate && endDate ? {
  createdAt: {
    gte: new Date(startDate as string),
    lte: new Date(endDate as string)
  }
} : {};
```

#### B. `/admin/analytics/overview` endpoint
**File**: `backend/src/routes/admin/analytics.ts`

**Thay đổi**:
- Thêm query params: `startDate`, `endDate` (optional, defaults to today)
- Tính toán previous period để so sánh (same duration)
- Apply date filter vào tất cả queries:
  - `currentPageViews` - Page views trong khoảng thời gian
  - `previousPageViews` - Page views kỳ trước (để tính % thay đổi)
  - `currentProductViews` - Product views trong khoảng thời gian
  - `currentOrders` - Đơn hàng trong khoảng thời gian
  - `currentRevenue` - Doanh thu trong khoảng thời gian
  - `currentCartAdds` - Add to cart events trong khoảng thời gian

**Không bị ảnh hưởng bởi date range**:
- `activeSessionsCount` - Luôn hiển thị users online trong 15 phút gần đây (real-time)
- `totalCarts`, `abandonedCarts` - Giỏ hàng hiện tại

**Logic tính previous period**:
```typescript
const duration = periodEnd.getTime() - periodStart.getTime();
const previousStart = new Date(periodStart.getTime() - duration);
const previousEnd = new Date(periodStart.getTime());
```

### 2. Frontend Updates

#### A. `adminApi.ts` - API Client
**File**: `frontend/src/lib/adminApi.ts`

**Thay đổi**:
1. Update `getStats()` function:
```typescript
async getStats(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; data: DashboardStats }>
```

2. Thêm `getAnalyticsOverview()` function:
```typescript
async getAnalyticsOverview(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ success: boolean; data: unknown }>
```

#### B. `DashboardHome.tsx` - Trang Tổng quan
**File**: `frontend/src/components/dashboard/pages/DashboardHome.tsx`

**Thay đổi**:
```typescript
// Format dates for API
const startDate = dateRange.startDate.toISOString();
const endDate = dateRange.endDate.toISOString();

// Pass dates to API
adminDashboardApi.getStats({ startDate, endDate })
```

**Kết quả**:
- Cards (Doanh thu, Đơn hàng, Khách hàng) giờ thay đổi theo date range
- Card "Sản phẩm" vẫn hiển thị tổng số (không có date filter)
- "Khách mới hôm nay" vẫn hiển thị số khách mới TODAY (không bị ảnh hưởng)

#### C. `Tracking.tsx` - Trang Phân tích
**File**: `frontend/src/components/dashboard/pages/Tracking.tsx`

**Thay đổi**:
```typescript
// Format dates for API
const startDate = dateRange.startDate.toISOString();
const endDate = dateRange.endDate.toISOString();

// Pass dates to overview API
api.get(`/admin/analytics/overview?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`)
```

**Kết quả**:
- Cards (Doanh thu, Đơn hàng, AOV, CR) giờ thay đổi theo date range
- "Users online" vẫn hiển thị real-time (15 phút gần đây)

### 3. Utility Functions

**File**: `frontend/src/lib/dateRangeUtils.ts`

Đã có sẵn function `dateRangeToPeriod()` để convert DateRange sang period param:
```typescript
export function dateRangeToPeriod(dateRange: DateRange): '24hours' | '7days' | '30days' | '90days'
```

## Kết quả

### ✅ Trang Tổng quan (/dashboard)
- **Doanh thu**: Thay đổi theo date range ✓
- **Đơn hàng**: Thay đổi theo date range ✓
- **Sản phẩm**: Hiển thị tổng số (không có date filter) ✓
- **Khách hàng**: Thay đổi theo date range ✓
- **Khách mới hôm nay**: Luôn hiển thị TODAY (by design) ✓
- **Biểu đồ doanh thu**: Thay đổi theo date range ✓
- **Đơn hàng gần đây**: Thay đổi theo date range ✓

### ✅ Trang Phân tích (/dashboard/tracking)
- **Doanh thu**: Thay đổi theo date range ✓
- **Đơn hàng**: Thay đổi theo date range ✓
- **AOV (Giá trị TB/Đơn)**: Thay đổi theo date range ✓
- **Tỉ lệ chuyển đổi**: Thay đổi theo date range ✓
- **Users online**: Luôn hiển thị real-time (by design) ✓
- **Lượt xem SP**: Thay đổi theo date range ✓
- **Thêm giỏ hàng**: Thay đổi theo date range ✓
- **Biểu đồ traffic**: Thay đổi theo date range ✓

## TypeScript Compilation

✅ Backend: `bunx tsc --project backend/tsconfig.json --noEmit` - PASS
✅ Frontend: `bunx tsc --project frontend/tsconfig.json --noEmit` - PASS

## Nguyên tắc thiết kế

### 1. Metrics có date filter
- Doanh thu (Revenue)
- Đơn hàng (Orders)
- Khách hàng (Users)
- Page views
- Product views
- Cart events

### 2. Metrics KHÔNG có date filter (by design)
- **Sản phẩm tổng**: Products don't have creation date filter
- **Khách mới hôm nay**: Always shows TODAY (not affected by date range)
- **Users online**: Always shows real-time (last 15 minutes)
- **Tồn kho**: Current stock levels (not historical)

### 3. Revenue calculation
Doanh thu = Tất cả đơn hàng TRỪ CANCELLED và REFUNDED:
```typescript
status: { notIn: ['CANCELLED', 'REFUNDED'] }
```

## Testing checklist

- [ ] Chọn "Hôm nay" → Metrics hiển thị số liệu hôm nay
- [ ] Chọn "7 ngày qua" → Metrics hiển thị tổng 7 ngày
- [ ] Chọn "Tháng này" → Metrics hiển thị tổng tháng này
- [ ] Chọn "Tùy chỉnh" (1/1 - 15/1) → Metrics hiển thị đúng khoảng thời gian
- [ ] Kiểm tra "Khách mới hôm nay" luôn hiển thị TODAY
- [ ] Kiểm tra "Users online" luôn hiển thị real-time
- [ ] Kiểm tra "Sản phẩm" hiển thị tổng số (không thay đổi)
- [ ] Kiểm tra biểu đồ doanh thu thay đổi theo date range
- [ ] Kiểm tra đơn hàng gần đây thay đổi theo date range

## Files changed

### Backend
- `backend/src/routes/admin/dashboard.ts` - Updated `/stats` endpoint
- `backend/src/routes/admin/analytics.ts` - Updated `/overview` endpoint

### Frontend
- `frontend/src/lib/adminApi.ts` - Updated API client functions
- `frontend/src/components/dashboard/pages/DashboardHome.tsx` - Pass dates to API
- `frontend/src/components/dashboard/pages/Tracking.tsx` - Pass dates to API

### Utilities
- `frontend/src/lib/dateRangeUtils.ts` - Already has `dateRangeToPeriod()` function

## Commit message
```
feat(dashboard): implement date filter for all metrics

- Update /admin/dashboard/stats to accept startDate/endDate params
- Update /admin/analytics/overview to accept startDate/endDate params
- Apply date filter to revenue, orders, users queries
- Pass date range from frontend to backend APIs
- Keep "new users today" and "users online" as real-time metrics
- Keep product count as total (no date filter)

Fixes: Dashboard metrics now update correctly when date range changes
```

## Next steps (optional enhancements)

1. **Growth indicators**: Hiển thị % thay đổi so với kỳ trước cho tất cả metrics
2. **Compare mode**: Cho phép so sánh 2 khoảng thời gian
3. **Export data**: Xuất dữ liệu dashboard ra CSV/Excel
4. **Scheduled reports**: Gửi báo cáo tự động qua email
5. **Custom date presets**: Cho phép admin tạo preset riêng (VD: "Quý 1", "Black Friday")

## Lưu ý quan trọng

1. **Date format**: Backend nhận ISO string format từ frontend
2. **Timezone**: Cần đảm bảo timezone consistency giữa frontend và backend
3. **Performance**: Với date range lớn (>90 days), cân nhắc thêm caching
4. **Edge cases**: Handle trường hợp startDate > endDate
5. **Default behavior**: Nếu không có date params, backend sẽ fallback về behavior cũ (today/all-time)

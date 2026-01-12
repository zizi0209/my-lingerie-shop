# IntiMate - Chiến lược Tracking & Analytics Dashboard

## Tổng quan

Trang `/dashboard/tracking` không phải là "Tra cứu vận đơn" mà là **Analytics & Insights** - Trung tâm phân tích dữ liệu và hành vi khách hàng.

Với ngành hàng **Đồ lót (Lingerie)** - ngành hàng bán bằng cảm xúc và hình ảnh nhưng vận hành dựa trên Size số chặt chẽ - trang này cần trả lời được câu hỏi:

> **"Khách hàng đang làm gì trên web và tại sao họ mua (hoặc không mua)?"**

---

## Hiện trạng (Current State)

### Database Schema đã có:
- ✅ `PageView` - Tracking lượt xem trang
- ✅ `ProductView` - Tracking lượt xem sản phẩm
- ✅ `CartEvent` - Tracking sự kiện giỏ hàng (add, remove, update)
- ✅ `SearchLog` - Tracking từ khóa tìm kiếm

### Backend API đã có:
- ✅ `trackPageView` / `getPageViewAnalytics`
- ✅ `trackProductView` / `getProductViewAnalytics`
- ✅ `trackCartEvent` / `getCartEventAnalytics`

### Frontend hiện tại:
- ❌ Chỉ hiển thị data mock/static
- ❌ Chưa kết nối với API thực
- ❌ Thiếu các chỉ số quan trọng cho ngành Lingerie

---

## Kiến trúc 4 Trụ cột (4 Pillars)

### 🔷 PILLAR 1: Sales Funnel Visualization (Phễu chuyển đổi)
**Mức độ ưu tiên: 🔴 CRITICAL - Làm ngay**

Đồ lót là mặt hàng người ta xem nhiều nhưng mua đắn đo (sợ không vừa). Cần biểu đồ phễu để biết khách rớt ở đâu.

#### Chỉ số cần có:
| Bước | Metric | Nguồn dữ liệu |
|------|--------|---------------|
| Views | Tổng lượt xem sản phẩm | `ProductView` count |
| Add to Cart | Số lượt thêm vào giỏ | `CartEvent` where event = 'ADD_TO_CART' |
| Initiate Checkout | Số người bấm thanh toán | `CartEvent` where event = 'CHECKOUT_STARTED' |
| Purchase | Số đơn thành công | `Order` count where status = 'DELIVERED' |

#### Tỉ lệ chuyển đổi:
- **View → Cart Rate**: % sản phẩm được thêm giỏ sau khi xem
- **Cart → Checkout Rate**: % giỏ hàng tiến hành thanh toán
- **Checkout → Purchase Rate**: % đơn hàng hoàn thành

#### Insight tự động:
```
⚠️ Tỉ lệ Cart → Checkout chỉ đạt 15% (thấp hơn benchmark 25%)
   Gợi ý: Kiểm tra phí ship hoặc đơn giản hóa quy trình thanh toán
```

---

### 🔷 PILLAR 2: Size & Variant Intelligence (Phân tích Size)
**Mức độ ưu tiên: 🔴 CRITICAL - Làm ngay**

Tính năng "Sát thủ" cho shop thời trang/nội y.

#### 2.1 Ma trận Size (Size Heatmap)
- Biểu đồ nhiệt: Size nào bán chạy nhất?
- Phân bố: 34B và 36B thường chiếm 60% doanh số
- **Nguồn**: `OrderItem` GROUP BY variant size

#### 2.2 Tỉ lệ hoàn hàng theo Size
- Nếu Size 34A bị trả nhiều → Form áo lỗi hoặc Size Guide sai
- **Nguồn**: `Order` where status = 'RETURNED' + `OrderItem`

#### 2.3 Màu sắc xu hướng
- Màu nào đang được click/mua nhiều tuần này?
- **Nguồn**: `ProductView` + `OrderItem` GROUP BY variant color

#### Query mẫu:
```sql
-- Top sizes bán chạy
SELECT 
  JSON_EXTRACT(variant, '$.size') as size,
  COUNT(*) as total_sold,
  SUM(price * quantity) as revenue
FROM order_items
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY size
ORDER BY total_sold DESC;
```

---

### 🔷 PILLAR 3: Search & Behavior Intelligence
**Mức độ ưu tiên: 🟡 HIGH - Làm sau Pillar 1 & 2**

Hiểu khách hàng đang tìm gì trong đầu.

#### 3.1 Top từ khóa tìm kiếm
- Từ `SearchLog` - đã có sẵn
- Ví dụ: "không gọng", "độn dày", "sexy", "bikini"

#### 3.2 Từ khóa "không có kết quả"
- Keywords có `results = 0` → Cơ hội nhập hàng mới
- Insight: Nếu nhiều người tìm "bikini" mà shop chưa bán → Nhập ngay!

#### 3.3 Sản phẩm "Không chốt đơn" (High View, No Buy)
- Sản phẩm có lượt view cao nhưng không ai mua
- **Lý do tiềm năng**: Giá đắt? Hình đẹp nhưng mô tả sơ sài? Hết size phổ biến?

#### Query mẫu:
```sql
-- Sản phẩm view nhiều nhưng không bán được
SELECT 
  p.id, p.name,
  COUNT(pv.id) as views,
  COALESCE(SUM(oi.quantity), 0) as sold
FROM products p
LEFT JOIN product_views pv ON p.id = pv.product_id
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE pv.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY p.id
HAVING views > 100 AND sold = 0
ORDER BY views DESC;
```

---

### 🔷 PILLAR 4: AI Recommendation Effectiveness
**Mức độ ưu tiên: 🟢 MEDIUM - Phase 2**

Đánh giá hiệu quả của hệ thống gợi ý AI.

#### 4.1 CTR on Recommendations
- % khách click vào sản phẩm được AI gợi ý
- Cần thêm tracking: `source = 'recommendation'` vào `ProductView`

#### 4.2 Doanh thu từ gợi ý
- Bao nhiêu tiền đến từ sản phẩm trong mục "Có thể bạn cũng thích"?
- Cần thêm field `recommendation_source` vào `OrderItem`

#### 4.3 Sản phẩm được xem cùng nhau (Co-viewed Products)
- 80% người xem "Áo lót ren" cũng xem "Quần lót lọt khe"
- → Tạo Combo bán chéo

#### Database Schema cần thêm:
```prisma
model ProductView {
  // ... existing fields
  source      String?   // 'direct', 'search', 'recommendation', 'category'
  sourceId    String?   // ID của recommendation nếu có
}

model RecommendationClick {
  id              Int      @id @default(autoincrement())
  userId          Int?
  sessionId       String
  productId       Int      // Sản phẩm được gợi ý
  sourceProductId Int      // Sản phẩm đang xem khi thấy gợi ý
  algorithm       String   // 'collaborative', 'content-based', 'trending'
  position        Int      // Vị trí trong danh sách gợi ý
  clicked         Boolean  @default(false)
  purchased       Boolean  @default(false)
  createdAt       DateTime @default(now())
}
```

---

## Roadmap Implementation

### Phase 1: Foundation (1-2 tuần) 🔴 NGAY BÂY GIỜ
| Task | Priority | Effort |
|------|----------|--------|
| Tạo API `/admin/analytics/funnel` | Critical | 4h |
| Tạo API `/admin/analytics/size-distribution` | Critical | 4h |
| Tạo API `/admin/analytics/overview` | Critical | 2h |
| Cập nhật Frontend hiển thị data thực | Critical | 8h |
| Thêm tracking event 'CHECKOUT_STARTED' | High | 2h |

### Phase 2: Size Intelligence (1 tuần) 🟡 SAU PHASE 1
| Task | Priority | Effort |
|------|----------|--------|
| API `/admin/analytics/size-heatmap` | High | 4h |
| API `/admin/analytics/color-trends` | Medium | 3h |
| API `/admin/analytics/return-by-size` | High | 4h |
| UI Size Heatmap component | High | 6h |

### Phase 3: Search & Behavior (1 tuần) 🟡
| Task | Priority | Effort |
|------|----------|--------|
| API `/admin/analytics/search-keywords` | High | 3h |
| API `/admin/analytics/high-view-no-buy` | High | 4h |
| API `/admin/analytics/abandoned-products` | Medium | 3h |
| UI Tag Cloud & Product List | Medium | 4h |

### Phase 4: AI Recommendation (2 tuần) 🟢 TƯƠNG LAI
| Task | Priority | Effort |
|------|----------|--------|
| Schema migration cho recommendation tracking | Medium | 2h |
| Collaborative Filtering Algorithm | Medium | 16h |
| Content-based Filtering | Medium | 12h |
| API `/admin/analytics/recommendation-effectiveness` | Medium | 6h |
| A/B Testing Framework | Low | 16h |

---

## UI Layout Đề xuất

```
┌─────────────────────────────────────────────────────────────────┐
│ HÀNG 1: Real-time Overview                                       │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│ Traffic     │ Conversion  │ AOV         │ Cart        │ Active  │
│ hôm nay     │ Rate        │ Trung bình  │ Abandonment │ Users   │
│ 1.205 ↑10%  │ 2.5%        │ 450.000đ    │ 68%         │ 142     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HÀNG 2: Sales Funnel (Full Width)                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  [===========] Views: 10,000                                │ │
│ │  [=======]     Add to Cart: 2,500 (25%)     ↓ 75% rớt      │ │
│ │  [====]        Checkout: 800 (32%)          ↓ 68% rớt      │ │
│ │  [==]          Purchase: 400 (50%)          ↓ 50% rớt      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ 💡 Insight: Tỉ lệ View→Cart thấp. Xem xét cải thiện hình ảnh.   │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────────┐
│ HÀNG 3: Size Distribution     │ Abandoned Products              │
│ ┌───────────────────────────┐ │ ┌─────────────────────────────┐ │
│ │ [Pie Chart]               │ │ │ 1. Áo ren đỏ - 245 views   │ │
│ │ 34B: 40%                  │ │ │    0 mua - Hết size 36B    │ │
│ │ 36B: 30%                  │ │ │ 2. Quần lọt khe - 198 views│ │
│ │ 34C: 15%                  │ │ │    0 mua - Giá 450k        │ │
│ │ Khác: 15%                 │ │ │ 3. ...                     │ │
│ └───────────────────────────┘ │ └─────────────────────────────┘ │
└───────────────────────────────┴─────────────────────────────────┘

┌───────────────────────────────┬─────────────────────────────────┐
│ HÀNG 4: Search Keywords       │ Color Trends                    │
│ ┌───────────────────────────┐ │ ┌─────────────────────────────┐ │
│ │ [Tag Cloud]               │ │ │ 🔴 Đỏ: 35% (+5%)           │ │
│ │ không_gọng  sexy  ren     │ │ │ ⚫ Đen: 30% (-2%)           │ │
│ │ su_đúc  bikini  nâng_ngực │ │ │ 🩷 Hồng: 20% (+8%)          │ │
│ │ [!] bikini: 50 tìm, 0 SP  │ │ │ ⚪ Trắng: 15%               │ │
│ └───────────────────────────┘ │ └─────────────────────────────┘ │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## API Endpoints cần tạo

### Phase 1 APIs (Bắt buộc)

```typescript
// GET /api/admin/analytics/overview
{
  todayTraffic: number,
  trafficChange: number, // % so với hôm qua
  conversionRate: number,
  averageOrderValue: number,
  cartAbandonmentRate: number,
  activeUsers: number
}

// GET /api/admin/analytics/funnel?period=7days
{
  views: number,
  addToCart: number,
  addToCartRate: number,
  checkout: number,
  checkoutRate: number,
  purchase: number,
  purchaseRate: number,
  insights: string[]
}

// GET /api/admin/analytics/size-distribution?period=30days
{
  sizes: [
    { size: '34B', count: 400, percentage: 40, revenue: 120000000 },
    { size: '36B', count: 300, percentage: 30, revenue: 90000000 },
    ...
  ],
  trend: 'stable' | 'shifting'
}
```

### Phase 2 APIs

```typescript
// GET /api/admin/analytics/search-keywords?period=7days
{
  topKeywords: [
    { keyword: 'không gọng', count: 150, hasProducts: true },
    { keyword: 'bikini', count: 50, hasProducts: false }, // 🔴 Opportunity!
  ],
  noResultKeywords: [...]
}

// GET /api/admin/analytics/high-view-no-buy?period=7days&minViews=50
{
  products: [
    { 
      id: 1, 
      name: 'Áo ren đỏ', 
      views: 245, 
      sold: 0,
      possibleReasons: ['out_of_popular_size', 'high_price']
    }
  ]
}
```

---

## Tổng kết

| Pillar | Ưu tiên | Status | Giá trị |
|--------|---------|--------|---------|
| 1. Sales Funnel | 🔴 Critical | 🚧 Cần làm | Biết khách rớt ở đâu |
| 2. Size Intelligence | 🔴 Critical | 🚧 Cần làm | Tối ưu nhập hàng |
| 3. Search & Behavior | 🟡 High | 🚧 Cần làm | Hiểu nhu cầu khách |
| 4. AI Recommendation | 🟢 Medium | ⏳ Phase 2 | Tăng doanh thu chéo |

**Với trang Tracking này, bạn không chỉ quản lý "đơn hàng" (cái đã rồi) mà bạn quản lý "cơ hội bán hàng" và "sức khỏe của sản phẩm".**

---

*Document created: 2026-01-12*
*Last updated: 2026-01-12*

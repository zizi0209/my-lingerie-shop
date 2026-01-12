# IntiMate - Recommendation System
## AI Personalization: Gợi ý sản phẩm cá nhân hóa

> **Status: ✅ IMPLEMENTED** - 2026-01-12

---

## 1. Tổng quan

### Mục tiêu
Hệ thống gợi ý sản phẩm thông minh dựa trên hành vi người dùng, tối ưu cho ngành Lingerie.

### Đặc thù ngành Lingerie
| Đặc điểm | Giải pháp |
|----------|-----------|
| Size cố định theo người dùng | Size-aware filtering - ưu tiên SP có size đã mua |
| Màu sắc theo sở thích | Color affinity scoring từ view + purchase |
| Mua theo bộ (Set) | Bought-together cross-sell |
| Privacy sensitive | Không hiển thị "Người khác đã mua" |

---

## 2. Kiến trúc đã triển khai

### 2.1 Algorithms Implemented

| Algorithm | Function | Mô tả |
|-----------|----------|-------|
| **Content-Based** | `getSimilarProducts()` | Dựa trên category, type, price, colors |
| **Size-Aware** | Integrated | Filter theo size user đã mua |
| **Bought Together** | `getBoughtTogether()` | Association rules từ order history |
| **Recently Viewed** | `getRecentlyViewed()` | Session/User browsing history |
| **Trending** | `getTrendingProducts()` | View growth rate tuần này vs tuần trước |
| **Personalized** | `getPersonalizedRecommendations()` | Hybrid dựa trên user preference |
| **New Arrivals** | `getNewArrivals()` | Sắp xếp theo createdAt |
| **Best Sellers** | `getBestSellers()` | Dựa trên sales volume |

### 2.2 Scoring Formula (Content-Based)

```typescript
score = 
  + 0.30 (same category)
  + 0.20 (same product type)
  + 0.15 (similar price range)
  + 0.20 (color overlap)
  + 0.10 (high rating bonus)
  + 0.15 (user's size available) // Size-aware bonus
  + 0.10 (color affinity match)  // Personalized bonus
  - 0.30 (out of stock penalty)
```

---

## 3. Database Schema

### UserPreference Model
```prisma
model UserPreference {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique
  preferredSizes  Json?    // { "BRA": ["34B"], "PANTY": ["S", "M"] }
  colorAffinities Json?    // { "Đen": 0.8, "Đỏ": 0.6 }
  styleAffinities Json?    // { "sexy": 0.7, "casual": 0.5 }
  avgOrderValue   Float    @default(0)
  priceRange      Json?    // { "min": 150000, "max": 500000 }
  categoryWeights Json?    // { "1": 0.8, "2": 0.3 }
  lastUpdated     DateTime @default(now())
  createdAt       DateTime @default(now())
  user            User     @relation(...)
}
```

### Existing Models Used
- `ProductView` - với `source` field cho tracking
- `RecommendationClick` - đo hiệu quả recommendation
- `OrderItem` - cho bought-together analysis
- `ProductVariant` - cho size/color filtering

---

## 4. API Endpoints

### Public APIs

| Endpoint | Method | Params | Description |
|----------|--------|--------|-------------|
| `/recommendations/similar/:productId` | GET | `userId`, `limit` | SP tương tự (content-based + size-aware) |
| `/recommendations/recently-viewed` | GET | `sessionId`, `userId`, `excludeId` | SP đã xem gần đây |
| `/recommendations/trending` | GET | `limit`, `productType` | SP đang hot (growth rate) |
| `/recommendations/bought-together/:productId` | GET | `limit` | SP thường mua cùng |
| `/recommendations/personalized` | GET | `userId`, `excludeIds` | Gợi ý cá nhân hóa |
| `/recommendations/new-arrivals` | GET | `limit`, `productType` | SP mới về |
| `/recommendations/best-sellers` | GET | `limit`, `categoryId`, `days` | SP bán chạy |
| `/recommendations/for-cart` | GET | `productIds`, `limit` | Gợi ý cho giỏ hàng |
| `/recommendations/track-click` | POST | body | Track click analytics |

### Request/Response Examples

```typescript
// GET /api/recommendations/similar/123?userId=1&limit=8
{
  "success": true,
  "data": {
    "products": [
      {
        "id": 456,
        "name": "Áo ngực ren đen",
        "slug": "ao-nguc-ren-den",
        "price": 350000,
        "salePrice": 280000,
        "image": "https://...",
        "categoryName": "Áo ngực",
        "colors": ["Đen", "Đỏ"],
        "hasStock": true
      }
    ],
    "algorithm": "content-based+personalized"
  }
}

// POST /api/recommendations/track-click
{
  "productId": 456,
  "sourceProductId": 123,
  "algorithm": "similar",
  "position": 0,
  "sectionType": "product-detail",
  "sessionId": "sess_xxx",
  "userId": 1
}
```

---

## 5. Frontend Integration

### RecommendationSection Component

```tsx
// Usage trong Product Detail
<RecommendationSection
  type="similar"           // similar | recently-viewed | trending | bought-together | personalized | new-arrivals | best-sellers
  productId={product.id}
  userId={user?.id}
  sessionId={sessionId}
  limit={8}
/>
```

### Tích hợp hiện tại

| Page | Sections |
|------|----------|
| **Product Detail** | Similar Products, Bought Together, Recently Viewed |
| **Homepage** | (Ready to add) Trending, Personalized, New Arrivals |
| **Cart** | (Ready to add) For Cart recommendations |
| **Category** | (Ready to add) Best Sellers |

### Features
- ✅ Horizontal scroll với navigation buttons
- ✅ Loading skeleton states
- ✅ Click tracking tự động
- ✅ Sale badges, trending badges
- ✅ Color preview dots
- ✅ Out of stock indicator
- ✅ Responsive design

---

## 6. User Preference Computation

### `updateUserPreference(userId)`

Tính toán preferences từ behavior data:

```typescript
// 1. preferredSizes - từ OrderItem variants
// Lấy size đã mua thành công, group theo productType
{ "BRA": ["34B", "36B"], "PANTY": ["S", "M"] }

// 2. colorAffinities - từ views (0.3) + purchases (1.0)
// Normalize thành 0-1
{ "Đen": 0.85, "Đỏ": 0.62, "Hồng": 0.45 }

// 3. categoryWeights - từ views + purchases
{ "1": 0.9, "3": 0.6, "5": 0.3 }

// 4. priceRange - từ order history
{ "min": 180000, "max": 450000 }

// 5. avgOrderValue
320000
```

---

## 7. Files Structure

```
backend/
├── prisma/schema.prisma          # UserPreference model
├── src/services/
│   └── recommendationService.ts  # 8 algorithms + helper functions
├── src/routes/
│   └── recommendationRoutes.ts   # 9 API endpoints
└── src/server.ts                 # Route registration

frontend/
├── src/components/product/
│   └── RecommendationSection.tsx # Reusable component
└── src/app/san-pham/[slug]/
    └── page.tsx                  # Product detail integration
```

---

## 8. Performance Notes

### Current Implementation
- Real-time computation (no caching)
- Efficient database queries với indexes
- Limit candidates để tránh over-fetching

### Future Optimizations (nếu cần)
```typescript
// Redis caching
CACHE_TTL = {
  similar: 60 * 60,      // 1 hour
  trending: 15 * 60,     // 15 minutes
  personalized: 30 * 60  // 30 minutes
}

// Background jobs
- updateUserPreferences: every 6 hours
- updateTrending: every hour
- cleanOldClicks: weekly
```

---

## 9. Analytics & Tracking

### Đã tích hợp với Analytics Dashboard
- `/admin/analytics/recommendation-effectiveness`
- CTR by algorithm
- Revenue from recommendations
- Click position analysis

### RecommendationClick Model
```prisma
model RecommendationClick {
  productId       Int
  sourceProductId Int?
  algorithm       String   // 'similar', 'trending', etc.
  position        Int      // 0-indexed position
  sectionType     String   // 'product_detail', 'cart', etc.
  purchased       Boolean  @default(false)
  purchasedAt     DateTime?
}
```

---

## 10. Tổng kết Implementation

| Component | Status | File |
|-----------|--------|------|
| Schema | ✅ | `prisma/schema.prisma` |
| Similar Products | ✅ | `recommendationService.ts` |
| Recently Viewed | ✅ | `recommendationService.ts` |
| Trending | ✅ | `recommendationService.ts` |
| Bought Together | ✅ | `recommendationService.ts` |
| Personalized | ✅ | `recommendationService.ts` |
| New Arrivals | ✅ | `recommendationService.ts` |
| Best Sellers | ✅ | `recommendationService.ts` |
| For Cart | ✅ | `recommendationRoutes.ts` |
| Click Tracking | ✅ | `recommendationRoutes.ts` |
| Frontend Component | ✅ | `RecommendationSection.tsx` |
| Product Detail | ✅ | `[slug]/page.tsx` |
| User Preference Update | ✅ | `recommendationService.ts` |

### Business Impact
- 🎯 **Conversion**: Gợi ý SP phù hợp size/màu → tăng add-to-cart
- 💰 **AOV**: Cross-sell bundles → tăng giá trị đơn hàng
- 🔄 **Engagement**: Recently viewed → giảm bounce rate
- 📊 **Insights**: Click tracking → data-driven optimization

---

## 11. Next Steps (Optional)

| Task | Priority | Effort |
|------|----------|--------|
| Add recommendations to Homepage | Medium | 2h |
| Add recommendations to Cart page | Medium | 2h |
| Implement Redis caching | Low | 4h |
| A/B testing framework | Low | 8h |
| Collaborative filtering | Low | 16h |

---

## 12. Quick Reference

### API Test Examples (cURL)

```bash
# Similar Products
curl "http://localhost:5000/api/recommendations/similar/1?limit=8&userId=1"

# Recently Viewed
curl "http://localhost:5000/api/recommendations/recently-viewed?sessionId=sess_123&limit=6"

# Trending
curl "http://localhost:5000/api/recommendations/trending?limit=10"

# Bought Together
curl "http://localhost:5000/api/recommendations/bought-together/1?limit=4"

# Personalized (requires userId)
curl "http://localhost:5000/api/recommendations/personalized?userId=1&limit=12"

# New Arrivals
curl "http://localhost:5000/api/recommendations/new-arrivals?limit=8"

# Best Sellers
curl "http://localhost:5000/api/recommendations/best-sellers?limit=10&days=30"

# For Cart (multiple products)
curl "http://localhost:5000/api/recommendations/for-cart?productIds=1,2,3&limit=4"

# Track Click
curl -X POST "http://localhost:5000/api/recommendations/track-click" \
  -H "Content-Type: application/json" \
  -d '{"productId":456,"sourceProductId":123,"algorithm":"similar","position":0,"sectionType":"product-detail","sessionId":"sess_123"}'
```

### Frontend Quick Usage

```tsx
import RecommendationSection from '@/components/product/RecommendationSection';

// Product Detail Page
<RecommendationSection type="similar" productId={id} userId={user?.id} sessionId={sid} limit={8} />
<RecommendationSection type="bought-together" productId={id} sessionId={sid} limit={4} />
<RecommendationSection type="recently-viewed" productId={id} userId={user?.id} sessionId={sid} limit={6} />

// Homepage
<RecommendationSection type="trending" limit={10} />
<RecommendationSection type="personalized" userId={user?.id} limit={12} />
<RecommendationSection type="new-arrivals" limit={8} />

// Category Page
<RecommendationSection type="best-sellers" categoryId={catId} limit={10} />
```

### Service Functions

```typescript
// recommendationService.ts exports:
getSimilarProducts(productId, limit, userId?)       // { products, algorithm }
getRecentlyViewed(sessionId, userId?, limit, excludeId?) // ProductCard[]
getTrendingProducts(limit, productType?)            // ProductCard[] + growthRate
getBoughtTogether(productId, limit)                 // ProductCard[] + confidence
getPersonalizedRecommendations(userId, limit, excludeIds) // { products, reason }
getNewArrivals(limit, productType?)                 // ProductCard[]
getBestSellers(limit, categoryId?, days)            // ProductCard[]
trackRecommendationClick(data)                      // void
updateUserPreference(userId)                        // void - compute & save
```

---

*Implemented: 2026-01-12*  
*Code: ~850 lines service | ~285 lines routes | ~320 lines component*

# 📱 LINGERIE SIZE SYSTEM V2 - HOW IT WORKS

## 🎯 FEATURE HOẠT ĐỘNG NHƯ THẾ NÀO?

---

## 📍 VỊ TRÍ HIỂN THỊ TRÊN WEBSITE

### 1. **TRANG SẢN PHẨM (Product Detail Page)**

```
┌─────────────────────────────────────────────────┐
│  [Product Image]    LUXURY LACE BRA             │
│                     $59.99                       │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │ 🌍 Region: [US ▼]  Units: [Inches ▼]    │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  SIZE: Select your size                         │
│  ┌────┬────┬────┬────┬────┬────┐              │
│  │32C │32D │34B │34C │34D │36B │              │
│  │ ✓  │ ✓  │ ✓  │ ✗  │ ✓  │ ✓  │ ← Stock     │
│  └────┴────┴────┴────┴────┴────┘              │
│         ↑ Click vào 34C (hết hàng)             │
│                                                  │
│  ⚠️ SIZE 34C IS OUT OF STOCK                   │
│  Try these sister sizes with same cup volume:  │
│                                                  │
│  ┌────────────────────────────────────────┐   │
│  │ 🔽 32D - TIGHTER BAND                  │   │
│  │    Band will be snugger                │   │
│  │    5 in stock  [Add to Cart]          │   │
│  └────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────┐   │
│  │ 🔼 36B - LOOSER BAND                   │   │
│  │    Band will be more relaxed           │   │
│  │    3 in stock  [Add to Cart]          │   │
│  └────────────────────────────────────────┘   │
│                                                  │
│  ℹ️ What is sister sizing? [Learn more]       │
│                                                  │
│  📏 [View Size Chart] [Fit Finder]             │
└─────────────────────────────────────────────────┘
```

### 2. **SIZE CHART MODAL**

```
┌──────────────────────────────────────────────────┐
│  SIZE CHART - BRA                          [✗]   │
├──────────────────────────────────────────────────┤
│  [Size Guide] [Size Chart] [Conversions] [Fit]  │
├──────────────────────────────────────────────────┤
│                                                   │
│  🌍 YOUR REGION: US                              │
│  Switch to: [UK] [EU] [FR] [AU] [JP]            │
│                                                   │
│  ┌────────────────────────────────────────┐     │
│  │ US SIZE CHART                          │     │
│  ├─────┬──────┬──────┬──────────┬────────┤     │
│  │ US  │ Band │ Cup  │ Under    │ Bust   │     │
│  │     │ (in) │      │ Bust     │        │     │
│  ├─────┼──────┼──────┼──────────┼────────┤     │
│  │ 32C │ 32   │ C    │ 28-30"   │ 35-36" │ ← You│
│  │ 32D │ 32   │ D    │ 28-30"   │ 36-37" │     │
│  │ 34B │ 34   │ B    │ 30-32"   │ 36-37" │     │
│  │ 34C │ 34   │ C    │ 30-32"   │ 37-38" │     │
│  │ 34D │ 34   │ D    │ 30-32"   │ 38-39" │     │
│  └─────┴──────┴──────┴──────────┴────────┘     │
│                                                   │
│  🔄 INTERNATIONAL CONVERSIONS                    │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┐         │
│  │ US  │ UK  │ EU  │ FR  │ AU  │ JP  │         │
│  ├─────┼─────┼─────┼─────┼─────┼─────┤         │
│  │ 34C │ 34C │ 75C │ 90C │ 12C │ 75C │         │
│  │ 34DD│ 34DD│ 75E │ 90E │12DD │ 75E │ ← DD≠E  │
│  │34DDD│ 34E │ 75F │ 90F │ 14D │ 75F │         │
│  └─────┴─────┴─────┴─────┴─────┴─────┘         │
│                                                   │
│  ⚠️ Note: US DD = EU E (NOT DD!)                │
│     Always use conversion table, not math!      │
└──────────────────────────────────────────────────┘
```

### 3. **BRAND FIT NOTICE**

```
┌─────────────────────────────────────────────────┐
│  AGENT PROVOCATEUR - Luxury Bra                 │
│                                                  │
│  ⚠️ BRAND FIT NOTICE                            │
│  ┌────────────────────────────────────────┐    │
│  │ 📏 THIS BRAND RUNS SMALL                │    │
│  │                                          │    │
│  │ Normally wear 34C?                       │    │
│  │ We recommend: 36D                        │    │
│  │                                          │    │
│  │ • Band runs 1 size smaller               │    │
│  │ • Cup runs 1 size smaller                │    │
│  │                                          │    │
│  │ Based on 127 customer reviews            │    │
│  │ 89% found this helpful ⭐                │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  SELECT SIZE:                                   │
│  ┌────┬────┬────┬────┬────┐                   │
│  │34C │34D │36C │36D │38C │                   │
│  │    │    │    │ ✓  │    │ ← Recommended     │
│  └────┴────┴────┴────┴────┘                   │
└─────────────────────────────────────────────────┘
```

---

## 🔄 LUỒNG HOẠT ĐỘNG (USER FLOW)

### SCENARIO 1: Khách hàng tìm size hết hàng

```
User Journey:
1. Vào trang sản phẩm
2. Chọn size 34C
3. Thấy thông báo "Out of stock"
4. Hệ thống tự động hiển thị sister sizes:
   - 32D (band chặt hơn) - 5 cái
   - 36B (band lỏng hơn) - 3 cái
5. Click "Learn more" → Hiểu sister sizing
6. Chọn 32D → Add to cart
7. Backend log recommendation

API Calls:
GET /api/products/123/sizes/alternatives?requestedSize=34C&regionCode=US
→ Returns: { isAvailable: false, alternatives: [...] }

POST /api/sizes/sister/accept
→ Tracks user acceptance
```

### SCENARIO 2: Khách quốc tế chuyển đổi size

```
User Journey:
1. User từ UK vào website
2. Hệ thống detect region: UK (qua IP/language)
3. Click "Region: US ▼" → Chọn "UK"
4. Tất cả sizes hiển thị theo chuẩn UK
5. Click "View Size Chart"
6. Tab "Conversions" hiển thị bảng quy đổi:
   US 34DD = UK 34DD = EU 75E
7. User hiểu: UK dùng E, không dùng DDD

API Calls:
POST /api/sizes/cup/convert
{ fromRegion: "UK", toRegion: "US", cupLetter: "DD" }
→ Returns: { toCupLetter: "DD", cupVolume: 6 }

GET /api/sizes/cup/matrix/6
→ Returns: { US: "DD", UK: "DD", EU: "E" }
```

---

## 💻 BACKEND → FRONTEND DATA FLOW

```
┌──────────────┐
│   DATABASE   │
│              │
│ • RegionalSize
│ • SizeConversion
│ • Brand
│ • ProductVariant
└──────┬───────┘
       │
       ↓
┌──────────────┐     Redis Cache
│   SERVICES   │ ←───────────────
│              │
│ • SisterSizingService
│ • CupProgressionService
│ • BrandFitService
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  API ROUTES  │
│              │
│ GET /api/products/:id/sizes/alternatives
│ POST /api/sizes/cup/convert
│ POST /api/brands/fit/adjust
└──────┬───────┘
       │
       ↓ JSON Response
┌──────────────┐
│   FRONTEND   │
│              │
│ • SizeSelector Component
│ • SisterSizeAlert Component
│ • BrandFitNotice Component
└──────────────┘
```

---

## 🎨 TRIỂN KHAI HOÀN TẤT ✅

### ✅ Đã có (Backend):
- Database schema hoàn chỉnh
- 3 services hoạt động
- 17 API endpoints
- 88 unit/integration tests
- Cache với Redis
- Migration & seed data

### ✅ Đã có (Frontend):
- **4 React components** ready to use
- **TypeScript types** đầy đủ
- **API client** với 10 functions
- **Dark mode** support
- **Tailwind CSS** styling
- **Integration guide** chi tiết

**Components created:**
1. `SisterSizeAlert` - Hiển thị sister sizes khi hết hàng
2. `BrandFitNotice` - Thông báo brand fit (runs small/large)
3. `RegionSwitcher` - Chuyển đổi giữa các region (US/UK/EU)
4. `SizeChartConversion` - Bảng quy đổi quốc tế

**Files:**
- `frontend/src/types/size-system-v2.ts`
- `frontend/src/lib/sizeSystemApi.ts`
- `frontend/src/components/product/SisterSizeAlert.tsx`
- `frontend/src/components/product/BrandFitNotice.tsx`
- `frontend/src/components/product/RegionSwitcher.tsx`
- `frontend/src/components/product/SizeChartConversion.tsx`
- `docs/FRONTEND_INTEGRATION.md` - Hướng dẫn tích hợp

---

## 🚀 CÁCH SỬ DỤNG

### Backend API Testing

```bash
# 1. Get sister sizes
curl http://localhost:5000/api/sizes/sister/UIC_BRA_BAND86_CUPVOL6

# 2. Get alternatives
curl "http://localhost:5000/api/products/1/sizes/alternatives?requestedSize=34C&regionCode=US"

# 3. Convert cup
curl -X POST http://localhost:5000/api/sizes/cup/convert \
  -H "Content-Type: application/json" \
  -d '{"fromRegion":"US","toRegion":"EU","cupLetter":"DD"}'

# 4. Brand fit
curl -X POST http://localhost:5000/api/brands/fit/adjust \
  -H "Content-Type: application/json" \
  -d '{"brandId":"brand_ap","userNormalSize":"34C","regionCode":"US"}'
```

### Frontend Integration

Xem hướng dẫn chi tiết tại: **`docs/FRONTEND_INTEGRATION.md`**

**Quick Start:**

```tsx
import SisterSizeAlert from '@/components/product/SisterSizeAlert';
import BrandFitNotice from '@/components/product/BrandFitNotice';
import RegionSwitcher from '@/components/product/RegionSwitcher';

// Product Page
<RegionSwitcher currentRegion="US" onRegionChange={setRegion} />
<BrandFitNotice brandId="brand_ap" userNormalSize="34C" regionCode="US" />
<SisterSizeAlert productId={1} requestedSize="34C" regionCode="US" onSizeSelect={handleSelect} />
```

**Xem thêm:** `docs/FRONTEND_INTEGRATION.md` để biết cách tích hợp đầy đủ.

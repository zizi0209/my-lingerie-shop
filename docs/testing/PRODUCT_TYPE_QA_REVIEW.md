# QA Review: Product Type Architecture

> **Tài liệu review:** PRODUCT_TYPE_ARCHITECTURE.md  
> **Ngày review:** 2026-01-10  
> **Mục đích:** Phát hiện vấn đề, edge cases, và đề xuất tối ưu

---

## 1. Tổng Quan Đánh Giá

### 1.1 Điểm mạnh

| # | Điểm mạnh | Mô tả |
|---|-----------|-------|
| ✅ | Kiến trúc rõ ràng | Tách biệt Category (Marketing) và ProductType (Technical) |
| ✅ | Giải quyết đúng vấn đề | Size Guide không còn phụ thuộc vào Category slug |
| ✅ | Linh hoạt | Admin có thể override bảng size riêng từng sản phẩm |
| ✅ | Backward compatible | Không break hệ thống hiện tại |
| ✅ | UI/UX chi tiết | Mockup đầy đủ cho Admin và Frontend |

### 1.2 Điểm cần cải thiện

| # | Vấn đề | Mức độ | Phần |
|---|--------|--------|------|
| ⚠️ | Thiếu xử lý SET đồ lót (Bra + Panty) | HIGH | Schema |
| ⚠️ | Không cho đổi ProductType gây khó khăn | MEDIUM | Business Logic |
| ⚠️ | Migration script chưa robust | MEDIUM | Migration |
| ⚠️ | Thiếu validation cho customSizeChart JSON | HIGH | Backend |
| ⚠️ | API caching strategy chưa rõ | MEDIUM | Performance |
| ⚠️ | Thiếu audit log khi thay đổi template | LOW | Security |

---

## 2. Vấn Đề Chi Tiết & Giải Pháp

### 2.1 [HIGH] Thiếu xử lý SET đồ lót (Combo Bra + Panty)

**Vấn đề:**
```
Sản phẩm: "Set đồ lót ren Valentine" (1 Bra + 1 Panty)
- Cần bảng size BRA (70A, 75B...)
- VÀ bảng size PANTY (S, M, L...)
- Hiện tại chỉ có 1 productType

→ Chọn BRA hay PANTY? Hay cần type mới "SET"?
```

**Giải pháp đề xuất:**
```typescript
// Option A: Thêm ProductType.SET với bảng size kết hợp
enum ProductType {
  BRA,
  PANTY,
  SET,        // ← Thêm mới: Combo Bra + Panty
  SLEEPWEAR,
  SHAPEWEAR,
  ACCESSORY
}

// SET sẽ có bảng size riêng:
{
  productType: "SET",
  name: "Set đồ lót",
  headers: ["Size Set", "Size Áo", "Size Quần", "Vòng ngực", "Vòng mông"],
  sizes: [
    { size: "S", braSize: "70A-70B", pantySize: "S", bust: "78-82 cm", hips: "86-90 cm" },
    { size: "M", braSize: "75A-75B", pantySize: "M", bust: "83-87 cm", hips: "90-94 cm" },
    // ...
  ]
}

// Option B: Cho phép multiple productTypes (phức tạp hơn)
model Product {
  productTypes ProductType[] // Array thay vì single
}
```

**Đề xuất:** Chọn Option A (thêm SET type) vì đơn giản hơn và phổ biến trong ngành lingerie.

---

### 2.2 [HIGH] Thiếu validation cho customSizeChart JSON

**Vấn đề:**
```typescript
// Hiện tại customSizeChart chỉ là Json? - không có validation
customSizeChart Json?

// Admin có thể nhập sai format:
{
  "wrong_key": "value",  // ← Không có headers
  "sizes": "not array"   // ← Sai type
}

// → Frontend crash khi render
```

**Giải pháp:**
```typescript
// 1. Định nghĩa Zod schema cho validation
import { z } from 'zod';

const SizeEntrySchema = z.object({
  size: z.string().min(1),
  bust: z.string().optional(),
  underBust: z.string().optional(),
  cup: z.string().optional(),
  waist: z.string().optional(),
  hips: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
});

const MeasurementStepSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

const CustomSizeChartSchema = z.object({
  name: z.string().min(1),
  headers: z.array(z.string()).min(2),          // Ít nhất Size + 1 cột
  sizes: z.array(SizeEntrySchema).min(1),       // Ít nhất 1 size
  measurements: z.array(MeasurementStepSchema).optional(),
  tips: z.array(z.string()).optional(),
});

// 2. Validate trước khi lưu vào DB
const validateCustomSizeChart = (data: unknown) => {
  const result = CustomSizeChartSchema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Invalid customSizeChart format', result.error);
  }
  return result.data;
};

// 3. API endpoint
app.put('/api/admin/products/:id', async (req, res) => {
  const { customSizeChart, ...productData } = req.body;
  
  if (customSizeChart) {
    validateCustomSizeChart(customSizeChart); // Throw if invalid
  }
  
  // ... save to DB
});
```

---

### 2.3 [MEDIUM] Không cho đổi ProductType gây khó khăn

**Vấn đề:**
```
Scenario: Admin tạo sản phẩm "Áo crop top" chọn nhầm SLEEPWEAR
→ Thực ra nên là BRA (vì có size cup)
→ Không đổi được → Phải xóa và tạo lại → Mất reviews, orders history
```

**Giải pháp:**
```typescript
// Cho phép đổi ProductType NHƯNG có điều kiện:
const canChangeProductType = async (productId: number, newType: ProductType) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      orderItems: true,
      reviews: true,
      variants: true,
    }
  });

  // Điều kiện 1: Chưa có đơn hàng nào
  if (product.orderItems.length > 0) {
    return {
      allowed: false,
      reason: 'Sản phẩm đã có đơn hàng, không thể đổi loại'
    };
  }

  // Điều kiện 2: Variants phải compatible
  // BRA → PANTY: OK (xóa variants, nhập lại)
  // BRA → ACCESSORY: Cần xóa tất cả variants
  
  // Điều kiện 3: Cần confirm từ Admin
  return {
    allowed: true,
    warning: 'Đổi loại sản phẩm sẽ xóa tất cả biến thể (size/màu). Bạn có chắc?',
    requireConfirm: true
  };
};

// UI: Hiện nút "Đổi loại sản phẩm" với warning
// Nếu đã có orders → Disable nút, hiện tooltip giải thích
```

---

### 2.4 [MEDIUM] Migration script chưa robust

**Vấn đề:**
```typescript
// Script hiện tại dựa vào keyword matching - dễ sai
if (productName.includes("áo lót")) productType = "BRA";

// Edge cases:
// - "Túi đựng áo lót" → Detect BRA nhưng thực ra là ACCESSORY
// - "Set quần áo lót sexy" → Detect PANTY nhưng thực ra là SET
// - Tên sản phẩm tiếng Anh: "Sexy Push-up Bra" → Không detect được
```

**Giải pháp:**
```typescript
// 1. Thêm nhiều keywords hơn
const PRODUCT_TYPE_KEYWORDS = {
  BRA: [
    'áo lót', 'áo ngực', 'bra', 'push-up', 'bralette', 
    'áo nịt ngực', 'sport bra', 'wireless bra'
  ],
  PANTY: [
    'quần lót', 'panty', 'thong', 'bikini', 'boyshort',
    'quần chip', 'quần tam giác'
  ],
  SET: [
    'set đồ lót', 'bộ đồ lót', 'combo', 'set nội y',
    'lingerie set'
  ],
  SHAPEWEAR: [
    'gen', 'định hình', 'corset', 'nịt bụng', 'shapewear',
    'waist trainer', 'body shaper'
  ],
  SLEEPWEAR: [
    'đồ ngủ', 'váy ngủ', 'pyjama', 'bodysuit', 'đồ mặc nhà',
    'sleepwear', 'nightgown', 'robe'
  ],
  ACCESSORY: [
    'miếng dán', 'dây áo', 'túi giặt', 'phụ kiện',
    'nipple cover', 'bra strap', 'laundry bag'
  ]
};

// 2. Scoring system thay vì first match
const detectProductType = (name: string, categorySlug: string): ProductType => {
  const scores: Record<ProductType, number> = {
    BRA: 0, PANTY: 0, SET: 0, SLEEPWEAR: 0, SHAPEWEAR: 0, ACCESSORY: 0
  };
  
  const textToCheck = `${name.toLowerCase()} ${categorySlug}`;
  
  for (const [type, keywords] of Object.entries(PRODUCT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textToCheck.includes(keyword.toLowerCase())) {
        scores[type as ProductType] += 1;
      }
    }
  }
  
  // SET có priority cao hơn nếu match cả BRA và PANTY
  if (scores.BRA > 0 && scores.PANTY > 0) {
    scores.SET += 2;
  }
  
  // ACCESSORY keywords có priority cao hơn
  if (scores.ACCESSORY > 0) {
    return 'ACCESSORY';
  }
  
  // Return type với score cao nhất
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'SLEEPWEAR'; // default
  
  return Object.entries(scores).find(([_, s]) => s === maxScore)?.[0] as ProductType;
};

// 3. Dry-run mode để review trước khi apply
const migrateProductTypes = async (dryRun = true) => {
  const products = await prisma.product.findMany({...});
  const results: MigrationResult[] = [];
  
  for (const product of products) {
    const detectedType = detectProductType(product.name, product.category?.slug || '');
    
    results.push({
      id: product.id,
      name: product.name,
      currentCategory: product.category?.name,
      detectedType,
      confidence: calculateConfidence(product, detectedType)
    });
    
    if (!dryRun) {
      await prisma.product.update({...});
    }
  }
  
  // Export to CSV for review
  if (dryRun) {
    await exportToCSV(results, 'migration-preview.csv');
    console.log('Review migration-preview.csv before running with dryRun=false');
  }
  
  return results;
};
```

---

### 2.5 [MEDIUM] API caching strategy chưa rõ

**Vấn đề:**
```
GET /api/size-templates được gọi mỗi khi:
- User mở Size Guide popup
- Admin preview bảng size

→ 4 templates × N requests/ngày = Nhiều DB queries không cần thiết
→ Templates hiếm khi thay đổi (chỉ khi Admin update)
```

**Giải pháp:**
```typescript
// 1. Backend: Cache với Redis hoặc in-memory
import { Redis } from 'ioredis';

const redis = new Redis();
const CACHE_TTL = 3600; // 1 hour

const getSizeTemplates = async () => {
  const cacheKey = 'size-templates:all';
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const templates = await prisma.sizeChartTemplate.findMany({
    where: { isActive: true }
  });
  
  // Cache result
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(templates));
  
  return templates;
};

// Invalidate cache khi Admin update
const updateSizeTemplate = async (type: ProductType, data: any) => {
  await prisma.sizeChartTemplate.update({...});
  
  // Invalidate cache
  await redis.del('size-templates:all');
  await redis.del(`size-templates:${type}`);
};

// 2. Frontend: Cache với React Query / SWR
const useSizeTemplate = (productType: ProductType) => {
  return useQuery({
    queryKey: ['size-template', productType],
    queryFn: () => fetchSizeTemplate(productType),
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

// 3. Alternative: Embed template trong Product API response
// Để giảm số lượng API calls
GET /api/products/:slug
{
  "id": 1,
  "name": "Áo lót ren",
  "productType": "BRA",
  "sizeChart": {                    // ← Embed luôn, không cần call riêng
    "name": "Áo lót",
    "headers": [...],
    "sizes": [...]
  }
}
```

---

### 2.6 [LOW] Thiếu audit log khi thay đổi template

**Vấn đề:**
```
Admin A sửa bảng size BRA: 70A = 78-80cm → 80-82cm
→ Không có log ai sửa, sửa lúc nào, giá trị cũ là gì
→ Khó debug khi có complaint từ khách hàng
```

**Giải pháp:**
```typescript
// 1. Thêm audit log cho SizeChartTemplate
const updateSizeTemplate = async (
  type: ProductType, 
  data: UpdateTemplateDto,
  adminId: number
) => {
  // Get old value
  const oldTemplate = await prisma.sizeChartTemplate.findUnique({
    where: { productType: type }
  });
  
  // Update
  const newTemplate = await prisma.sizeChartTemplate.update({
    where: { productType: type },
    data
  });
  
  // Log change
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: 'UPDATE',
      resource: 'SizeChartTemplate',
      resourceId: type,
      oldValue: oldTemplate,
      newValue: newTemplate,
      severity: 'INFO'
    }
  });
  
  return newTemplate;
};

// 2. Trong Admin UI, hiện history changes
// "Lịch sử thay đổi bảng size BRA"
// - 2026-01-10 14:30 - Admin A - Sửa size 70A
// - 2026-01-05 10:00 - Admin B - Thêm size 85D
```

---

## 3. Edge Cases Cần Xử Lý

### 3.1 Product với size đặc biệt

```
Case: "Áo lót cho bà bầu" - size theo tháng thai kỳ
→ Không fit vào hệ size BRA thông thường

Giải pháp:
- Dùng customSizeChart để override
- Hoặc thêm note trong template BRA về size đặc biệt
```

### 3.2 Freesize / One-size

```
Case: "Quần lót lưới freesize" - chỉ có 1 size
→ ProductType = PANTY nhưng không cần bảng size?

Giải pháp:
- Variant chỉ có 1 record: size = "Freesize"
- Size Guide vẫn hiện bảng PANTY với note "Sản phẩm này là Freesize"
- Hoặc thêm field `isFreesize: Boolean` vào Product
```

### 3.3 Sản phẩm imported (size quốc tế)

```
Case: Import hàng từ US, size là 32A, 34B thay vì 70A, 75B
→ Cần quy đổi hoặc hiển thị cả 2 hệ

Giải pháp:
- Dùng customSizeChart với hệ size US
- Hoặc lưu sizeSystem: 'VN' | 'US' | 'UK' | 'EU' trong Product
- Size Guide tự động quy đổi dựa vào sizeSystem
```

### 3.4 ACCESSORY với biến thể

```
Case: "Miếng dán ngực" có nhiều màu (Nude, Đen, Trắng)
→ ProductType = ACCESSORY (không size)
→ Nhưng vẫn có variants theo màu

Giải pháp:
- Variants vẫn hoạt động bình thường
- Chỉ ẩn UI chọn SIZE, vẫn hiện chọn MÀU
- variant.size = null hoặc "" cho ACCESSORY
```

---

## 4. Performance Considerations

### 4.1 Lazy loading Size Guide data

```typescript
// Không fetch size chart khi load product page
// Chỉ fetch khi user click "Hướng dẫn chọn size"

const ProductPage = () => {
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsSizeGuideOpen(true)}>
        Hướng dẫn chọn size
      </button>
      
      {/* Lazy load modal */}
      {isSizeGuideOpen && (
        <Suspense fallback={<LoadingSpinner />}>
          <SizeGuideModal 
            productType={product.productType}
            onClose={() => setIsSizeGuideOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
};
```

### 4.2 Preload trên hover (UX improvement)

```typescript
// Prefetch data khi user hover vào nút
const SizeGuideButton = ({ productType }) => {
  const queryClient = useQueryClient();
  
  const handleMouseEnter = () => {
    // Prefetch để khi click sẽ instant
    queryClient.prefetchQuery({
      queryKey: ['size-template', productType],
      queryFn: () => fetchSizeTemplate(productType),
    });
  };
  
  return (
    <button 
      onMouseEnter={handleMouseEnter}
      onClick={openModal}
    >
      📏 Hướng dẫn chọn size
    </button>
  );
};
```

---

## 5. Security Considerations

### 5.1 Validate productType enum

```typescript
// Backend: Đảm bảo chỉ nhận giá trị hợp lệ
const ProductTypeEnum = ['BRA', 'PANTY', 'SLEEPWEAR', 'SHAPEWEAR', 'ACCESSORY'] as const;

const createProduct = async (req: Request) => {
  const { productType } = req.body;
  
  if (!ProductTypeEnum.includes(productType)) {
    throw new BadRequestError(`Invalid productType: ${productType}`);
  }
  
  // ...
};
```

### 5.2 Rate limiting cho Size Template API

```typescript
// Ngăn chặn abuse API
app.use('/api/size-templates', rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests'
}));
```

---

## 6. Testing Checklist

### 6.1 Unit Tests

```
Backend:
[ ] detectProductType() với các edge cases
[ ] validateCustomSizeChart() với invalid JSON
[ ] getSizeChartForProduct() priority logic
[ ] Migration script với dry-run mode

Frontend:
[ ] SizeGuideModal render đúng theo productType
[ ] Ẩn size selector cho ACCESSORY
[ ] Responsive: Modal vs Drawer
[ ] Keyboard navigation (ESC to close)
```

### 6.2 Integration Tests

```
[ ] Tạo sản phẩm với từng productType
[ ] Update size template và verify cache invalidation
[ ] Migration script không làm mất dữ liệu
[ ] API response bao gồm productType field
```

### 6.3 E2E Tests

```
[ ] User flow: Xem SP → Click Size Guide → Xem bảng size
[ ] Admin flow: Tạo SP → Chọn ProductType → Preview Size Guide
[ ] Admin flow: Sửa Size Template → Verify frontend updated
[ ] Mobile: Swipe down để đóng drawer
```

---

## 7. Đề Xuất Tối Ưu Bổ Sung

### 7.1 Analytics tracking

```typescript
// Track user interaction với Size Guide
const trackSizeGuideView = (productType: ProductType, productId: number) => {
  analytics.track('size_guide_viewed', {
    product_type: productType,
    product_id: productId,
    tab: 'chart', // chart | measure | convert
    timestamp: Date.now()
  });
};

// Insights:
// - ProductType nào được xem Size Guide nhiều nhất?
// - User có chuyển tab "Cách đo" không?
// - Tỷ lệ xem Size Guide → Add to cart?
```

### 7.2 A/B Testing popup style

```typescript
// Test Modal vs Drawer trên desktop
const SizeGuideContainer = () => {
  const variant = useABTest('size-guide-style'); // 'modal' | 'drawer' | 'sidebar'
  
  switch (variant) {
    case 'modal':
      return <SizeGuideModal />;
    case 'drawer':
      return <SizeGuideDrawer />;
    case 'sidebar':
      return <SizeGuideSidebar />; // Không đóng khi user scroll
  }
};
```

### 7.3 Size comparison với sản phẩm đã mua

```typescript
// Nếu user đã đăng nhập và từng mua SP cùng ProductType
const SizeRecommendation = ({ productType, currentSizes }) => {
  const { data: purchaseHistory } = usePurchaseHistory(productType);
  
  if (!purchaseHistory?.length) return null;
  
  const lastPurchase = purchaseHistory[0];
  
  return (
    <div className="bg-blue-50 p-3 rounded-lg">
      <p>💡 Gợi ý dựa trên lịch sử mua hàng:</p>
      <p>
        Bạn đã mua "{lastPurchase.productName}" size <strong>{lastPurchase.size}</strong> 
        và đánh giá "Vừa vặn".
      </p>
    </div>
  );
};
```

---

## 8. Tóm Tắt Action Items

### Ưu tiên cao (Trước khi deploy)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 1 | Thêm ProductType.SET cho combo Bra+Panty | Dev | [ ] |
| 2 | Tạo Zod schema validate customSizeChart | Dev | [ ] |
| 3 | Improve migration script với scoring + dry-run | Dev | [ ] |
| 4 | Unit tests cho core functions | Dev | [ ] |

### Ưu tiên trung bình (Sprint tiếp theo)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 5 | Implement caching strategy (Redis/React Query) | Dev | [ ] |
| 6 | Cho phép đổi ProductType (có điều kiện) | Dev | [ ] |
| 7 | Thêm audit log cho template changes | Dev | [ ] |
| 8 | E2E tests | QA | [ ] |

### Ưu tiên thấp (Backlog)

| # | Task | Owner | Status |
|---|------|-------|--------|
| 9 | Analytics tracking Size Guide | Dev | [ ] |
| 10 | A/B testing popup style | Product | [ ] |
| 11 | Size comparison với purchase history | Dev | [ ] |

---

**QA Review by:** Droid  
**Approved by:** _____________  
**Date:** 2026-01-10

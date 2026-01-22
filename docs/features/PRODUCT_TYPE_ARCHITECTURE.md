# Kiến Trúc Product Type - Giải Pháp Cân Bằng Marketing & Kỹ Thuật

> **Nguyên tắc cốt lõi:** Category (Danh mục) = ĐỘNG cho Marketing | Product Type (Loại SP) = CỨNG cho Kỹ thuật

---

## 1. Vấn Đề Hiện Tại

### 1.1 "Nỗi đau" của E-commerce

```
❌ Hardcode Category
   → Marketing khóc: Không tạo được "Sale 8/3", "BST Mùa Hè"

❌ Thả lỏng hoàn toàn  
   → Kỹ thuật khóc: Size Guide loạn, không biết hiện bảng nào
```

### 1.2 Hiện trạng hệ thống

```typescript
// Hiện tại: Size Guide dựa vào Category slug
const getCategoryChartKey = (categorySlug: string) => {
  // Mapping thủ công, dễ sai khi Admin tạo category mới
  if (categorySlug.includes("ao-lot")) return "ao-lot";
  if (categorySlug.includes("quan-lot")) return "quan-lot";
  return "default";
};
```

**Vấn đề:**
- Nếu Admin tạo category "Đồ lót gợi cảm" → Size Guide không nhận
- 1 sản phẩm có thể thuộc nhiều category → Không biết chọn bảng size nào
- Category phục vụ SEO/Marketing, không nên gắn với logic kỹ thuật

### 1.3 Schema hiện tại (Chưa tối ưu)

```prisma
model Product {
  categoryId   Int           // ← Chỉ có Category, thiếu Product Type
  category     Category
  // ... không có productType
}

model Category {
  // ← Admin tạo thoải mái, nhưng lại gắn với logic Size Guide
}
```

---

## 2. Giải Pháp: Tách Biệt Category và Product Type

### 2.1 Hai khái niệm cốt lõi

| Khái niệm | Mục đích | Tính chất | Ai quản lý | Ví dụ |
|-----------|----------|-----------|------------|-------|
| **Category** (Marketing) | Phân loại hiển thị, SEO, điều hướng, chạy Campaign | **ĐỘNG** - Admin tạo/sửa/xóa thoải mái | Admin/Marketing | "Hàng mới", "Sale 50%", "BST Valentine", "Đồ lót gợi cảm" |
| **Product Type** (Technical) | Quy định cấu trúc dữ liệu, bảng size, variant attributes | **CỨNG** - Dev định nghĩa trong code (Enum) | Developer | BRA, PANTY, SLEEPWEAR, SHAPEWEAR, ACCESSORY |

### 2.2 So sánh chi tiết

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CATEGORY (Danh mục)          PRODUCT TYPE (Loại SP)     │
├─────────────────────────────────────────────────────────────────────────────┤
│ Tính chất        │  ĐỘNG (Dynamic)              CỨNG (Hardcoded Enum)      │
│ Ai tạo           │  Admin tự tạo                Dev định nghĩa sẵn          │
│ Số lượng         │  Không giới hạn              5 loại cố định              │
│ Quan hệ SP       │  1-N (1 SP nhiều danh mục)   1-1 (1 SP = 1 loại)        │
│ Mục đích         │  Marketing, SEO, Menu        Kỹ thuật, Size Guide        │
│ Thay đổi         │  Thường xuyên                Hiếm khi (cần dev)          │
│ Ví dụ            │  "Sale 8/3", "Hàng mới"      BRA, PANTY, SLEEPWEAR       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Quan hệ với sản phẩm

```
┌─────────────────────────────────────────────────────────────────┐
│                         SẢN PHẨM                                │
│  "Áo lót ren quyến rũ ABC"                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Product Type: BRA (1-1)          Categories: (1-N)            │
│  ┌─────────────────┐              ┌─────────────────┐          │
│  │ ✓ Xác định      │              │ ✓ Áo lót        │          │
│  │   bảng size     │              │ ✓ Hàng mới về   │          │
│  │ ✓ 1 sản phẩm    │              │ ✓ Sale tháng 5  │          │
│  │   = 1 type      │              │ ✓ Best Seller   │          │
│  │ ✓ KHÔNG thay    │              │ ✓ Tự do gán     │          │
│  │   đổi sau tạo   │              │   bỏ bất cứ lúc │          │
│  └─────────────────┘              └─────────────────┘          │
│                                                                 │
│  → Size Guide hiển thị dựa vào Product Type (BRA)              │
│  → KHÔNG phụ thuộc vào Category nào SP đang nằm                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Ví dụ thực tế

```
Sản phẩm: "Áo lót ren hoa hồng"

✅ Product Type: BRA (cố định, quyết định bảng size Áo lót)

✅ Categories (Admin có thể gán/bỏ bất cứ lúc nào):
   - "Áo lót"           (danh mục chính)
   - "Hàng mới về"      (campaign tuần này)
   - "Sale Valentine"   (campaign 14/2)
   - "Best Seller"      (gắn vào top bán chạy)
   - "Đồ lót ren"       (phân loại theo chất liệu)

→ Dù SP nằm trong "Sale Valentine" hay "Hàng mới về",
  Size Guide luôn hiển thị bảng size BRA (Áo lót)
```

---

## 3. Định Nghĩa 6 Product Types Cốt Lõi

### 3.1 BRA - Áo lót / Áo ngực

```typescript
{
  type: "BRA",
  name: "Áo lót / Áo ngực",
  description: "Áo lót có gọng, không gọng, Push-up, Bralette, Sport bra có cup",
  sizeSystem: "BAND_CUP", // 70A, 75B, 80C hoặc 32A, 34B, 36C
  measurements: ["underBust", "bust", "cup"],
  sizeChart: {
    headers: ["Size", "Vòng ngực trên", "Vòng ngực dưới", "Cup"],
    sizes: [
      { size: "70A", bust: "78-80 cm", underBust: "68-72 cm", cup: "A" },
      { size: "70B", bust: "80-82 cm", underBust: "68-72 cm", cup: "B" },
      // ...
    ]
  }
}
```

### 3.2 PANTY - Quần lót

```typescript
{
  type: "PANTY",
  name: "Quần lót",
  description: "Thong, Bikini, Hipster, Boyshort, Quần lót ren/cotton",
  sizeSystem: "ALPHA", // XS, S, M, L, XL, XXL
  measurements: ["hips", "waist"],
  sizeChart: {
    headers: ["Size", "Vòng mông", "Vòng eo"],
    sizes: [
      { size: "S", hips: "86-90 cm", waist: "62-66 cm" },
      { size: "M", hips: "90-94 cm", waist: "66-70 cm" },
      // ...
    ]
  }
}
```

### 3.3 SLEEPWEAR - Đồ ngủ & Đồ mặc nhà

```typescript
{
  type: "SLEEPWEAR",
  name: "Đồ ngủ & Đồ mặc nhà",
  description: "Váy ngủ, Pyjamas, Áo choàng, Bodysuit, Đồ bộ",
  sizeSystem: "ALPHA_BODY", // S, M, L + thông số cơ thể
  measurements: ["height", "weight", "bust", "waist"],
  sizeChart: {
    headers: ["Size", "Chiều cao", "Cân nặng", "Vòng ngực", "Vòng eo"],
    sizes: [
      { size: "S", height: "150-158 cm", weight: "42-48 kg", bust: "78-84 cm", waist: "62-66 cm" },
      // ...
    ]
  }
}
```

### 3.4 SHAPEWEAR - Đồ định hình

```typescript
{
  type: "SHAPEWEAR",
  name: "Đồ định hình",
  description: "Gen nịt bụng, Quần gen, Corset, Latex",
  sizeSystem: "ALPHA_TIGHT", // XS-XL với thông số chặt hơn
  measurements: ["waist", "belly", "hips"],
  sizeChart: {
    headers: ["Size", "Vòng eo", "Vòng bụng dưới", "Vòng mông"],
    sizes: [
      { size: "S", waist: "60-64 cm", belly: "70-74 cm", hips: "84-88 cm" },
      // ...
    ]
  },
  note: "Đồ định hình có tính chất bó sát, size nhỏ hơn quần áo thường 1-2 size"
}
```

### 3.5 SET - Set đồ lót (Combo Bra + Panty)

```typescript
{
  type: "SET",
  name: "Set đồ lót",
  description: "Combo áo lót + quần lót bán theo bộ, size matching",
  sizeSystem: "SET_ALPHA", // S, M, L với mapping Bra + Panty size
  measurements: ["bust", "underBust", "hips", "waist"],
  sizeChart: {
    headers: ["Size Set", "Size Áo (Bra)", "Size Quần (Panty)", "Vòng ngực", "Vòng mông"],
    sizes: [
      { size: "S", braSize: "70A-70B", pantySize: "S", bust: "78-82 cm", hips: "86-90 cm" },
      { size: "M", braSize: "75A-75B", pantySize: "M", bust: "83-87 cm", hips: "90-94 cm" },
      { size: "L", braSize: "80A-80B", pantySize: "L", bust: "88-92 cm", hips: "94-98 cm" },
      { size: "XL", braSize: "85A-85B", pantySize: "XL", bust: "93-97 cm", hips: "98-102 cm" },
    ]
  },
  note: "Set đồ lót đã được phối màu và size matching. Chọn size theo vòng ngực là chính."
}
```

### 3.6 ACCESSORY - Phụ kiện (Không có size)

```typescript
{
  type: "ACCESSORY",
  name: "Phụ kiện",
  description: "Miếng dán ngực, dây áo thay thế, túi giặt, nước giặt",
  sizeSystem: "NONE", // Không có size
  measurements: [],
  sizeChart: null,
  hideSizeSelector: true,
  hideSizeGuide: true
}
```

---

## 4. Schema Database (Chi tiết)

### 4.1 Nguyên tắc thiết kế Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NGUYÊN TẮC SCHEMA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ProductType = ENUM (cứng trong code)                                   │
│     → Dev định nghĩa, không cho Admin thêm/sửa/xóa                         │
│     → Thay đổi cần migration + deploy                                       │
│                                                                             │
│  2. Category = TABLE (động trong database)                                  │
│     → Admin tạo/sửa/xóa thoải mái qua Dashboard                            │
│     → Không ảnh hưởng logic kỹ thuật                                       │
│                                                                             │
│  3. SizeChartTemplate = TABLE (bán động)                                   │
│     → Dev seed dữ liệu mặc định                                            │
│     → Admin có thể chỉnh sửa NỘI DUNG (số liệu)                           │
│     → Admin KHÔNG thể thêm/xóa template mới                                │
│                                                                             │
│  4. Product.customSizeChart = JSON (override)                              │
│     → Cho phép ghi đè bảng size riêng từng sản phẩm                        │
│     → Ưu tiên cao hơn template                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Cập nhật Prisma Schema

```prisma
// =============================================
// PRODUCT TYPE ENUM (CỨNG - Dev định nghĩa)
// =============================================
enum ProductType {
  BRA        // Áo lót - Size: Band + Cup (70A, 75B, 80C)
  PANTY      // Quần lót - Size: Alpha (S, M, L, XL)
  SET        // Set đồ lót (Bra + Panty) - Size: Alpha với mapping
  SLEEPWEAR  // Đồ ngủ & mặc nhà - Size: Alpha + Body (Height, Weight)
  SHAPEWEAR  // Đồ định hình - Size: Alpha (thông số chặt hơn)
  ACCESSORY  // Phụ kiện - KHÔNG CÓ SIZE
}

// =============================================
// PRODUCT MODEL (Cập nhật)
// =============================================
model Product {
  id           Int              @id @default(autoincrement())
  name         String
  slug         String           @unique
  description  String?          @db.Text
  price        Float
  salePrice    Float?
  
  // ========== PRODUCT TYPE (MỚI) ==========
  // Quyết định bảng size nào được hiển thị
  // Admin chọn 1 lần khi tạo sản phẩm, không đổi sau đó
  productType  ProductType      @default(SLEEPWEAR)
  
  // Override bảng size riêng cho SP này (nếu cần)
  // NULL = dùng template mặc định theo productType
  customSizeChart Json?
  
  // ========== CATEGORY (GIỮ NGUYÊN) ==========
  // Admin gán/bỏ thoải mái cho mục đích Marketing
  categoryId   Int
  category     Category         @relation(fields: [categoryId], references: [id])
  
  // Nếu cần Many-to-Many categories (tương lai)
  // categories   ProductCategory[]
  
  // ... các fields khác giữ nguyên
  images       ProductImage[]
  variants     ProductVariant[]
  // ...
  
  @@index([productType])           // Index để query theo loại
  @@index([categoryId])
}

// =============================================
// CATEGORY MODEL (GIỮ NGUYÊN - ĐỘNG)
// =============================================
model Category {
  id         Int                 @id @default(autoincrement())
  name       String              // Admin tự đặt tên
  slug       String              @unique
  image      String?
  
  // Metadata cho SEO/Marketing
  description String?            @db.Text
  metaTitle   String?
  metaDesc    String?
  
  // Phân cấp (nếu cần)
  parentId   Int?
  parent     Category?           @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children   Category[]          @relation("CategoryHierarchy")
  
  products   Product[]
  // ...
}

// =============================================
// SIZE CHART TEMPLATE (MỚI - BÁN ĐỘNG)
// =============================================
model SizeChartTemplate {
  id          Int         @id @default(autoincrement())
  
  // Link với Product Type (1-1)
  productType ProductType @unique
  
  // Thông tin hiển thị
  name        String      // "Áo lót", "Quần lót", "Đồ ngủ"
  description String?     @db.Text
  
  // Dữ liệu bảng size (JSON)
  headers     Json        // ["Size", "Vòng ngực", "Vòng ngực dưới", "Cup"]
  sizes       Json        // [{ size: "70A", bust: "78-80", ... }, ...]
  
  // Hướng dẫn cách đo (JSON)
  measurements Json       // [{ name: "Vòng ngực", description: "Đo ngang..." }, ...]
  
  // Mẹo chọn size (JSON)
  tips        Json        // ["Nếu phân vân...", "Đo vào buổi sáng..."]
  
  // Quy đổi quốc tế (JSON) - Optional
  internationalSizes Json? // { "US": {...}, "UK": {...}, "EU": {...} }
  
  // Hình ảnh minh họa
  measurementImage String? // URL ảnh hướng dẫn đo
  
  // Trạng thái
  isActive    Boolean     @default(true)
  
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}
```

### 4.3 Validation Schema cho customSizeChart (Zod)

```typescript
// backend/src/schemas/size-chart.schema.ts
import { z } from 'zod';

// Schema cho từng entry trong bảng size
const SizeEntrySchema = z.object({
  size: z.string().min(1, 'Size không được để trống'),
  bust: z.string().optional(),
  underBust: z.string().optional(),
  cup: z.string().optional(),
  waist: z.string().optional(),
  hips: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  braSize: z.string().optional(),    // Cho SET type
  pantySize: z.string().optional(),  // Cho SET type
  belly: z.string().optional(),      // Cho SHAPEWEAR
});

// Schema cho hướng dẫn cách đo
const MeasurementStepSchema = z.object({
  name: z.string().min(1, 'Tên bước đo không được để trống'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  image: z.string().url().optional(),
});

// Schema chính cho customSizeChart
export const CustomSizeChartSchema = z.object({
  name: z.string().min(1, 'Tên bảng size không được để trống'),
  headers: z.array(z.string()).min(2, 'Cần ít nhất 2 cột (Size + 1 thông số)'),
  sizes: z.array(SizeEntrySchema).min(1, 'Cần ít nhất 1 dòng size'),
  measurements: z.array(MeasurementStepSchema).optional(),
  tips: z.array(z.string()).optional(),
  note: z.string().optional(),
});

// Type inference từ schema
export type CustomSizeChart = z.infer<typeof CustomSizeChartSchema>;

// Validation function
export const validateCustomSizeChart = (data: unknown): CustomSizeChart => {
  const result = CustomSizeChartSchema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid customSizeChart:\n${errors.join('\n')}`);
  }
  
  return result.data;
};

// Sử dụng trong API
// PUT /api/admin/products/:id
app.put('/api/admin/products/:id', async (req, res) => {
  const { customSizeChart, ...productData } = req.body;
  
  // Validate nếu có customSizeChart
  if (customSizeChart) {
    try {
      validateCustomSizeChart(customSizeChart);
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid customSizeChart format',
        details: error.message 
      });
    }
  }
  
  // Tiếp tục lưu vào DB...
});
```

### 4.4 Luồng xác định Size Guide

```typescript
// Logic ưu tiên khi hiển thị Size Guide
const getSizeChartForProduct = async (product: Product) => {
  // 1. Ưu tiên 1: Custom size chart của sản phẩm
  if (product.customSizeChart) {
    return product.customSizeChart;
  }
  
  // 2. Ưu tiên 2: Template theo Product Type
  const template = await prisma.sizeChartTemplate.findUnique({
    where: { productType: product.productType }
  });
  
  if (template) {
    return {
      name: template.name,
      headers: template.headers,
      sizes: template.sizes,
      measurements: template.measurements,
      tips: template.tips,
    };
  }
  
  // 3. Fallback: Trả về default
  return DEFAULT_SIZE_CHART;
};
```

### 4.5 Xử lý ACCESSORY (Không có size)

```typescript
// Frontend: Ẩn UI size cho phụ kiện
const ProductPage = ({ product }) => {
  const isAccessory = product.productType === 'ACCESSORY';
  
  return (
    <div>
      {/* Không hiện chọn size nếu là phụ kiện */}
      {!isAccessory && (
        <>
          <SizeSelector variants={product.variants} />
          <SizeGuideButton productType={product.productType} />
        </>
      )}
      
      {/* Nút thêm giỏ hàng luôn hiện */}
      <AddToCartButton product={product} />
    </div>
  );
};
```

### 4.6 Luồng dữ liệu tổng quan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LUỒNG DỮ LIỆU SIZE GUIDE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ADMIN TẠO SẢN PHẨM                                                        │
│       │                                                                     │
│       ▼                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Chọn PRODUCT TYPE (bắt buộc, 1 lần)                              │   │
│  │    [▼ Áo lót (BRA)]                                                 │   │
│  │                                                                     │   │
│  │ 2. Hệ thống TỰ ĐỘNG load Size Chart Template của BRA               │   │
│  │    ┌─────────────────────────────────────────────────────────┐     │   │
│  │    │ Preview: Bảng size Áo lót                               │     │   │
│  │    │ Size  │ Vòng ngực │ Vòng ngực dưới │ Cup               │     │   │
│  │    │ 70A   │ 78-80     │ 68-72          │ A                 │     │   │
│  │    └─────────────────────────────────────────────────────────┘     │   │
│  │                                                                     │   │
│  │ 3. Admin chọn Categories (thoải mái, nhiều danh mục)               │   │
│  │    ☑ Áo lót  ☑ Hàng mới  ☑ Sale 50%  ☐ Best Seller                │   │
│  │                                                                     │   │
│  │ 4. (Optional) Override bảng size riêng?                            │   │
│  │    ☐ Sử dụng bảng size riêng cho sản phẩm này                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│       │                                                                     │
│       ▼                                                                     │
│  FRONTEND HIỂN THỊ SIZE GUIDE                                              │
│       │                                                                     │
│       ├─── Có customSizeChart? ───► Hiển thị bảng size riêng              │
│       │                                                                     │
│       └─── Không? ───► Lấy template theo productType (BRA)                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Quản Lý Sản Phẩm Cho Admin (Chi tiết)

### 5.1 Giao diện tạo/sửa sản phẩm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        THÊM SẢN PHẨM MỚI                              [×]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  THÔNG TIN CƠ BẢN                                                          │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Tên sản phẩm *                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Áo lót ren hoa hồng quyến rũ                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Mô tả                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Áo lót ren cao cấp, thiết kế tinh tế...                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  PHÂN LOẠI SẢN PHẨM                                                        │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Loại sản phẩm * ⓘ                        Danh mục (Marketing)            │
│  ┌───────────────────────────┐            ┌───────────────────────────┐   │
│  │ ▼ Áo lót (BRA)            │            │ ☑ Áo lót                  │   │
│  ├───────────────────────────┤            │ ☑ Hàng mới về             │   │
│  │   Áo lót (BRA)          ← │            │ ☑ Sale Valentine          │   │
│  │   Quần lót (PANTY)        │            │ ☐ Best Seller             │   │
│  │   Đồ ngủ (SLEEPWEAR)      │            │ ☐ Đồ lót gợi cảm          │   │
│  │   Đồ định hình (SHAPEWEAR)│            │ [+ Thêm danh mục mới]     │   │
│  │   Phụ kiện (ACCESSORY)    │            └───────────────────────────┘   │
│  └───────────────────────────┘                                             │
│                                                                             │
│  ⚠️ Loại sản phẩm quyết định bảng size hiển thị.                          │
│     Không thể thay đổi sau khi tạo sản phẩm.                               │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  BẢNG SIZE (Tự động theo loại sản phẩm)                                    │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  📋 Preview bảng size: Áo lót                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Size  │ Vòng ngực trên │ Vòng ngực dưới │ Cup                       │   │
│  │ 70A   │ 78-80 cm       │ 68-72 cm       │ A                         │   │
│  │ 70B   │ 80-82 cm       │ 68-72 cm       │ B                         │   │
│  │ 75A   │ 83-85 cm       │ 73-77 cm       │ A                         │   │
│  │ ...   │ ...            │ ...            │ ...                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ☐ Sử dụng bảng size riêng cho sản phẩm này                               │
│    └─► [Upload ảnh] hoặc [Nhập thông số] (hiện khi tick)                  │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│  GIÁ & BIẾN THỂ                                                            │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Giá gốc *          Giá sale                                               │
│  ┌───────────────┐  ┌───────────────┐                                      │
│  │ 350,000 VNĐ   │  │ 280,000 VNĐ   │                                      │
│  └───────────────┘  └───────────────┘                                      │
│                                                                             │
│  Biến thể (Size + Màu)                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Size     │ Màu      │ SKU           │ Tồn kho │ Giá riêng           │   │
│  │ 70A      │ Đỏ       │ BRA-70A-RED   │ 10      │ -                   │   │
│  │ 70B      │ Đỏ       │ BRA-70B-RED   │ 15      │ -                   │   │
│  │ 75A      │ Đen      │ BRA-75A-BLK   │ 8       │ -                   │   │
│  │ [+ Thêm biến thể]                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                         [Hủy]  [Lưu nháp]  [Xuất bản]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Logic xử lý khi chọn Product Type

```typescript
// Admin chọn Product Type từ dropdown
const handleProductTypeChange = (type: ProductType) => {
  // 1. Cập nhật state
  setProductType(type);
  
  // 2. Load template tương ứng để preview
  const template = SIZE_CHART_TEMPLATES[type];
  setSizeChartPreview(template);
  
  // 3. Load danh sách size có sẵn cho variants
  const availableSizes = getAvailableSizes(type);
  setAvailableSizes(availableSizes);
  // BRA: ["70A", "70B", "75A", "75B", "80A", ...]
  // PANTY: ["S", "M", "L", "XL", "XXL"]
  // ACCESSORY: [] (không có size)
  
  // 4. Nếu là ACCESSORY, ẩn phần variants size
  if (type === 'ACCESSORY') {
    setShowSizeSelector(false);
    setShowSizeGuidePreview(false);
  }
};
```

### 5.3 Trang quản lý Size Chart Templates (Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  QUẢN LÝ BẢNG SIZE                                              [Cài đặt]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Chọn loại sản phẩm để chỉnh sửa bảng size:                                │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │    👙        │  │    🩲        │  │    👗        │  │    🎀        │   │
│  │   Áo lót     │  │  Quần lót    │  │   Đồ ngủ     │  │ Đồ định hình │   │
│  │    (BRA)     │  │   (PANTY)    │  │ (SLEEPWEAR)  │  │ (SHAPEWEAR)  │   │
│  │   [Sửa]      │  │   [Sửa]      │  │   [Sửa]      │  │   [Sửa]      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ⓘ Phụ kiện (ACCESSORY) không có bảng size                                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ══════════════════════════════════════════════════════════════════════    │
│  CHỈNH SỬA BẢNG SIZE: ÁO LÓT (BRA)                                        │
│  ══════════════════════════════════════════════════════════════════════    │
│                                                                             │
│  Tên hiển thị: [Áo lót                    ]                                │
│  Mô tả:        [Bảng size cho áo lót có gọng, push-up, bralette...]       │
│                                                                             │
│  BẢNG THÔNG SỐ                                              [+ Thêm cột]   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [Size]    │ [Vòng ngực trên] │ [Vòng ngực dưới] │ [Cup]    │ [×]   │   │
│  │ 70A       │ 78-80 cm         │ 68-72 cm         │ A        │       │   │
│  │ 70B       │ 80-82 cm         │ 68-72 cm         │ B        │       │   │
│  │ 70C       │ 82-84 cm         │ 68-72 cm         │ C        │       │   │
│  │ [+ Thêm size]                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  HƯỚNG DẪN CÁCH ĐO                                         [+ Thêm bước]   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Vòng ngực trên: [Đo ngang qua điểm cao nhất của ngực...      ]  │   │
│  │ 2. Vòng ngực dưới: [Đo sát phía dưới ngực, vòng quanh lưng...   ]  │   │
│  │ 3. Xác định Cup:   [Cup = Vòng trên - Vòng dưới. 10cm=A, 12.5=B ]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  HÌNH MINH HỌA                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [📷 Upload ảnh hướng dẫn đo]                                        │   │
│  │                                                                     │   │
│  │ Ảnh hiện tại: measurement-bra.png                          [Xóa]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MẸO CHỌN SIZE                                                [+ Thêm]    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ • [Đo khi không mặc áo lót hoặc mặc áo không đệm                ]  │   │
│  │ • [Nếu phân vân giữa 2 size, chọn size lớn hơn                  ]  │   │
│  │ • [Dây áo không nên để lỏng quá hoặc chặt quá                   ]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                            [Hủy thay đổi]  [Lưu]           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Validation rules cho Admin

```typescript
// Validation khi tạo/sửa sản phẩm
const productValidation = {
  // Product Type là bắt buộc
  productType: {
    required: true,
    message: "Vui lòng chọn loại sản phẩm"
  },
  
  // Category là bắt buộc ít nhất 1
  categories: {
    required: true,
    min: 1,
    message: "Vui lòng chọn ít nhất 1 danh mục"
  },
  
  // Variants theo Product Type
  variants: {
    validate: (variants, productType) => {
      if (productType === 'ACCESSORY') {
        // Phụ kiện không cần size, chỉ cần số lượng
        return variants.every(v => !v.size && v.stock >= 0);
      }
      // Các loại khác cần có size
      return variants.every(v => v.size && v.stock >= 0);
    }
  }
};

// Không cho phép sửa Product Type sau khi tạo
const canEditProductType = (product: Product) => {
  return !product.id; // Chỉ cho phép khi tạo mới
};
```

---

## 6. Size Guide Popup - Tối Ưu UX

### 6.1 Thiết kế Popup/Drawer hiện đại

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRANG SẢN PHẨM                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐   Áo lót ren hoa hồng quyến rũ                        │
│  │                 │   ⭐⭐⭐⭐⭐ (45 đánh giá)                              │
│  │   [Ảnh SP]      │                                                        │
│  │                 │   350.000₫  ̶2̶8̶0̶.̶0̶0̶0̶₫̶  (-20%)                         │
│  │                 │                                                        │
│  └─────────────────┘   Màu sắc:  [Đỏ] [Đen] [Nude]                         │
│                                                                             │
│                        Kích cỡ:                                             │
│                        [70A] [70B] [75A] [75B] [80A] [80B]                  │
│                                                                             │
│                        📏 Hướng dẫn chọn size  ← Click để mở popup         │
│                                                                             │
│                        [  🛒 THÊM VÀO GIỎ HÀNG  ]                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

                                    │
                                    │ Click
                                    ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                        [×]  │
│                        HƯỚNG DẪN CHỌN SIZE                                 │
│                        Áo Lót                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │   📊 Bảng size  │ │  📐 Cách đo     │ │  🌍 Quy đổi QT  │ ← 3 Tabs     │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Size  │ Vòng ngực trên │ Vòng ngực dưới │ Cup                       │   │
│  ├───────┼────────────────┼────────────────┼───────────────────────────┤   │
│  │ 70A   │ 78-80 cm       │ 68-72 cm       │ A                         │   │
│  │ 70B   │ 80-82 cm       │ 68-72 cm       │ B    ← Highlight         │   │
│  │ 75A   │ 83-85 cm       │ 73-77 cm       │ A       nếu đã chọn      │   │
│  │ 75B   │ 85-87 cm       │ 73-77 cm       │ B                         │   │
│  │ 80A   │ 88-90 cm       │ 78-82 cm       │ A                         │   │
│  │ 80B   │ 90-92 cm       │ 78-82 cm       │ B                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 💡 Mẹo: Nếu phân vân giữa 2 size, hãy chọn size lớn hơn            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  🎯 GỢI Ý SIZE CHO BẠN (Optional Feature)                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Nhập số đo của bạn để được gợi ý size phù hợp:                      │   │
│  │                                                                     │   │
│  │ Vòng ngực trên: [    ] cm    Vòng ngực dưới: [    ] cm             │   │
│  │                                                                     │   │
│  │                            [Gợi ý size cho tôi]                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│                                                     [Đóng]                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Tab "Cách đo" với hình minh họa

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📐 CÁCH ĐO CHÍNH XÁC                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────┐                                     │
│  │                                   │                                     │
│  │       [HÌNH MINH HỌA]            │                                     │
│  │       Cách đo vòng ngực          │                                     │
│  │                                   │                                     │
│  └───────────────────────────────────┘                                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ① VÒNG NGỰC TRÊN                                                    │   │
│  │                                                                     │   │
│  │ Đo ngang qua điểm cao nhất của ngực. Giữ thước dây song song       │   │
│  │ với mặt đất, không siết quá chặt.                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ② VÒNG NGỰC DƯỚI                                                    │   │
│  │                                                                     │   │
│  │ Đo sát phía dưới ngực, vòng quanh lưng. Thước dây nên ôm sát       │   │
│  │ nhưng thoải mái.                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ③ XÁC ĐỊNH CUP                                                      │   │
│  │                                                                     │   │
│  │ Cup = Vòng ngực trên - Vòng ngực dưới                              │   │
│  │ • Chênh lệch 10cm = Cup A                                          │   │
│  │ • Chênh lệch 12.5cm = Cup B                                        │   │
│  │ • Chênh lệch 15cm = Cup C                                          │   │
│  │ • Chênh lệch 17.5cm = Cup D                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  💡 Đo vào buổi sáng hoặc trưa để có kết quả chính xác nhất.              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Tab "Quy đổi quốc tế" (Đặc biệt quan trọng với Bra)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🌍 QUY ĐỔI SIZE QUỐC TẾ                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Đơn vị hiển thị: [▼ Việt Nam (VN)]  [US]  [UK]  [EU]                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VN (Chúng tôi) │ US        │ UK        │ EU                         │   │
│  ├────────────────┼───────────┼───────────┼────────────────────────────┤   │
│  │ 70A            │ 32A       │ 32A       │ 70A                        │   │
│  │ 70B            │ 32B       │ 32B       │ 70B                        │   │
│  │ 75A            │ 34A       │ 34A       │ 75A                        │   │
│  │ 75B            │ 34B       │ 34B       │ 75B                        │   │
│  │ 80A            │ 36A       │ 36A       │ 80A                        │   │
│  │ 80B            │ 36B       │ 36B       │ 80B                        │   │
│  │ 85B            │ 38B       │ 38B       │ 85B                        │   │
│  │ 85C            │ 38C       │ 38C       │ 85C                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ⓘ Bảng quy đổi mang tính tham khảo. Size có thể khác nhau tùy brand.     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Component Implementation (React)

```tsx
// SizeGuideModal.tsx - Cập nhật để dùng Product Type
interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  productType: ProductType;        // Thay categorySlug bằng productType
  customSizeChart?: SizeChartData; // Override nếu có
  selectedSize?: string;           // Highlight size đang chọn
}

const SizeGuideModal = ({ 
  isOpen, 
  onClose, 
  productType, 
  customSizeChart,
  selectedSize 
}: SizeGuideModalProps) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'measure' | 'convert'>('chart');
  const [chartData, setChartData] = useState<SizeChartData | null>(null);

  useEffect(() => {
    // Ưu tiên 1: Custom size chart
    if (customSizeChart) {
      setChartData(customSizeChart);
      return;
    }
    
    // Ưu tiên 2: Load từ template theo productType
    const loadTemplate = async () => {
      const template = await fetchSizeTemplate(productType);
      setChartData(template);
    };
    
    loadTemplate();
  }, [productType, customSizeChart]);

  // Không hiện modal cho ACCESSORY
  if (productType === 'ACCESSORY') return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <DialogHeader>
          <DialogTitle>Hướng dẫn chọn size</DialogTitle>
          <DialogDescription>{chartData?.categoryName}</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="chart">📊 Bảng size</TabsTrigger>
            <TabsTrigger value="measure">📐 Cách đo</TabsTrigger>
            <TabsTrigger value="convert">🌍 Quy đổi QT</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="overflow-y-auto max-h-[60vh]">
            <SizeChartTable 
              data={chartData} 
              highlightSize={selectedSize} 
            />
            <SizeTips tips={chartData?.tips} />
          </TabsContent>

          <TabsContent value="measure">
            <MeasurementGuide 
              steps={chartData?.measurements}
              image={chartData?.measurementImage}
            />
          </TabsContent>

          <TabsContent value="convert">
            <InternationalSizeChart 
              data={chartData?.internationalSizes}
              productType={productType}
            />
          </TabsContent>
        </Tabs>

        {/* Size Calculator (Optional) */}
        <SizeCalculator productType={productType} />
      </DialogContent>
    </Dialog>
  );
};
```

### 6.5 Responsive Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RESPONSIVE BREAKPOINTS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DESKTOP (≥1024px)                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Modal centered, max-width: 640px                                    │   │
│  │ Bảng size hiển thị đầy đủ cột                                       │   │
│  │ 3 tabs nằm ngang                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  TABLET (768px - 1023px)                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Modal full-width - 40px padding                                     │   │
│  │ Bảng size scroll ngang nếu cần                                      │   │
│  │ 3 tabs với icon + text ngắn                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  MOBILE (<768px)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ DRAWER từ dưới lên (thay vì Modal)                                  │   │
│  │ Full-width, height: 85vh                                            │   │
│  │ Tabs chỉ hiện icon                                                  │   │
│  │ Bảng size scroll ngang với sticky cột Size                          │   │
│  │ Nút đóng to và dễ bấm                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.6 Animation & Interaction

```typescript
// Framer Motion animations
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 }
  }
};

// Mobile Drawer animation
const drawerVariants = {
  hidden: { y: "100%" },
  visible: { 
    y: 0,
    transition: { type: "spring", damping: 25, stiffness: 300 }
  },
  exit: { y: "100%" }
};

// Interactions
const interactions = {
  // Đóng bằng ESC
  onKeyDown: (e) => e.key === 'Escape' && onClose(),
  
  // Đóng khi click backdrop
  onBackdropClick: onClose,
  
  // Swipe down để đóng (mobile)
  onSwipeDown: onClose,
  
  // Focus trap trong modal
  trapFocus: true,
  
  // Disable body scroll khi mở
  lockBodyScroll: true
};
```

---

## 7. Kế Hoạch Triển Khai

### Phase 1: Database & Backend (Ưu tiên cao)

```
Thời gian dự kiến: 2-3 ngày

1.1 Cập nhật Prisma schema
    ├─ Thêm enum ProductType (5 loại)
    ├─ Thêm field productType vào model Product
    ├─ Thêm field customSizeChart (Json?) vào Product
    └─ Tạo model SizeChartTemplate
    
1.2 Migration & Seed
    ├─ Chạy prisma migrate
    ├─ Seed 4 SizeChartTemplate mặc định (BRA, PANTY, SLEEPWEAR, SHAPEWEAR)
    └─ Migration script: Gán productType cho products hiện có dựa vào category
    
1.3 API Backend
    ├─ GET  /api/size-templates           (public - cho frontend)
    ├─ GET  /api/size-templates/:type     (public - lấy 1 template)
    ├─ GET  /api/admin/size-templates     (admin - danh sách)
    └─ PUT  /api/admin/size-templates/:type (admin - cập nhật)
```

### Phase 2: Admin Dashboard

```
Thời gian dự kiến: 3-4 ngày

2.1 Trang quản lý Size Templates (/admin/settings/size-charts)
    ├─ Danh sách 4 Product Types với nút [Sửa]
    ├─ Form chỉnh sửa: headers, sizes, measurements, tips
    ├─ Upload hình minh họa cách đo
    └─ Preview bảng size trước khi lưu
    
2.2 Cập nhật form tạo/sửa sản phẩm
    ├─ Dropdown chọn Product Type (bắt buộc, disabled khi edit)
    ├─ Preview bảng size tự động khi chọn type
    ├─ Checkbox "Override bảng size riêng"
    ├─ Form nhập customSizeChart nếu override
    └─ Ẩn phần chọn size variant nếu là ACCESSORY
```

### Phase 3: Frontend

```
Thời gian dự kiến: 2-3 ngày

3.1 Cập nhật Size Guide Modal
    ├─ Nhận prop productType thay vì categorySlug
    ├─ Fetch template từ API theo productType
    ├─ Ưu tiên customSizeChart nếu có
    ├─ Thêm tab "Quy đổi quốc tế"
    └─ Highlight size đang chọn
    
3.2 Xử lý ACCESSORY
    ├─ Ẩn component SizeSelector
    ├─ Ẩn nút "Hướng dẫn chọn size"
    └─ Chỉ hiện số lượng + nút mua
    
3.3 Responsive & UX
    ├─ Desktop: Modal centered
    ├─ Mobile: Drawer từ dưới lên
    └─ Animation mượt mà
```

### Phase 4: Enhancement (Tùy chọn)

```
Thời gian dự kiến: 2-3 ngày (nếu làm)

4.1 Size Recommender (Gợi ý size)
    ├─ Form nhập số đo (vòng ngực, eo, mông)
    ├─ Algorithm gợi ý size phù hợp
    └─ Hiển thị: "85% khách hàng có số đo như bạn mặc vừa size 75B"
    
4.2 Quy đổi quốc tế
    ├─ Data mapping VN ↔ US ↔ UK ↔ EU
    └─ Tab chuyển đổi trong popup
    
4.3 Lưu "Size của tôi"
    ├─ User đăng nhập có thể lưu số đo
    └─ Tự động gợi ý size khi xem sản phẩm
```

---

## 8. Migration Strategy (Chuyển đổi dữ liệu)

### 8.1 Script migration cho products hiện có (Improved với Scoring System)

```typescript
// prisma/migrations/scripts/migrate-product-types.ts

// Keywords cho từng Product Type (nhiều keywords = chính xác hơn)
const PRODUCT_TYPE_KEYWORDS: Record<ProductType, string[]> = {
  BRA: [
    'áo lót', 'áo ngực', 'bra', 'push-up', 'bralette', 
    'áo nịt ngực', 'sport bra', 'wireless', 'có gọng', 'không gọng'
  ],
  PANTY: [
    'quần lót', 'panty', 'thong', 'bikini', 'boyshort',
    'quần chip', 'quần tam giác', 'hipster', 'brief'
  ],
  SET: [
    'set đồ lót', 'bộ đồ lót', 'combo', 'set nội y',
    'lingerie set', 'bộ nội y', 'set sexy'
  ],
  SHAPEWEAR: [
    'gen', 'định hình', 'corset', 'nịt bụng', 'shapewear',
    'waist trainer', 'body shaper', 'latex'
  ],
  SLEEPWEAR: [
    'đồ ngủ', 'váy ngủ', 'pyjama', 'bodysuit', 'đồ mặc nhà',
    'sleepwear', 'nightgown', 'robe', 'kimono', 'đồ bộ'
  ],
  ACCESSORY: [
    'miếng dán', 'dây áo', 'túi giặt', 'phụ kiện',
    'nipple cover', 'bra strap', 'laundry bag', 'móc áo'
  ]
};

// Scoring system: Đếm số keywords match
const detectProductType = (name: string, categorySlug: string): { type: ProductType; confidence: number } => {
  const scores: Record<ProductType, number> = {
    BRA: 0, PANTY: 0, SET: 0, SLEEPWEAR: 0, SHAPEWEAR: 0, ACCESSORY: 0
  };
  
  const textToCheck = `${name.toLowerCase()} ${categorySlug.toLowerCase()}`;
  
  // Tính score cho mỗi type
  for (const [type, keywords] of Object.entries(PRODUCT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textToCheck.includes(keyword.toLowerCase())) {
        scores[type as ProductType] += 1;
      }
    }
  }
  
  // SET có priority cao nếu match cả BRA và PANTY keywords
  if (scores.BRA > 0 && scores.PANTY > 0) {
    scores.SET += 3; // Boost SET score
  }
  
  // ACCESSORY keywords có priority cao (tránh nhầm với tên SP có chứa "áo lót")
  // VD: "Túi đựng áo lót" → ACCESSORY, không phải BRA
  if (scores.ACCESSORY > 0 && textToCheck.includes('túi')) {
    scores.ACCESSORY += 2;
  }
  
  // Tìm type với score cao nhất
  const maxScore = Math.max(...Object.values(scores));
  const detectedType = maxScore > 0 
    ? (Object.entries(scores).find(([_, s]) => s === maxScore)?.[0] as ProductType)
    : 'SLEEPWEAR'; // default
  
  // Tính confidence (0-100%)
  const totalKeywords = Object.values(PRODUCT_TYPE_KEYWORDS).flat().length;
  const confidence = maxScore > 0 ? Math.min((maxScore / 3) * 100, 100) : 0;
  
  return { type: detectedType, confidence: Math.round(confidence) };
};

// Migration với DRY-RUN mode
const migrateProductTypes = async (dryRun = true) => {
  const products = await prisma.product.findMany({
    include: { category: true }
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Migration ${dryRun ? '(DRY-RUN)' : '(EXECUTING)'}: ${products.length} products`);
  console.log(`${'='.repeat(60)}\n`);
  
  const results: Array<{
    id: number;
    name: string;
    category: string;
    detectedType: ProductType;
    confidence: number;
  }> = [];
  
  for (const product of products) {
    const { type, confidence } = detectProductType(
      product.name, 
      product.category?.slug || ''
    );
    
    results.push({
      id: product.id,
      name: product.name,
      category: product.category?.name || 'N/A',
      detectedType: type,
      confidence
    });
    
    // Chỉ update nếu không phải dry-run
    if (!dryRun) {
      await prisma.product.update({
        where: { id: product.id },
        data: { productType: type }
      });
    }
    
    // Log với màu theo confidence
    const confidenceColor = confidence >= 70 ? '✅' : confidence >= 40 ? '⚠️' : '❓';
    console.log(`${confidenceColor} [${confidence}%] ${product.name} → ${type}`);
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY:');
  const summary = results.reduce((acc, r) => {
    acc[r.detectedType] = (acc[r.detectedType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(summary).forEach(([type, count]) => {
    console.log(`  ${type}: ${count} products`);
  });
  
  // Warning cho low confidence
  const lowConfidence = results.filter(r => r.confidence < 40);
  if (lowConfidence.length > 0) {
    console.log(`\n⚠️  ${lowConfidence.length} products có confidence thấp (<40%), cần review thủ công:`);
    lowConfidence.forEach(r => console.log(`   - [${r.id}] ${r.name}`));
  }
  
  if (dryRun) {
    console.log(`\n📝 Đây là DRY-RUN. Chạy lại với dryRun=false để apply changes.`);
  } else {
    console.log(`\n✅ Migration completed!`);
  }
  
  return results;
};

// Usage:
// npx ts-node prisma/migrations/scripts/migrate-product-types.ts --dry-run
// npx ts-node prisma/migrations/scripts/migrate-product-types.ts --execute
```

### 8.2 Seed data cho Size Chart Templates (Đầy đủ 5 templates)

```typescript
// prisma/seed-size-templates.ts
const sizeTemplates = [
  {
    productType: "BRA",
    name: "Áo lót",
    headers: ["Size", "Vòng ngực trên", "Vòng ngực dưới", "Cup"],
    sizes: [
      { size: "70A", bust: "78-80 cm", underBust: "68-72 cm", cup: "A" },
      { size: "70B", bust: "80-82 cm", underBust: "68-72 cm", cup: "B" },
      { size: "70C", bust: "82-84 cm", underBust: "68-72 cm", cup: "C" },
      { size: "75A", bust: "83-85 cm", underBust: "73-77 cm", cup: "A" },
      { size: "75B", bust: "85-87 cm", underBust: "73-77 cm", cup: "B" },
      { size: "75C", bust: "87-89 cm", underBust: "73-77 cm", cup: "C" },
      { size: "80A", bust: "88-90 cm", underBust: "78-82 cm", cup: "A" },
      { size: "80B", bust: "90-92 cm", underBust: "78-82 cm", cup: "B" },
      { size: "80C", bust: "92-94 cm", underBust: "78-82 cm", cup: "C" },
      { size: "85B", bust: "95-97 cm", underBust: "83-87 cm", cup: "B" },
      { size: "85C", bust: "97-99 cm", underBust: "83-87 cm", cup: "C" },
      { size: "85D", bust: "99-101 cm", underBust: "83-87 cm", cup: "D" },
    ],
    measurements: [
      { name: "Vòng ngực trên", description: "Đo ngang qua điểm cao nhất của ngực. Giữ thước dây song song với mặt đất." },
      { name: "Vòng ngực dưới", description: "Đo sát phía dưới ngực, vòng quanh lưng. Thước dây ôm sát nhưng thoải mái." },
      { name: "Xác định Cup", description: "Cup = Vòng trên - Vòng dưới. Chênh 10cm=A, 12.5cm=B, 15cm=C, 17.5cm=D." },
    ],
    tips: [
      "Đo khi không mặc áo lót hoặc mặc áo không đệm",
      "Nếu phân vân giữa 2 size, chọn size lớn hơn",
      "Đo vào buổi sáng hoặc trưa để có kết quả chính xác"
    ]
  },
  {
    productType: "PANTY",
    name: "Quần lót",
    headers: ["Size", "Vòng mông", "Vòng eo"],
    sizes: [
      { size: "S", hips: "86-90 cm", waist: "62-66 cm" },
      { size: "M", hips: "90-94 cm", waist: "66-70 cm" },
      { size: "L", hips: "94-98 cm", waist: "70-74 cm" },
      { size: "XL", hips: "98-102 cm", waist: "74-78 cm" },
      { size: "XXL", hips: "102-106 cm", waist: "78-82 cm" },
    ],
    measurements: [
      { name: "Vòng mông", description: "Đo ngang qua điểm nở nhất của mông. Đứng thẳng, hai chân khép lại." },
      { name: "Vòng eo", description: "Đo ngang qua điểm nhỏ nhất của eo (thường trên rốn 2-3cm)." },
    ],
    tips: [
      "Chọn size dựa trên vòng mông là chính xác nhất",
      "Quần lót cotton nên chọn vừa, không quá chật",
      "Quần ren có thể chọn size nhỏ hơn vì co giãn tốt"
    ]
  },
  {
    productType: "SET",
    name: "Set đồ lót",
    headers: ["Size Set", "Size Áo (Bra)", "Size Quần (Panty)", "Vòng ngực", "Vòng mông"],
    sizes: [
      { size: "S", braSize: "70A-70B", pantySize: "S", bust: "78-82 cm", hips: "86-90 cm" },
      { size: "M", braSize: "75A-75B", pantySize: "M", bust: "83-87 cm", hips: "90-94 cm" },
      { size: "L", braSize: "80A-80B", pantySize: "L", bust: "88-92 cm", hips: "94-98 cm" },
      { size: "XL", braSize: "85A-85B", pantySize: "XL", bust: "93-97 cm", hips: "98-102 cm" },
    ],
    measurements: [
      { name: "Vòng ngực", description: "Đo ngang qua điểm cao nhất của ngực để xác định size áo." },
      { name: "Vòng mông", description: "Đo ngang qua điểm nở nhất của mông để xác định size quần." },
    ],
    tips: [
      "Set đồ lót đã được phối màu và size matching",
      "Ưu tiên chọn theo vòng ngực nếu phân vân",
      "Nếu áo và quần khác size, liên hệ shop để mua riêng"
    ],
    note: "Set thường bán theo size chung (S/M/L), đã được tính toán matching giữa áo và quần."
  },
  {
    productType: "SLEEPWEAR",
    name: "Đồ ngủ & Mặc nhà",
    headers: ["Size", "Chiều cao", "Cân nặng", "Vòng ngực", "Vòng eo"],
    sizes: [
      { size: "S", height: "150-158 cm", weight: "42-48 kg", bust: "78-84 cm", waist: "62-66 cm" },
      { size: "M", height: "158-165 cm", weight: "48-54 kg", bust: "84-90 cm", waist: "66-70 cm" },
      { size: "L", height: "165-170 cm", weight: "54-60 kg", bust: "90-96 cm", waist: "70-74 cm" },
      { size: "XL", height: "170-175 cm", weight: "60-68 kg", bust: "96-102 cm", waist: "74-78 cm" },
    ],
    measurements: [
      { name: "Chiều cao", description: "Đo từ đỉnh đầu đến gót chân, đứng thẳng không đi giày." },
      { name: "Cân nặng", description: "Cân vào buổi sáng để có số liệu chính xác nhất." },
    ],
    tips: [
      "Đồ ngủ nên chọn thoải mái, không quá ôm sát",
      "Bodysuit nên chọn đúng size hoặc nhỏ hơn 1 size nếu thích ôm",
      "Xem kỹ chất liệu: Satin ít co giãn, Cotton co giãn vừa"
    ]
  },
  {
    productType: "SHAPEWEAR",
    name: "Đồ định hình",
    headers: ["Size", "Vòng eo", "Vòng bụng dưới", "Vòng mông"],
    sizes: [
      { size: "S", waist: "60-64 cm", belly: "70-74 cm", hips: "84-88 cm" },
      { size: "M", waist: "64-68 cm", belly: "74-78 cm", hips: "88-92 cm" },
      { size: "L", waist: "68-72 cm", belly: "78-82 cm", hips: "92-96 cm" },
      { size: "XL", waist: "72-76 cm", belly: "82-86 cm", hips: "96-100 cm" },
    ],
    measurements: [
      { name: "Vòng eo", description: "Đo ngang qua điểm nhỏ nhất của eo (thắt lưng)." },
      { name: "Vòng bụng dưới", description: "Đo ngang qua rốn, vòng quanh bụng dưới." },
      { name: "Vòng mông", description: "Đo ngang qua điểm nở nhất của mông." },
    ],
    tips: [
      "Đồ định hình có tính chất bó sát, size nhỏ hơn quần áo thường",
      "Chọn size theo vòng eo thực tế, không chọn nhỏ hơn",
      "Mặc lần đầu có thể hơi chật, sẽ giãn nhẹ sau vài lần sử dụng"
    ],
    note: "Lưu ý: Thông số đồ định hình chặt hơn size quần áo thường 1-2 size."
  }
];

const seedSizeTemplates = async () => {
  console.log('Seeding Size Chart Templates...');
  
  for (const template of sizeTemplates) {
    await prisma.sizeChartTemplate.upsert({
      where: { productType: template.productType },
      update: {
        name: template.name,
        headers: template.headers,
        sizes: template.sizes,
        measurements: template.measurements,
        tips: template.tips,
      },
      create: template,
    });
    console.log(`✓ ${template.productType}: ${template.name}`);
  }
  
  console.log('✅ Seed completed!');
};

// Run: npx ts-node prisma/seed-size-templates.ts
```

### 8.3 Backward Compatibility

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKWARD COMPATIBILITY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ KHÔNG ẢNH HƯỞNG:                                                        │
│  ├─ Category system giữ nguyên 100%                                        │
│  ├─ API products hiện tại vẫn hoạt động                                    │
│  ├─ Frontend cũ vẫn render được (fallback to default)                      │
│  └─ Admin vẫn quản lý category bình thường                                 │
│                                                                             │
│  ⚠️ CẦN CẬP NHẬT:                                                           │
│  ├─ SizeGuideModal: categorySlug → productType                             │
│  ├─ ProductForm Admin: Thêm dropdown Product Type                          │
│  └─ Product API response: Include productType field                        │
│                                                                             │
│  📝 MIGRATION PLAN:                                                         │
│  1. Deploy backend với field mới (default = SLEEPWEAR)                     │
│  2. Chạy migration script gán productType                                  │
│  3. Deploy frontend mới                                                    │
│  4. Deploy admin mới                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Kết Luận

### 9.1 Tóm tắt giải pháp

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TÓM TẮT KIẾN TRÚC                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRƯỚC (Vấn đề)                    SAU (Giải pháp)                         │
│  ─────────────────                 ────────────────                         │
│  Category = Size Guide             Category = Marketing ONLY                │
│  (Hỗn loạn, mapping thủ công)      (Linh hoạt, tự do tạo)                  │
│                                                                             │
│                                    Product Type = Size Guide                │
│                                    (Cố định, 5 loại, logic rõ ràng)        │
│                                                                             │
│  ┌──────────────┐                  ┌──────────────┐                        │
│  │   Category   │──────────X       │   Category   │──── Marketing          │
│  │              │   Size Guide     │              │     SEO, Menu           │
│  └──────────────┘                  └──────────────┘                        │
│                                                                             │
│                                    ┌──────────────┐                        │
│                                    │ Product Type │──── Size Guide         │
│                                    │  (5 loại)    │     Variants           │
│                                    └──────────────┘                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Lợi ích cho từng stakeholder

| Stakeholder | Trước | Sau |
|-------------|-------|-----|
| **Marketing** | Bị giới hạn tên category (sợ ảnh hưởng size guide) | Tự do tạo: "Sale 8/3", "BST Valentine", "Flash Sale" |
| **Admin** | Phải nhớ mapping category → size guide | Chọn Product Type 1 lần, xong! |
| **Developer** | Maintain mapping thủ công, dễ bug | Logic rõ ràng: Type → Template |
| **Khách hàng** | Size guide đôi khi sai/không hiện | Luôn chính xác theo loại sản phẩm |

### 9.3 Checklist triển khai

```
Phase 1: Database (2-3 ngày)
├─ [ ] Thêm enum ProductType vào Prisma schema
├─ [ ] Thêm field productType + customSizeChart vào Product
├─ [ ] Tạo model SizeChartTemplate
├─ [ ] Chạy migration
├─ [ ] Seed 4 size templates mặc định
└─ [ ] Script migrate productType cho products hiện có

Phase 2: Admin (3-4 ngày)
├─ [ ] Trang quản lý Size Templates
├─ [ ] Form chỉnh sửa template (headers, sizes, tips)
├─ [ ] Cập nhật ProductForm: Dropdown Product Type
├─ [ ] Preview bảng size khi chọn type
└─ [ ] Option override customSizeChart

Phase 3: Frontend (2-3 ngày)
├─ [ ] Cập nhật SizeGuideModal nhận productType
├─ [ ] Fetch template từ API
├─ [ ] Thêm tab "Quy đổi quốc tế"
├─ [ ] Xử lý ẩn size cho ACCESSORY
└─ [ ] Responsive: Modal (desktop) / Drawer (mobile)

Phase 4: Enhancement (Optional)
├─ [ ] Size Recommender (nhập số đo → gợi ý)
├─ [ ] Lưu "Size của tôi" cho user
└─ [ ] A/B testing popup style
```

### 9.4 Files cần tạo/sửa

```
Backend:
├─ prisma/schema.prisma              (sửa)
├─ prisma/migrations/xxx             (tự động)
├─ prisma/seed-size-templates.ts     (tạo mới)
├─ src/routes/size-templates.ts      (tạo mới)
└─ src/routes/admin/size-templates.ts (tạo mới)

Frontend:
├─ src/constants/sizeCharts.ts       (có thể xóa sau khi migrate)
├─ src/components/product/SizeGuideModal.tsx (sửa)
├─ src/types/product.ts              (thêm ProductType)
└─ src/lib/api/size-templates.ts     (tạo mới)

Admin:
├─ app/admin/settings/size-charts/page.tsx (tạo mới)
├─ components/products/ProductForm.tsx     (sửa)
└─ components/products/SizeChartPreview.tsx (tạo mới)
```

---

---

**Tài liệu này được cập nhật lần cuối:** 2026-01-10  
**Version:** 2.0 (Đã fix HIGH priority issues từ QA Review)

# Phân Tích Bộ Lọc Sản Phẩm - Dynamic Faceted Filtering

## 1. Khái Niệm Dynamic Faceted Filtering

### Faceted Filtering là gì?
- **Facet** = Khía cạnh/Thuộc tính của sản phẩm (Size, Màu, Giá, Chất liệu...)
- **Dynamic** = Bộ lọc tự động thay đổi dựa trên:
  - Danh mục đang xem
  - Kết quả hiện tại (sau khi áp dụng filter khác)
  - Chỉ hiển thị options có sản phẩm (count > 0)

### Ví dụ Contextual Filters theo Danh mục

| Danh mục | Filters hiển thị | Lý do |
|----------|------------------|-------|
| **Áo lót** | Size (32A, 34B, 36C...), Kiểu gọng (Có gọng, Không gọng, Push-up), Chất liệu | Size áo lót đặc thù, cần filter kiểu gọng |
| **Quần lót** | Size (S, M, L, XL), Kiểu quần (Tam giác, Boxer, Thong, Lọt khe), Chất liệu | Size quần khác size áo, kiểu quần quan trọng |
| **Đồ ngủ** | Size (S, M, L, XL), Kiểu dáng (Váy ngủ, Bộ pyjama, Áo choàng), Chất liệu | Filter theo kiểu đồ ngủ |
| **Bộ nội y** | Size Áo + Size Quần, Màu sắc, Phong cách (Sexy, Đơn giản, Cô dâu) | Cần cả 2 loại size |

### Behavior mong muốn

```
User vào trang "Áo lót":
├── Filter "Màu sắc": Đen (15), Trắng (12), Hồng (8)  ← Chỉ màu có sản phẩm áo lót
├── Filter "Size": 32A (5), 32B (8), 34B (10)...      ← Size áo lót
├── Filter "Kiểu gọng": Có gọng (20), Không gọng (15) ← Specific cho áo lót
├── Filter "Chất liệu": Ren (18), Cotton (12)        ← Chất liệu có trong danh mục
└── Filter "Giá": Min 150k - Max 800k                 ← Range của danh mục này

User chọn "Màu Đen":
├── Filter "Size": 32A (2), 32B (5), 34B (3)...      ← Count cập nhật
├── Filter "Kiểu gọng": Có gọng (8), Không gọng (7)  ← Count cập nhật
└── ...
```

---

## 2. Thiết Kế Schema cho Dynamic Facets

### Option A: Category-Based Attributes (Khuyên dùng) ⭐

Mỗi danh mục có bộ thuộc tính riêng:

```prisma
// Định nghĩa thuộc tính
model Attribute {
  id          Int              @id @default(autoincrement())
  name        String           // "Kiểu gọng", "Chất liệu", "Size áo lót"
  slug        String           @unique
  type        AttributeType    @default(SELECT)
  isFilterable Boolean         @default(true)  // Hiển thị trong filter?
  isRequired  Boolean          @default(false) // Bắt buộc khi thêm SP?
  order       Int              @default(0)
  
  values      AttributeValue[]
  categories  CategoryAttribute[] // Thuộc tính này áp dụng cho danh mục nào
  
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}

enum AttributeType {
  SELECT      // Dropdown đơn
  MULTI       // Multi-select
  COLOR       // Color picker với HEX
  SIZE        // Size với hệ thống riêng
  RANGE       // Khoảng giá trị
}

// Giá trị của thuộc tính
model AttributeValue {
  id          Int       @id @default(autoincrement())
  value       String    // "Có gọng", "Cotton", "32B"
  slug        String
  meta        Json?     // { "hexCode": "#FF0000" } cho màu, { "sortOrder": 1 } cho size
  
  attributeId Int
  attribute   Attribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  
  products    ProductAttributeValue[]
  
  order       Int       @default(0)
  
  @@unique([attributeId, slug])
  @@index([attributeId])
}

// Thuộc tính nào thuộc danh mục nào
model CategoryAttribute {
  categoryId  Int
  attributeId Int
  isRequired  Boolean   @default(false) // Bắt buộc cho danh mục này?
  order       Int       @default(0)     // Thứ tự hiển thị trong danh mục
  
  category    Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  attribute   Attribute @relation(fields: [attributeId], references: [id], onDelete: Cascade)
  
  @@id([categoryId, attributeId])
}

// Sản phẩm có giá trị thuộc tính nào
model ProductAttributeValue {
  productId        Int
  attributeValueId Int
  
  product          Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
  attributeValue   AttributeValue @relation(fields: [attributeValueId], references: [id], onDelete: Cascade)
  
  @@id([productId, attributeValueId])
  @@index([attributeValueId])
}

// Cập nhật Category
model Category {
  id         Int                 @id @default(autoincrement())
  name       String
  slug       String              @unique
  image      String?
  
  products   Product[]
  attributes CategoryAttribute[] // Thuộc tính áp dụng cho danh mục này
  
  // ...
}

// Cập nhật Product
model Product {
  id           Int                     @id @default(autoincrement())
  // ... existing fields
  
  attributes   ProductAttributeValue[] // Giá trị thuộc tính của sản phẩm
  
  // ...
}
```

### Luồng Dữ Liệu

```
Admin tạo Attribute "Kiểu gọng":
├── Values: "Có gọng", "Không gọng", "Push-up", "Bralette"
└── Gán cho Category: "Áo lót", "Bộ nội y"

Admin thêm sản phẩm "Áo lót ren đen":
├── Chọn Category: "Áo lót"
├── Form tự động hiển thị: Kiểu gọng, Chất liệu, Size áo lót (dựa vào CategoryAttribute)
└── Admin chọn: Kiểu gọng = "Push-up", Chất liệu = "Ren"

User vào trang "Áo lót":
├── API lấy CategoryAttribute → biết filter nào cần hiển thị
├── API đếm số SP cho mỗi AttributeValue
└── Frontend render dynamic filters
```

---

## 3. API Design cho Dynamic Faceted Filters

### 3.1. GET /api/filters?categoryId=1

Lấy cấu trúc filter cho một danh mục:

```json
{
  "success": true,
  "data": {
    "categoryId": 1,
    "categoryName": "Áo lót",
    "facets": [
      {
        "id": 1,
        "name": "Màu sắc",
        "slug": "mau-sac",
        "type": "COLOR",
        "values": [
          { "id": 1, "value": "Đen", "slug": "den", "meta": { "hexCode": "#000000" }, "count": 15 },
          { "id": 2, "value": "Trắng", "slug": "trang", "meta": { "hexCode": "#FFFFFF" }, "count": 12 },
          { "id": 3, "value": "Hồng", "slug": "hong", "meta": { "hexCode": "#FFC0CB" }, "count": 8 }
        ]
      },
      {
        "id": 2,
        "name": "Size",
        "slug": "size-ao-lot",
        "type": "SIZE",
        "values": [
          { "id": 10, "value": "32A", "slug": "32a", "count": 5 },
          { "id": 11, "value": "32B", "slug": "32b", "count": 8 },
          { "id": 12, "value": "34B", "slug": "34b", "count": 10 }
        ]
      },
      {
        "id": 3,
        "name": "Kiểu gọng",
        "slug": "kieu-gong",
        "type": "SELECT",
        "values": [
          { "id": 20, "value": "Có gọng", "slug": "co-gong", "count": 20 },
          { "id": 21, "value": "Không gọng", "slug": "khong-gong", "count": 15 },
          { "id": 22, "value": "Push-up", "slug": "push-up", "count": 10 }
        ]
      },
      {
        "id": 4,
        "name": "Chất liệu",
        "slug": "chat-lieu",
        "type": "SELECT",
        "values": [
          { "id": 30, "value": "Ren", "slug": "ren", "count": 18 },
          { "id": 31, "value": "Cotton", "slug": "cotton", "count": 12 }
        ]
      }
    ],
    "priceRange": {
      "min": 150000,
      "max": 890000
    }
  }
}
```

### 3.2. GET /api/products?categoryId=1&attrs=20,30&minPrice=200000

Query sản phẩm với filters:

```
Query params:
- categoryId: ID danh mục
- attrs: Comma-separated AttributeValue IDs
- minPrice, maxPrice: Khoảng giá
- sizes: Comma-separated sizes (từ variant)
- colors: Comma-separated color names (từ variant)
- status: featured, sale, new
- sort: price_asc, price_desc, newest, bestseller
- page, limit
```

### 3.3. Real-time Count Update

Khi user chọn filter, gọi lại API `/api/filters` với params hiện tại để cập nhật count:

```
GET /api/filters?categoryId=1&attrs=20  // User đã chọn "Có gọng"

Response: Count của các filter khác được cập nhật dựa trên kết quả đã lọc
```

---

## 4. Database Migration Plan

### Phase 1: Tạo Schema mới (Không ảnh hưởng data cũ)

```sql
-- 1. Tạo bảng Attribute
CREATE TABLE "Attribute" (...)

-- 2. Tạo bảng AttributeValue  
CREATE TABLE "AttributeValue" (...)

-- 3. Tạo bảng CategoryAttribute
CREATE TABLE "CategoryAttribute" (...)

-- 4. Tạo bảng ProductAttributeValue
CREATE TABLE "ProductAttributeValue" (...)
```

### Phase 2: Seed Data cho Attributes

```typescript
// Seed script
const attributes = [
  {
    name: 'Màu sắc',
    slug: 'mau-sac',
    type: 'COLOR',
    values: [
      { value: 'Đen', slug: 'den', meta: { hexCode: '#000000' } },
      { value: 'Trắng', slug: 'trang', meta: { hexCode: '#FFFFFF' } },
      // ...
    ],
    categories: ['ao-lot', 'quan-lot', 'do-ngu', 'bo-noi-y'] // Áp dụng tất cả
  },
  {
    name: 'Size áo lót',
    slug: 'size-ao-lot', 
    type: 'SIZE',
    values: ['32A', '32B', '34A', '34B', '36A', '36B', '38B', '38C'],
    categories: ['ao-lot', 'bo-noi-y']
  },
  {
    name: 'Size quần',
    slug: 'size-quan',
    type: 'SIZE', 
    values: ['S', 'M', 'L', 'XL', 'XXL'],
    categories: ['quan-lot', 'do-ngu']
  },
  {
    name: 'Kiểu gọng',
    slug: 'kieu-gong',
    type: 'SELECT',
    values: ['Có gọng', 'Không gọng', 'Push-up', 'Bralette'],
    categories: ['ao-lot']
  },
  {
    name: 'Chất liệu',
    slug: 'chat-lieu',
    type: 'SELECT',
    values: ['Ren', 'Cotton', 'Lụa', 'Su đúc', 'Microfiber'],
    categories: ['ao-lot', 'quan-lot', 'do-ngu', 'bo-noi-y']
  }
];
```

### Phase 3: Migrate Data từ ProductVariant

```typescript
// Migrate color từ ProductVariant.color sang ProductAttributeValue
// Migrate size từ ProductVariant.size sang ProductAttributeValue
```

---

## 5. Frontend Component Structure

```
ProductListPage
├── FilterSidebar (Dynamic)
│   ├── CategoryFilter (nếu chưa chọn category)
│   ├── PriceRangeFilter
│   ├── StatusFilter (Nổi bật, Sale, Mới)
│   └── DynamicFacets[] ← Render dựa trên API response
│       ├── ColorFacet (type: COLOR) → Color swatches
│       ├── SizeFacet (type: SIZE) → Size buttons  
│       └── SelectFacet (type: SELECT) → Checkbox list
├── ProductGrid
│   └── ProductCard[]
└── Pagination
```

---

## 6. Kế Hoạch Triển Khai

### Sprint 1: Schema & Backend (2-3 ngày)
- [ ] Tạo Prisma schema cho Attribute system
- [ ] Migrate database
- [ ] Tạo seed script cho attributes cơ bản
- [ ] Tạo API `/api/filters`
- [ ] Cập nhật API `/api/products` hỗ trợ filter mới

### Sprint 2: Admin Dashboard (2-3 ngày)
- [ ] Trang quản lý Attributes
- [ ] Trang quản lý AttributeValues
- [ ] Cấu hình CategoryAttribute (gán attribute cho category)
- [ ] Cập nhật form thêm/sửa Product để chọn attributes

### Sprint 3: Frontend Filter (2-3 ngày)
- [ ] Refactor FilterSidebar component
- [ ] Tạo các Facet components (Color, Size, Select)
- [ ] Implement real-time count update
- [ ] URL sync (filter state trong URL)
- [ ] Mobile responsive filter drawer

### Sprint 4: Testing & Polish (1-2 ngày)
- [ ] Performance optimization (caching, indexing)
- [ ] Edge cases handling
- [ ] SEO friendly URLs

---

## 7. Quyết Định Cần Đưa Ra

1. **Có migrate Color table hiện tại sang Attribute system không?**
   - Có → Hệ thống nhất quán, bỏ bảng Color riêng
   - Không → Giữ Color table, chỉ thêm Attributes khác

2. **Size lưu ở đâu?**
   - Option A: Giữ trong ProductVariant (như hiện tại) + thêm vào Attribute
   - Option B: Chỉ dùng Attribute, bỏ size trong Variant

3. **Có cần filter cascade không?** (Chọn filter A → Filter B chỉ hiện options còn lại)
   - Có → UX tốt hơn, code phức tạp hơn
   - Không → Đơn giản, user có thể chọn filter không có kết quả

---

**Bạn muốn tiến hành với kế hoạch này không? Tôi sẽ bắt đầu từ Sprint 1.**

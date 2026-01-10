# Chiến Lược Tìm Kiếm Thông Minh - Lingerie 6C

## Mục lục
1. [Phân Tích Hiện Trạng](#1-phân-tích-hiện-trạng)
2. [Vấn Đề Cần Giải Quyết](#2-vấn-đề-cần-giải-quyết)
3. [Giải Pháp Đề Xuất](#3-giải-pháp-đề-xuất)
4. [Kế Hoạch Triển Khai](#4-kế-hoạch-triển-khai)
5. [Chi Tiết Kỹ Thuật](#5-chi-tiết-kỹ-thuật)
6. [Checklist Triển Khai](#6-checklist-triển-khai)

---

## 1. Phân Tích Hiện Trạng

### 1.1 Stack Công Nghệ Hiện Tại
- **Database**: PostgreSQL (via Railway)
- **ORM**: Prisma
- **Backend**: Express.js + TypeScript
- **Frontend**: Next.js 14

### 1.2 Cách Tìm Kiếm Hiện Tại

```typescript
// Backend: productController.ts
if (search) {
  where.OR = [
    { name: { contains: String(search), mode: 'insensitive' } },
    { description: { contains: String(search), mode: 'insensitive' } },
  ];
}
```

**Vấn đề**:
- Chỉ dùng `LIKE %keyword%` (case-insensitive)
- Không xử lý từ đồng nghĩa (quần chíp ≠ quần lót)
- Không xử lý lỗi chính tả (ao lot ≠ áo lót)
- Không có từ khóa điều hướng (Sale, New, Hot)
- Không tracking lịch sử tìm kiếm

### 1.3 Phần "Tìm Kiếm Phổ Biến" Hiện Tại

```typescript
// Header.tsx - Hard-coded
{["Áo lót", "Quần lót", "Đồ ngủ", "Set nội y", "Sale"].map((term) => (
  <Link href={`/san-pham?search=${term}`}>
```

**Vấn đề**: 
- Hard-code cứng, không linh hoạt
- Không dựa trên dữ liệu thực tế

---

## 2. Vấn Đề Cần Giải Quyết

### 2.1 Tìm Kiếm Cơ Bản
| Vấn đề | Ví dụ | Mong đợi |
|--------|-------|----------|
| Không dấu | "ao lot" | Tìm "áo lót" |
| Lỗi chính tả | "ao loot", "qần lót" | Vẫn ra kết quả |
| Từ đồng nghĩa | "quần chíp", "bikini" | Tìm "quần lót" |
| Tiếng Anh | "bra", "lingerie" | Tìm "áo lót" |

### 2.2 Tìm Kiếm Điều Hướng (Navigation Keywords)
| Từ khóa | Logic cần xử lý |
|---------|-----------------|
| "Sale" | `WHERE salePrice IS NOT NULL AND salePrice < price` |
| "New" | `WHERE createdAt > (NOW - 30 days)` |
| "Hot" | `ORDER BY viewCount DESC` hoặc `soldCount DESC` |
| "Áo lót" | Tìm theo tên HOẶC theo categorySlug = 'ao-lot' |

### 2.3 Dynamic Filters (Bộ Lọc Thông Minh)
- Bộ lọc phải thích nghi theo kết quả tìm kiếm
- Chỉ hiện các option có sản phẩm
- Ẩn thuộc tính không liên quan

---

## 3. Giải Pháp Đề Xuất

### 3.1 Chiến Lược Tổng Thể: **PostgreSQL Native + Hybrid Approach**

Không cần Elasticsearch hay Algolia, PostgreSQL đủ mạnh với:
- **Full-Text Search** (`tsvector`, `tsquery`)
- **Fuzzy Search** (`pg_trgm` extension)
- **Unaccent** (bỏ dấu tiếng Việt)

### 3.2 Kiến Trúc Hệ Thống Tìm Kiếm

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUT                               │
│                   "ao lot ren"                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 1: PREPROCESSING                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Normalize: lowercase, trim                        │   │
│  │ 2. Check Navigation Keywords (Sale, New, Hot)        │   │
│  │ 3. Unaccent: "ao lot ren" → "ao lot ren"            │   │
│  │ 4. Synonym Lookup: "bra" → "áo lót"                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 2: MULTI-STRATEGY SEARCH                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Strategy A: Exact Match (tsvector)     → Score: 1.0  │   │
│  │ Strategy B: Fuzzy Match (pg_trgm)      → Score: 0.8  │   │
│  │ Strategy C: Category Match             → Score: 0.6  │   │
│  │ Strategy D: Attribute Match            → Score: 0.4  │   │
│  └─────────────────────────────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MERGE & RANK by weighted score                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              LAYER 3: RESULT ENHANCEMENT                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. Build Dynamic Filters (based on results)          │   │
│  │ 2. Log Search History                                │   │
│  │ 3. Cache Popular Queries                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Bảng So Sánh Các Phương Án

| Tiêu chí | LIKE (Hiện tại) | Full-Text + Trigram | Elasticsearch |
|----------|-----------------|---------------------|---------------|
| Độ chính xác | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Hiệu năng | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Chi phí | Free | Free | $$$$ |
| Độ phức tạp | Thấp | Trung bình | Cao |
| Đồng bộ data | N/A | N/A | Phức tạp |
| Phù hợp với dự án | ❌ | ✅ **CHỌN** | ❌ |

---

## 4. Kế Hoạch Triển Khai

### Phase 1: Foundation (1-2 ngày)
**Mục tiêu**: Setup cơ sở hạ tầng

- [ ] Enable PostgreSQL extensions (`pg_trgm`, `unaccent`)
- [ ] Tạo model `SearchLog` để tracking
- [ ] Tạo model `SearchSynonym` cho từ đồng nghĩa
- [ ] Tạo model `SearchKeyword` cho từ khóa điều hướng
- [ ] Thêm column `search_vector` vào bảng Product

### Phase 2: Smart Search API (2-3 ngày)
**Mục tiêu**: Backend xử lý tìm kiếm thông minh

- [ ] API `/api/search` với multi-strategy
- [ ] Xử lý Navigation Keywords (Sale, New, Hot)
- [ ] Implement Fuzzy Search với pg_trgm
- [ ] Implement Unaccent cho tiếng Việt
- [ ] Synonym lookup

### Phase 3: Dynamic Filters (1-2 ngày)
**Mục tiêu**: Bộ lọc thông minh

- [ ] API trả về available filters dựa trên kết quả
- [ ] Frontend hiển thị filter động
- [ ] Ẩn/disable options không có sản phẩm

### Phase 4: Search Analytics (1 ngày)
**Mục tiêu**: Tìm kiếm phổ biến dựa trên data

- [ ] Tracking search queries
- [ ] API `/api/search/popular` 
- [ ] Hybrid: Admin keywords + User trends

### Phase 5: UX Enhancement (1 ngày)
**Mục tiêu**: Trải nghiệm người dùng

- [ ] Search suggestions (autocomplete)
- [ ] "Không tìm thấy? Thử các từ khóa này..."
- [ ] Highlight matching text

---

## 5. Chi Tiết Kỹ Thuật

### 5.1 Database Schema Mới

```prisma
// Lịch sử tìm kiếm
model SearchLog {
  id        Int      @id @default(autoincrement())
  keyword   String
  userId    Int?
  sessionId String?
  results   Int      @default(0) // Số kết quả trả về
  createdAt DateTime @default(now())
  
  @@index([keyword])
  @@index([createdAt])
}

// Từ đồng nghĩa
model SearchSynonym {
  id       Int    @id @default(autoincrement())
  word     String // "bra", "quần chíp", "bikini"
  synonym  String // "áo lót", "quần lót", "quần lót"
  
  @@unique([word])
  @@index([word])
}

// Từ khóa điều hướng (Admin quản lý)
model SearchKeyword {
  id          Int      @id @default(autoincrement())
  keyword     String   @unique // "Sale", "New", "Hot"
  type        String   // FILTER | SORT | CATEGORY
  config      Json     // {"filter": "isSale", "value": true}
  displayName String   // "Đang giảm giá"
  icon        String?  // "tag", "sparkles"
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  isPinned    Boolean  @default(false) // Ghim ở Popular Keywords
  
  @@index([isActive, order])
}
```

### 5.2 PostgreSQL Extensions Setup

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Tạo function bỏ dấu tiếng Việt
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE;

-- Thêm column search_vector cho Product
ALTER TABLE "Product" 
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B')
) STORED;

-- Index cho Full-Text Search
CREATE INDEX idx_product_search ON "Product" USING GIN(search_vector);

-- Index cho Fuzzy Search (Trigram)
CREATE INDEX idx_product_name_trgm ON "Product" USING GIN(name gin_trgm_ops);
CREATE INDEX idx_product_name_unaccent ON "Product" USING GIN(immutable_unaccent(name) gin_trgm_ops);
```

### 5.3 Search API Logic

```typescript
// services/searchService.ts

interface SearchResult {
  products: Product[];
  filters: DynamicFilters;
  meta: {
    total: number;
    keyword: string;
    suggestions?: string[];
  };
}

async function smartSearch(query: string, options: SearchOptions): Promise<SearchResult> {
  // 1. Preprocess
  const normalized = query.toLowerCase().trim();
  
  // 2. Check Navigation Keywords
  const navKeyword = await checkNavigationKeyword(normalized);
  if (navKeyword) {
    return handleNavigationSearch(navKeyword, options);
  }
  
  // 3. Synonym lookup
  const expandedQuery = await expandSynonyms(normalized);
  
  // 4. Multi-strategy search
  const results = await prisma.$queryRaw`
    SELECT p.*, 
      -- Exact match score
      ts_rank(p.search_vector, plainto_tsquery('simple', ${expandedQuery})) * 10 AS exact_score,
      -- Fuzzy match score  
      similarity(immutable_unaccent(p.name), immutable_unaccent(${normalized})) * 5 AS fuzzy_score,
      -- Category match
      CASE WHEN c.name ILIKE ${'%' + normalized + '%'} THEN 3 ELSE 0 END AS cat_score
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c.id
    WHERE 
      p."isVisible" = true
      AND (
        -- Full-text match
        p.search_vector @@ plainto_tsquery('simple', ${expandedQuery})
        -- OR Fuzzy match (similarity > 0.3)
        OR similarity(immutable_unaccent(p.name), immutable_unaccent(${normalized})) > 0.3
        -- OR Category match
        OR c.name ILIKE ${'%' + normalized + '%'}
        OR c.slug = ${slugify(normalized)}
      )
    ORDER BY (exact_score + fuzzy_score + cat_score) DESC
    LIMIT ${options.limit}
    OFFSET ${options.offset}
  `;
  
  // 5. Build dynamic filters
  const filters = await buildDynamicFilters(results);
  
  // 6. Log search
  await logSearch(query, results.length);
  
  return { products: results, filters, meta: {...} };
}
```

### 5.4 Navigation Keywords Config

```typescript
// Ví dụ config cho SearchKeyword
const navigationKeywords = [
  {
    keyword: "sale",
    type: "FILTER",
    config: {
      where: { salePrice: { not: null, lt: prisma.raw("price") } }
    },
    displayName: "Đang giảm giá",
    icon: "tag",
    isPinned: true
  },
  {
    keyword: "new",
    type: "FILTER", 
    config: {
      where: { createdAt: { gte: new Date(Date.now() - 30*24*60*60*1000) } }
    },
    displayName: "Hàng mới",
    icon: "sparkles",
    isPinned: true
  },
  {
    keyword: "hot",
    type: "SORT",
    config: {
      orderBy: { viewCount: "desc" }
    },
    displayName: "Bán chạy",
    icon: "flame",
    isPinned: true
  }
];
```

### 5.5 Dynamic Filters Response

```typescript
interface DynamicFilters {
  categories: { id: number; name: string; count: number }[];
  priceRange: { min: number; max: number };
  colors: { name: string; code: string; count: number }[];
  sizes: { name: string; count: number }[];
  attributes: {
    id: number;
    name: string;
    values: { id: number; value: string; count: number }[];
  }[];
}

// Ví dụ response khi search "áo lót"
{
  "categories": [
    { "id": 1, "name": "Áo lót", "count": 45 }
    // Không có "Quần lót" vì kết quả không có
  ],
  "colors": [
    { "name": "Đen", "code": "#000", "count": 20 },
    { "name": "Nude", "code": "#E8C4A2", "count": 15 }
  ],
  "sizes": [
    { "name": "S", "count": 30 },
    { "name": "M", "count": 40 }
  ],
  "attributes": [
    {
      "name": "Kiểu gọng",
      "values": [
        { "value": "Có gọng", "count": 25 },
        { "value": "Không gọng", "count": 20 }
      ]
    }
    // Không có "Kiểu đáy" vì đang search áo lót
  ]
}
```

### 5.6 Popular Keywords API

```typescript
// GET /api/search/popular
async function getPopularKeywords() {
  // 1. Lấy từ khóa Admin ghim (isPinned = true)
  const pinnedKeywords = await prisma.searchKeyword.findMany({
    where: { isActive: true, isPinned: true },
    orderBy: { order: 'asc' },
    take: 3
  });
  
  // 2. Lấy từ khóa trending từ SearchLog (7 ngày gần nhất)
  const trendingKeywords = await prisma.$queryRaw`
    SELECT keyword, COUNT(*) as count
    FROM "SearchLog"
    WHERE "createdAt" > NOW() - INTERVAL '7 days'
      AND results > 0
    GROUP BY keyword
    ORDER BY count DESC
    LIMIT 5
  `;
  
  // 3. Merge và dedupe
  return {
    pinned: pinnedKeywords,
    trending: trendingKeywords.filter(t => 
      !pinnedKeywords.some(p => p.keyword === t.keyword)
    ).slice(0, 5 - pinnedKeywords.length)
  };
}
```

---

## 6. Checklist Triển Khai

### Phase 1: Foundation
- [ ] Chạy SQL enable extensions trên Railway PostgreSQL
- [ ] Thêm schema mới vào `schema.prisma`
- [ ] Chạy `prisma migrate`
- [ ] Seed data cho SearchSynonym (từ đồng nghĩa phổ biến)
- [ ] Seed data cho SearchKeyword (Sale, New, Hot)

### Phase 2: Smart Search API
- [ ] Tạo `services/searchService.ts`
- [ ] Tạo route `GET /api/search`
- [ ] Implement preprocessQuery()
- [ ] Implement checkNavigationKeyword()
- [ ] Implement expandSynonyms()
- [ ] Implement multiStrategySearch()
- [ ] Unit tests

### Phase 3: Dynamic Filters
- [ ] Implement buildDynamicFilters()
- [ ] Update frontend ProductFilters component
- [ ] Hide/disable empty options

### Phase 4: Search Analytics
- [ ] Implement logSearch()
- [ ] Tạo route `GET /api/search/popular`
- [ ] Update Header.tsx để fetch popular keywords
- [ ] Admin dashboard: Search analytics

### Phase 5: UX Enhancement
- [ ] Implement search suggestions (debounced)
- [ ] "Không tìm thấy" với suggestions
- [ ] Highlight matching text trong kết quả

---

## Tài Liệu Tham Khảo

1. [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
2. [pg_trgm - Trigram Matching](https://www.postgresql.org/docs/current/pgtrgm.html)
3. [Prisma Raw Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
4. [Vietnamese Text Search](https://github.com/duydo/vn-text-search)

---

## Appendix: Từ Đồng Nghĩa Khởi Tạo

```json
[
  { "word": "bra", "synonym": "áo lót" },
  { "word": "áo ngực", "synonym": "áo lót" },
  { "word": "áo con", "synonym": "áo lót" },
  { "word": "quần chíp", "synonym": "quần lót" },
  { "word": "quần chip", "synonym": "quần lót" },
  { "word": "bikini", "synonym": "quần lót" },
  { "word": "panty", "synonym": "quần lót" },
  { "word": "panties", "synonym": "quần lót" },
  { "word": "underwear", "synonym": "đồ lót" },
  { "word": "lingerie", "synonym": "nội y" },
  { "word": "nightwear", "synonym": "đồ ngủ" },
  { "word": "pajama", "synonym": "đồ ngủ" },
  { "word": "pyjama", "synonym": "đồ ngủ" },
  { "word": "sexy", "synonym": "gợi cảm" },
  { "word": "push up", "synonym": "nâng ngực" },
  { "word": "pushup", "synonym": "nâng ngực" }
]
```

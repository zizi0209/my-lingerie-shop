# 🔄 Duplicate Product Handling Strategy

## 📋 Yêu cầu

Admin muốn **cho phép chèn cùng 1 sản phẩm nhiều lần** trong bài viết để nhấn mạnh (tốt cho sale/marketing).

**Ví dụ:**
```
Đoạn 1: Giới thiệu sản phẩm A
[Product A Card]

Đoạn 2: Hướng dẫn sử dụng
[Product A Card] ← Chèn lại lần 2

Đoạn 3: Kết luận
[Product A Card] ← Chèn lại lần 3
```

## 🎯 Giải pháp

### 1. Frontend - Allow Duplicates

**Before (❌ Wrong):**
```typescript
const seenProductIds = new Set<number>();

productNodes.forEach((node) => {
  const productId = Number(node.getAttribute('data-product-id'));
  
  // Skip duplicate
  if (seenProductIds.has(productId)) {
    return; // ❌ Chỉ hiển thị 1 lần
  }
  seenProductIds.add(productId);
  
  // Render product...
});
```

**After (✅ Correct):**
```typescript
// Removed seenProductIds Set

productNodes.forEach((node, index) => {
  const productId = Number(node.getAttribute('data-product-id'));
  
  // Allow duplicates - use fragmentIndex as unique key
  fragments.push({
    type: 'product',
    content: productId,
    index: fragmentIndex++, // ✅ Unique key cho mỗi occurrence
  });
});

// React key uses fragmentIndex, not productId
<ProductCardInPost
  key={`product-${productId}-${fragmentIndex}`} // ✅ Unique
  product={product}
/>
```

### 2. Backend - Prevent Crash

**Problem:**
- Admin chèn Product A 3 lần → `extractProductsFromContent()` trả về 3 records
- Database có constraint `UNIQUE(postId, productId)`
- Insert 3 lần → **Crash!** (Duplicate key error)

**Solution:**
```typescript
async function syncProductOnPost(postId: number, products: ExtractedProduct[]) {
  // 1. Deduplicate products using Set
  const uniqueProductIds = Array.from(new Set(products.map(p => p.productId)));
  
  // 2. Filter to get first occurrence only
  const uniqueProducts = products.filter((product, index, self) => 
    index === self.findIndex(p => p.productId === product.productId)
  );
  
  // 3. Upsert unique products only
  for (const product of uniqueProducts) {
    await prisma.productOnPost.upsert({
      where: { postId_productId: { postId, productId: product.productId } },
      update: { ... },
      create: { ... },
    });
  }
}
```

**Why this works:**
- ✅ Frontend: Hiển thị 3 lần (dùng fragmentIndex làm key)
- ✅ Backend: Chỉ lưu 1 record vào database (deduplicate)
- ✅ No crash: Không có duplicate insert

## 📊 Data Flow

```
Admin Editor:
  Insert Product A at position 0
  Insert Product A at position 5
  Insert Product A at position 10
  ↓
HTML Content:
  <div data-product-id="123">...</div>  ← position 0
  <div data-product-id="123">...</div>  ← position 5
  <div data-product-id="123">...</div>  ← position 10
  ↓
Backend extractProductsFromContent():
  [
    { productId: 123, position: 0 },
    { productId: 123, position: 5 },
    { productId: 123, position: 10 }
  ]
  ↓
Backend syncProductOnPost() - Deduplicate:
  uniqueProducts = [{ productId: 123, position: 0 }] ← First occurrence only
  ↓
Database ProductOnPost:
  | postId | productId | position |
  |--------|-----------|----------|
  | 1      | 123       | 0        | ← Only 1 record
  ↓
End User View:
  ContentWithInlineProducts parses HTML
  Finds 3 nodes with data-product-id="123"
  Renders 3 ProductCardInPost components
  Keys: product-123-0, product-123-1, product-123-2 ← Unique keys
```

## 🎨 UI Behavior

### Admin Editor
```
┌─────────────────────────────────┐
│ Paragraph 1                     │
│ [Product A Card] ← Insert #1    │
│                                 │
│ Paragraph 2                     │
│ [Product A Card] ← Insert #2    │
│                                 │
│ Paragraph 3                     │
│ [Product A Card] ← Insert #3    │
└─────────────────────────────────┘
```

### End User View
```
┌─────────────────────────────────┐
│ Paragraph 1                     │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Product A             │ │
│ │ 150.000₫                    │ │
│ └─────────────────────────────┘ │
│                                 │
│ Paragraph 2                     │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Product A             │ │
│ │ 150.000₫                    │ │
│ └─────────────────────────────┘ │
│                                 │
│ Paragraph 3                     │
│ ┌─────────────────────────────┐ │
│ │ [IMG] Product A             │ │
│ │ 150.000₫                    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## 🔑 Key Concepts

### 1. React Keys
**Wrong:**
```typescript
key={`product-${productId}`} // ❌ Duplicate keys if same product
```

**Correct:**
```typescript
key={`product-${productId}-${fragmentIndex}`} // ✅ Always unique
```

### 2. Database Deduplication
**Methods:**
- **Set:** `Array.from(new Set(productIds))`
- **Filter:** `products.filter((p, i, self) => i === self.findIndex(x => x.productId === p.productId))`
- **Prisma:** `skipDuplicates: true` (for createMany)
- **SQL:** `ON CONFLICT DO NOTHING`

### 3. Position Tracking
- Database lưu position của **first occurrence**
- Frontend không care position, chỉ render theo thứ tự trong HTML

## ✅ Benefits

1. **Marketing Flexibility:** Admin có thể nhấn mạnh sản phẩm nhiều lần
2. **No Crash:** Backend handle duplicate gracefully
3. **Performance:** Chỉ 1 record trong database, không duplicate data
4. **Unique Keys:** React không warning về duplicate keys

## 📝 Files Changed

1. `frontend/src/components/blog/ContentWithInlineProducts.tsx`
   - Removed `seenProductIds` Set
   - Allow duplicate products to render
   - Use `fragmentIndex` for unique keys

2. `backend/src/controllers/postController.ts`
   - Added deduplication logic in `syncProductOnPost()`
   - Filter to first occurrence only
   - Prevent duplicate inserts

## 🧪 Testing Checklist

- [ ] Chèn cùng 1 sản phẩm 3 lần trong editor
- [ ] Verify HTML có 3 nodes với cùng data-product-id
- [ ] Verify database chỉ có 1 record trong ProductOnPost
- [ ] Verify end user thấy 3 product cards
- [ ] Verify không có React duplicate key warning
- [ ] Verify không có database crash

## 🚀 Future Enhancements

Nếu cần track từng occurrence riêng biệt:
1. Thêm `occurrenceId` (UUID) vào HTML: `data-occurrence-id="uuid"`
2. Database lưu multiple records với occurrenceId
3. Có thể track analytics cho từng occurrence

**Trade-off:**
- ✅ More granular tracking
- ❌ More database records
- ❌ More complex logic

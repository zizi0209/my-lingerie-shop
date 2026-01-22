# 🐛 Debug Guide: Product không hiển thị trong Post

## Vấn đề
Admin chèn sản phẩm vào bài viết qua ProductSearchModal trong Lexical Editor, nhưng khi hiển thị ở end user thì không thấy sản phẩm.

## Root Cause Analysis

### Luồng dữ liệu hiện tại:
1. **Admin Editor (LexicalEditor):**
   - User chèn ProductNode vào editor
   - `OnChangePlugin` convert Lexical state → HTML qua `$generateHtmlFromNodes()`
   - HTML được lưu vào database

2. **Backend (postController):**
   - Nhận HTML content
   - Parse HTML để extract products (nhưng logic này parse **JSON**, không phải HTML!)
   - Sync vào bảng `ProductOnPost`

3. **End User (PostContent):**
   - Fetch HTML từ database
   - `ContentWithInlineProducts` parse HTML tìm `[data-product-id]`
   - Nếu không tìm thấy → không render sản phẩm

### Vấn đề chính:
**Backend đang expect Lexical JSON nhưng nhận HTML!**

```typescript
// backend/src/controllers/postController.ts
function extractProductsFromContent(content: string): ExtractedProduct[] {
  try {
    const parsed = JSON.parse(content); // ❌ Lỗi: content là HTML, không phải JSON!
    // ...
  } catch {
    return []; // ❌ Trả về empty array → không sync ProductOnPost
  }
}
```

## Giải pháp

### Option 1: Lưu Lexical JSON thay vì HTML (Recommended)
**Ưu điểm:**
- Giữ nguyên structure của Lexical
- Dễ parse và extract products
- Có thể render lại với đầy đủ formatting

**Nhược điểm:**
- Cần thay đổi cách render ở frontend
- Phải convert JSON → HTML khi hiển thị

**Implementation:**
1. Thay đổi `OnChangePlugin` để export JSON thay vì HTML
2. Backend parse JSON để extract products (đã có sẵn)
3. Frontend convert JSON → HTML khi render

### Option 2: Fix HTML Export để có data attributes (Current)
**Ưu điểm:**
- Không cần thay đổi database schema
- Đơn giản hơn

**Nhược điểm:**
- Phụ thuộc vào `$generateHtmlFromNodes()` export đúng
- Có thể bị sanitize mất data attributes

**Implementation:**
1. ✅ Đã fix `ProductNode.exportDOM()` để export đúng HTML với data attributes
2. ✅ Đã thêm logging để debug
3. ⏳ Cần test xem HTML có được export đúng không

### Option 3: Dual Storage (Best of both worlds)
**Lưu cả JSON và HTML:**
- JSON: Để parse và extract products
- HTML: Để hiển thị nhanh

**Implementation:**
```typescript
// Schema
model Post {
  content     String  // HTML for display
  contentJson String? // Lexical JSON for parsing
}
```

## Debug Steps

### 1. Kiểm tra HTML được export từ Lexical
Mở browser console khi edit post trong dashboard:

```javascript
// Sẽ thấy logs từ OnChangePlugin
[OnChangePlugin] Generated HTML: <div class="embedded-product" data-product-id="123">...
```

### 2. Kiểm tra HTML trong database
```sql
SELECT id, title, LEFT(content, 500) as content_preview 
FROM "Post" 
WHERE id = YOUR_POST_ID;
```

Tìm xem có `data-product-id` trong content không?

### 3. Kiểm tra parsing ở frontend
Mở browser console khi xem post:

```javascript
// Sẽ thấy logs từ ContentWithInlineProducts
[ContentWithInlineProducts] Found product nodes: 0 hoặc > 0
```

### 4. Test HTML parsing
Mở file `test-product-html-export.html` trong browser và paste HTML từ database vào textarea.

## Testing Checklist

- [ ] Tạo post mới với ProductNode
- [ ] Check console logs trong dashboard (OnChangePlugin)
- [ ] Check HTML trong database có `data-product-id`
- [ ] Check console logs khi xem post (ContentWithInlineProducts)
- [ ] Verify sản phẩm hiển thị đúng

## Expected HTML Output

```html
<p class="mb-2 last:mb-0">Some text before</p>
<div class="embedded-product" data-product-id="123" data-display-type="inline-card" data-custom-note="Optional note">[Product 123]</div>
<p class="mb-2 last:mb-0">Some text after</p>
```

## Fallback: Manual Product Linking

Nếu HTML export không hoạt động, products vẫn có thể được link thủ công qua:
- `ProductOnPost` table (manual linking)
- Hiển thị ở sidebar hoặc end-collection

## Next Steps

1. ✅ Đã thêm logging vào `OnChangePlugin` và `ContentWithInlineProducts`
2. ✅ Đã fix `ProductNode.exportDOM()` để export đúng HTML
3. ⏳ Test trong browser để xem HTML có được export đúng
4. ⏳ Nếu không work, chuyển sang Option 1 (lưu JSON)

## Files Changed

- `frontend/src/components/editor/plugins/OnChangePlugin.tsx` - Added logging
- `frontend/src/components/editor/nodes/ProductNode.tsx` - Fixed exportDOM, added logging
- `frontend/src/components/blog/ContentWithInlineProducts.tsx` - Added logging, fixed parsing logic

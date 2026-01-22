# Product-Post Linking Implementation

## ✅ Hoàn thành (Phase 1-4)

### 1. Database Schema
- ✅ Added ProductOnPost model to Prisma schema
- ✅ Added elatedProducts to Post model
- ✅ Added elatedPosts to Product model
- ✅ Created migration: 20260119103834_add_product_post_relation

### 2. API Endpoints
**File:** ackend/src/controllers/productPostController.ts
**File:** ackend/src/routes/productPostRoutes.ts

**Endpoints:**
- POST /api/product-posts/link - Link 1 product to post (Admin)
- POST /api/product-posts/batch-link - Link nhiều products (Admin)
- DELETE /api/product-posts/unlink/:postId/:productId - Unlink (Admin)
- GET /api/product-posts/posts/:postId/products - Get products trong post (Public)
- GET /api/product-posts/products/:productId/posts - Get posts có product (Public)

### 3. ProductCard Component
**Cần tạo:** rontend/src/components/blog/ProductCardInPost.tsx
- 3 variants: inline-card, sidebar, end-collection
- Hiển thị: image, price, discount, category, custom note
- CTA button: "Xem ngay"

---

## 🔧 Cần làm tiếp (Phase 5-9)

### 5. ProductCard Component
`ash
# Tạo file ProductCardInPost.tsx trong frontend/src/components/blog/
# Code đã chuẩn bị sẵn ở trên
`

### 6. Lexical Editor - Product Node
**File:** rontend/src/components/lexical/nodes/ProductNode.tsx

Tạo custom Lexical node để admin insert product vào bài viết:
`	sx
// Slash command: /product
// Modal chọn product
// Render ProductCardInPost inline
`

**File:** rontend/src/components/lexical/plugins/ProductPlugin.tsx
- Xử lý slash command /product
- Mở modal search product
- Insert ProductNode vào editor

### 7. Related Posts trong Product Detail Page
**File:** rontend/src/components/product/RelatedPosts.tsx

`	sx
// Fetch từ: GET /api/product-posts/products/:productId/posts
// Hiển thị grid 3-4 bài viết liên quan
// CTA: "Đọc thêm" → link to post
`

**Cập nhật:** rontend/src/app/san-pham/[slug]/page.tsx
`	sx
import RelatedPosts from '@/components/product/RelatedPosts';

// Thêm section cuối trang:
<RelatedPosts productId={product.id} />
`

### 8. Admin UI - Product Linking
**A. Dashboard Post Editor:**
**File:** rontend/src/components/dashboard/posts/ProductLinkingPanel.tsx

Features:
- Search product (autocomplete)
- Add to post (chọn displayType, position, customNote)
- List products đã link (drag-drop để sort)
- Remove product

**B. Dashboard Product Editor:**
**File:** rontend/src/components/dashboard/products/RelatedPostsPanel.tsx

Features:
- View posts featuring this product
- Quick link to edit post

### 9. Testing
`ash
# Backend
- Test API endpoints với Postman
- Verify cascade delete (xóa post → xóa ProductOnPost)

# Frontend  
- Test ProductCard hiển thị đúng 3 variants
- Test Lexical Product Node insert/delete
- Test admin linking UI

# TypeScript
cd E:\\my-lingerie-shop
bunx tsc --project frontend/tsconfig.json --noEmit
bunx tsc --project backend/tsconfig.json --noEmit
`

---

## 📋 Migration được tạo

**File:** ackend/prisma/migrations/20260119103834_add_product_post_relation/migration.sql

`sql
CREATE TABLE "ProductOnPost" (
    "id" SERIAL PRIMARY KEY,
    "postId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "position" INTEGER,
    "displayType" TEXT NOT NULL DEFAULT 'inline-card',
    "customNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "ProductOnPost_postId_productId_key" UNIQUE("postId", "productId")
);

CREATE INDEX "ProductOnPost_postId_idx" ON "ProductOnPost"("postId");
CREATE INDEX "ProductOnPost_productId_idx" ON "ProductOnPost"("productId");
CREATE INDEX "ProductOnPost_displayType_idx" ON "ProductOnPost"("displayType");

ALTER TABLE "ProductOnPost" ADD CONSTRAINT "ProductOnPost_postId_fkey" 
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    
ALTER TABLE "ProductOnPost" ADD CONSTRAINT "ProductOnPost_productId_fkey" 
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`

---

## 🎯 Usage Example

### Admin: Link product to post
`	ypescript
// POST /api/product-posts/link
{
  "postId": 5,
  "productId": 123,
  "displayType": "inline-card",
  "position": 2,
  "customNote": "Perfect for summer nights!"
}
`

### Frontend: Fetch & display
`	ypescript
// In blog post page
const { data } = await fetch(/api/product-posts/posts//products);

data.forEach(item => (
  <ProductCardInPost 
    product={item.product}
    displayType={item.displayType}
    customNote={item.customNote}
  />
));
`

### Product page: Show related posts
`	ypescript
const { data } = await fetch(/api/product-posts/products//posts);

<RelatedPosts posts={data.map(item => item.post)} />
`

---

## 🚀 Next Steps

1. Copy ProductCardInPost component code vào file
2. Implement Lexical Product Node + Plugin
3. Create RelatedPosts component
4. Build Admin UI panels
5. Test end-to-end flow

Bạn muốn tôi tiếp tục implement phần nào trước?

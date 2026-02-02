 # Color Swatches Migration Guide
 
 ## Tổng quan
 
 Migration này thêm tính năng Color Swatches cho Product Card:
 - Mỗi sản phẩm có thể có nhiều màu
 - Mỗi màu có ảnh riêng
 - Khi click vào màu trên Product Card, ảnh sẽ thay đổi tương ứng
 
 ## Cấu trúc Database Mới
 
 ### Bảng Color (Master Data)
 ```sql
 CREATE TABLE "Color" (
     "id" SERIAL PRIMARY KEY,
     "name" TEXT UNIQUE NOT NULL,      -- "Đen", "Trắng"
     "slug" TEXT UNIQUE NOT NULL,      -- "den", "trang"
     "hexCode" TEXT NOT NULL,          -- "#000000", "#FFFFFF"
     "order" INTEGER DEFAULT 0,
     "isActive" BOOLEAN DEFAULT true,
     "createdAt" TIMESTAMP,
     "updatedAt" TIMESTAMP
 );
 ```
 
 ### Bảng ProductColor (Product-Color relationship)
 ```sql
 CREATE TABLE "ProductColor" (
     "id" SERIAL PRIMARY KEY,
     "productId" INTEGER NOT NULL,
     "colorId" INTEGER NOT NULL,
     "isDefault" BOOLEAN DEFAULT false,
     "order" INTEGER DEFAULT 0,
     "createdAt" TIMESTAMP,
     UNIQUE("productId", "colorId")
 );
 ```
 
 ### Thay đổi ProductImage
 - Thêm `colorId` (nullable) để link ảnh với màu
 - Ảnh có colorId = null là ảnh chung cho tất cả màu
 
 ### Thay đổi ProductVariant
 - Thay `colorName` bằng `colorId`
 - Variant = Product + Color + Size
 
 ## Các bước thực hiện
 
 ### 1. Chạy Migration
 ```bash
 cd backend
 npx prisma migrate deploy
 ```
 
 ### 2. Regenerate Prisma Client
 ```bash
 npx prisma generate
 ```
 
 ### 3. Seed lại dữ liệu (nếu cần)
 ```bash
 npx ts-node prisma/seed-products.ts
 ```
 
 ## API Response Format
 
 ### GET /api/products
 ```json
 {
   "success": true,
   "data": [
     {
       "id": 1,
       "name": "Áo lót ren hoa",
       "price": 350000,
       "image": "/images/seed/bra/bra-1.webp",
       "colorGroups": [
         {
           "colorId": 1,
           "colorName": "Đen",
           "hexCode": "#000000",
           "slug": "den",
           "isDefault": true,
           "images": [
             { "id": 1, "url": "/images/seed/bra/bra-1.webp" }
           ],
           "sizes": [
             { "variantId": 1, "size": "70A", "stock": 10 },
             { "variantId": 2, "size": "70B", "stock": 5 }
           ],
           "totalStock": 15
         },
         {
           "colorId": 2,
           "colorName": "Hồng",
           "hexCode": "#FFC0CB",
           "slug": "hong",
           "isDefault": false,
           "images": [
             { "id": 3, "url": "/images/seed/bra/bra-2.webp" }
           ],
           "sizes": [
             { "variantId": 4, "size": "70A", "stock": 8 }
           ],
           "totalStock": 8
         }
       ]
     }
   ]
 }
 ```
 
 ## Frontend Usage
 
 ### ProductCard Component
 ```tsx
 // Color swatches tự động hiển thị khi có colorGroups
 <ProductCard product={product} />
 
 // Click vào màu sẽ thay đổi ảnh ngay lập tức (client-side)
 ```
 
 ## Files Changed
 
 ### Backend
 - `prisma/schema.prisma` - Thêm Color, ProductColor models
 - `prisma/migrations/20260202000000_add_color_system/migration.sql`
 - `prisma/seed-products.ts` - Cập nhật để tạo ProductColor và link ảnh với màu
 - `src/controllers/productController.ts` - Trả về colorGroups
 - `src/controllers/colorController.ts` - CRUD cho Color
 - `src/controllers/filterController.ts` - Filter theo màu từ bảng Color mới
 
 ### Frontend
 - `src/components/product/ProductCard.tsx` - Thêm color swatches UI
 - `src/app/san-pham/page.tsx` - Map colorGroups từ API

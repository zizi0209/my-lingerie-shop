# Hướng Dẫn Test API Toàn Diện với Postman

## Lưu Ý Trước Khi Test

### 1. Chạy Migration Database
```bash
cd backend
npx prisma migrate reset
# hoặc
npx prisma db push
```

### 2. Khởi động Server
```bash
cd backend
npm run dev
```

### 3. Base URL
```
http://localhost:3000/api
```

---

## 📋 TABLE OF CONTENTS

1. [Roles & Permissions](#1-roles--permissions)
2. [Users](#2-users)
3. [Categories](#3-categories)
4. [Products](#4-products)
5. [Post Categories](#5-post-categories)
6. [Posts](#6-posts)
7. [Cart](#7-cart)
8. [Orders](#8-orders)
9. [Page Sections](#9-page-sections)
10. [Tracking](#10-tracking)
11. [Media](#11-media)

---

## 1. ROLES & PERMISSIONS

### 1.1 Create Permission
```http
POST http://localhost:3000/api/permissions
Content-Type: application/json

{
  "name": "products.create",
  "description": "Quyền tạo sản phẩm mới"
}
```

### 1.2 Get All Permissions
```http
GET http://localhost:3000/api/permissions
```

### 1.3 Get Permission by ID
```http
GET http://localhost:3000/api/permissions/1
```

### 1.4 Update Permission
```http
PUT http://localhost:3000/api/permissions/1
Content-Type: application/json

{
  "name": "products.edit",
  "description": "Quyền chỉnh sửa sản phẩm"
}
```

### 1.5 Delete Permission
```http
DELETE http://localhost:3000/api/permissions/1
```

### 1.6 Create Role
```http
POST http://localhost:3000/api/roles
Content-Type: application/json

{
  "name": "admin",
  "description": "Quản trị viên hệ thống",
  "permissionIds": [1, 2, 3]
}
```

### 1.7 Get All Roles
```http
GET http://localhost:3000/api/roles
```

### 1.8 Get Role by ID
```http
GET http://localhost:3000/api/roles/1
```

### 1.9 Update Role
```http
PUT http://localhost:3000/api/roles/1
Content-Type: application/json

{
  "name": "manager",
  "description": "Quản lý cửa hàng",
  "permissionIds": [1, 2]
}
```

### 1.10 Delete Role
```http
DELETE http://localhost:3000/api/roles/1
```

---

## 2. USERS

### 2.1 Create User (Register)
```http
POST http://localhost:3000/api/users/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123",
  "name": "Admin User",
  "phone": "0123456789",
  "roleId": 1
}
```

### 2.2 Login
```http
POST http://localhost:3000/api/users/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

### 2.3 Get All Users
```http
GET http://localhost:3000/api/users?page=1&limit=20
```

### 2.4 Get User by ID
```http
GET http://localhost:3000/api/users/1
```

### 2.5 Update User
```http
PUT http://localhost:3000/api/users/1
Content-Type: application/json

{
  "name": "Updated Admin",
  "phone": "0987654321",
  "avatar": "https://example.com/avatar.jpg"
}
```

### 2.6 Delete User (Soft Delete)
```http
DELETE http://localhost:3000/api/users/1
```

---

## 3. CATEGORIES

### 3.1 Create Category
```http
POST http://localhost:3000/api/categories
Content-Type: application/json

{
  "name": "Áo lót",
  "slug": "ao-lot",
  "image": "https://example.com/ao-lot.jpg"
}
```

### 3.2 Get All Categories
```http
GET http://localhost:3000/api/categories?page=1&limit=20
```

### 3.3 Get Category by ID
```http
GET http://localhost:3000/api/categories/1
```

### 3.4 Get Category by Slug
```http
GET http://localhost:3000/api/categories/slug/ao-lot
```

### 3.5 Update Category
```http
PUT http://localhost:3000/api/categories/1
Content-Type: application/json

{
  "name": "Áo lót cao cấp",
  "image": "https://example.com/ao-lot-new.jpg"
}
```

### 3.6 Delete Category
```http
DELETE http://localhost:3000/api/categories/1
```

---

## 4. PRODUCTS

### 4.1 Create Product
```http
POST http://localhost:3000/api/products
Content-Type: application/json

{
  "name": "Áo lót ren trắng",
  "slug": "ao-lot-ren-trang",
  "description": "Áo lót ren cao cấp, chất liệu mềm mại",
  "price": 250000,
  "salePrice": 200000,
  "categoryId": 1,
  "isFeatured": true,
  "isVisible": true
}
```

### 4.2 Get All Products
```http
GET http://localhost:3000/api/products?page=1&limit=20&categoryId=1&isFeatured=true&search=ren
```

### 4.3 Get Product by ID
```http
GET http://localhost:3000/api/products/1
```

### 4.4 Get Product by Slug
```http
GET http://localhost:3000/api/products/slug/ao-lot-ren-trang
```

### 4.5 Update Product
```http
PUT http://localhost:3000/api/products/1
Content-Type: application/json

{
  "name": "Áo lót ren trắng Premium",
  "price": 300000,
  "salePrice": 250000
}
```

### 4.6 Delete Product (Soft Delete)
```http
DELETE http://localhost:3000/api/products/1
```

### 4.7 Add Product Image
```http
POST http://localhost:3000/api/products/1/images
Content-Type: application/json

{
  "url": "https://example.com/image1.jpg"
}
```

### 4.8 Delete Product Image
```http
DELETE http://localhost:3000/api/products/images/1
```

### 4.9 Create Product Variant
```http
POST http://localhost:3000/api/products/1/variants
Content-Type: application/json

{
  "sku": "AO-LOT-M-WHITE",
  "size": "M",
  "color": "Trắng",
  "stock": 100,
  "price": 250000,
  "salePrice": 200000
}
```

### 4.10 Update Product Variant
```http
PUT http://localhost:3000/api/products/variants/1
Content-Type: application/json

{
  "stock": 150,
  "price": 260000
}
```

### 4.11 Delete Product Variant
```http
DELETE http://localhost:3000/api/products/variants/1
```

---

## 5. POST CATEGORIES

### 5.1 Create Post Category
```http
POST http://localhost:3000/api/post-categories
Content-Type: application/json

{
  "name": "Tin Tức",
  "slug": "tin-tuc"
}
```

### 5.2 Get All Post Categories
```http
GET http://localhost:3000/api/post-categories?page=1&limit=20
```

### 5.3 Get Post Category by ID
```http
GET http://localhost:3000/api/post-categories/1
```

### 5.4 Get Post Category by Slug
```http
GET http://localhost:3000/api/post-categories/slug/tin-tuc
```

### 5.5 Update Post Category
```http
PUT http://localhost:3000/api/post-categories/1
Content-Type: application/json

{
  "name": "Tin Tức Mới",
  "slug": "tin-tuc-moi"
}
```

### 5.6 Delete Post Category (Soft Delete)
```http
DELETE http://localhost:3000/api/post-categories/1
```

---

## 6. POSTS

### 6.1 Create Post
```http
POST http://localhost:3000/api/posts
Content-Type: application/json

{
  "title": "Hướng dẫn chọn áo lót phù hợp",
  "slug": "huong-dan-chon-ao-lot-phu-hop",
  "content": "Nội dung bài viết chi tiết...",
  "excerpt": "Tóm tắt ngắn gọn",
  "thumbnail": "https://example.com/thumbnail.jpg",
  "authorId": 1,
  "categoryId": 1,
  "isPublished": true,
  "publishedAt": "2024-01-01T00:00:00Z"
}
```

### 6.2 Get All Posts
```http
GET http://localhost:3000/api/posts?page=1&limit=20&categoryId=1&isPublished=true&search=áo lót
```

### 6.3 Get Post by ID
```http
GET http://localhost:3000/api/posts/1
```

### 6.4 Get Post by Slug (Auto increment views)
```http
GET http://localhost:3000/api/posts/slug/huong-dan-chon-ao-lot-phu-hop
```

### 6.5 Update Post
```http
PUT http://localhost:3000/api/posts/1
Content-Type: application/json

{
  "title": "Hướng dẫn chọn áo lót phù hợp - Update",
  "content": "Nội dung mới...",
  "isPublished": true
}
```

### 6.6 Delete Post (Soft Delete)
```http
DELETE http://localhost:3000/api/posts/1
```

---

## 7. CART

### 7.1 Get Cart by User ID
```http
GET http://localhost:3000/api/carts?userId=1
```

### 7.2 Get Cart by Session ID (Guest)
```http
GET http://localhost:3000/api/carts?sessionId=guest-session-123
```

### 7.3 Add Item to Cart
```http
POST http://localhost:3000/api/carts/items
Content-Type: application/json

{
  "cartId": 1,
  "productId": 1,
  "variantId": 1,
  "quantity": 2
}
```

### 7.4 Update Cart Item Quantity
```http
PUT http://localhost:3000/api/carts/items/1
Content-Type: application/json

{
  "quantity": 5
}
```

### 7.5 Remove Item from Cart
```http
DELETE http://localhost:3000/api/carts/items/1
```

### 7.6 Clear Cart
```http
DELETE http://localhost:3000/api/carts/1/clear
```

---

## 8. ORDERS

### 8.1 Create Order
```http
POST http://localhost:3000/api/orders
Content-Type: application/json

{
  "userId": 1,
  "orderNumber": "ORD-2024-0001",
  "shippingAddress": "123 Đường ABC, Quận 1",
  "shippingCity": "TP. Hồ Chí Minh",
  "shippingPhone": "0123456789",
  "shippingMethod": "Standard",
  "paymentMethod": "COD",
  "totalAmount": 500000,
  "shippingFee": 30000,
  "discount": 0,
  "notes": "Giao giờ hành chính",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "price": 200000,
      "variant": "Size M - Màu Trắng"
    }
  ]
}
```

### 8.2 Get All Orders
```http
GET http://localhost:3000/api/orders?page=1&limit=20&status=PENDING
```

### 8.3 Get Order by ID
```http
GET http://localhost:3000/api/orders/1
```

### 8.4 Update Order Status
```http
PUT http://localhost:3000/api/orders/1
Content-Type: application/json

{
  "status": "SHIPPING",
  "trackingNumber": "TRACK-123456"
}
```

### 8.5 Cancel Order
```http
PUT http://localhost:3000/api/orders/1
Content-Type: application/json

{
  "status": "CANCELLED",
  "cancelledAt": "2024-01-02T00:00:00Z"
}
```

---

## 9. PAGE SECTIONS

### 9.1 Create Page Section
```http
POST http://localhost:3000/api/page-sections
Content-Type: application/json

{
  "code": "HERO",
  "name": "Hero Banner",
  "isVisible": true,
  "order": 1,
  "content": {
    "title": "Chào mừng đến với cửa hàng",
    "subtitle": "Sản phẩm chất lượng cao",
    "buttonText": "Mua ngay",
    "buttonLink": "/products",
    "bannerUrl": "https://example.com/banner.jpg"
  }
}
```

### 9.2 Get All Page Sections
```http
GET http://localhost:3000/api/page-sections
```

### 9.3 Get Page Section by ID
```http
GET http://localhost:3000/api/page-sections/1
```

### 9.4 Get Page Section by Code
```http
GET http://localhost:3000/api/page-sections/code/HERO
```

### 9.5 Update Page Section
```http
PUT http://localhost:3000/api/page-sections/1
Content-Type: application/json

{
  "name": "Hero Banner Updated",
  "content": {
    "title": "Tiêu đề mới",
    "bannerUrl": "https://example.com/new-banner.jpg"
  }
}
```

### 9.6 Delete Page Section
```http
DELETE http://localhost:3000/api/page-sections/1
```

---

## 10. TRACKING

### 10.1 Track Page View
```http
POST http://localhost:3000/api/tracking/page-views
Content-Type: application/json

{
  "path": "/products",
  "userId": 1,
  "sessionId": "session-123",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "referer": "https://google.com"
}
```

### 10.2 Get Page View Analytics
```http
GET http://localhost:3000/api/tracking/page-views/analytics?startDate=2024-01-01&endDate=2024-12-31&limit=10
```

### 10.3 Track Product View
```http
POST http://localhost:3000/api/tracking/product-views
Content-Type: application/json

{
  "productId": 1,
  "userId": 1,
  "sessionId": "session-123"
}
```

### 10.4 Get Product View Analytics
```http
GET http://localhost:3000/api/tracking/product-views/analytics?startDate=2024-01-01&endDate=2024-12-31&limit=10
```

### 10.5 Track Cart Event
```http
POST http://localhost:3000/api/tracking/cart-events
Content-Type: application/json

{
  "event": "add_to_cart",
  "cartId": 1,
  "productId": 1,
  "userId": 1,
  "sessionId": "session-123",
  "data": {
    "quantity": 2,
    "price": 200000
  }
}
```

**Cart Event Types:**
- `add_to_cart` - Thêm sản phẩm vào giỏ
- `remove_from_cart` - Xóa sản phẩm khỏi giỏ
- `update_quantity` - Cập nhật số lượng
- `checkout_start` - Bắt đầu thanh toán
- `checkout_complete` - Hoàn tất đơn hàng

### 10.6 Get Cart Event Analytics
```http
GET http://localhost:3000/api/tracking/cart-events/analytics?startDate=2024-01-01&endDate=2024-12-31&event=add_to_cart
```

---

## 11. MEDIA

### 11.1 Upload Media (Cloudinary)
```http
POST http://localhost:3000/api/media/upload
Content-Type: multipart/form-data

file: [Select file]
folder: "products"
```

### 11.2 Get All Media
```http
GET http://localhost:3000/api/media?page=1&limit=20&folder=products
```

### 11.3 Get Media by ID
```http
GET http://localhost:3000/api/media/1
```

### 11.4 Delete Media
```http
DELETE http://localhost:3000/api/media/1
```

---

## 📊 Test Flow Scenarios

### Scenario 1: Setup System
1. Create Permissions (products.create, products.edit, orders.view...)
2. Create Roles (admin, manager, customer)
3. Create Admin User with role

### Scenario 2: E-commerce Flow
1. Create Categories
2. Create Products with images and variants
3. Guest browsing: Track page views & product views
4. Add to cart: Track cart events
5. Checkout: Create order
6. Admin: Update order status

### Scenario 3: Content Management
1. Create Post Categories
2. Create Posts
3. Publish Posts
4. Track post views

### Scenario 4: Analytics Dashboard
1. Get page view analytics
2. Get product view analytics
3. Get cart event analytics
4. Get order statistics

---

## 🔧 Tips & Best Practices

### 1. Environment Variables
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
PORT=3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Postman Collection Setup
- Create Environment với base_url variable
- Use {{base_url}} thay vì hardcode
- Save common variables (userId, cartId, sessionId...)

### 3. Testing Order
1. Test CRUD operations cho mỗi resource
2. Test pagination & filtering
3. Test soft delete
4. Test relationships (include/select)
5. Test error cases (404, 400, 500)

### 4. Common Error Responses
```json
{
  "error": "Error message in Vietnamese"
}
```

### 5. Success Response Format
```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

---

## ⚠️ Known Issues & Solutions

### Issue 1: Prisma Client Not Generated
**Solution:**
```bash
npx prisma generate
```

### Issue 2: Database Not Migrated
**Solution:**
```bash
npx prisma migrate reset
# hoặc
npx prisma db push
```

### Issue 3: CORS Error
**Solution:** Check server.ts CORS configuration

### Issue 4: Port Already in Use
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Postman Documentation](https://learning.postman.com/)

---

**Happy Testing! 🚀**

# Hướng dẫn sử dụng API Product Images & Variants

## 1. Product Images

### Schema trong Database
```typescript
model ProductImage {
  id        Int      @id @default(autoincrement())
  url       String   // URL của ảnh
  productId Int      // ID sản phẩm
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

### API Endpoints

#### 1.1. Get All Product Images
```http
GET /api/products/:id/images
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://res.cloudinary.com/example/image.jpg",
      "productId": 1,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 1.2. Get Product Image by ID
```http
GET /api/products/images/:imageId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://res.cloudinary.com/example/image.jpg",
    "productId": 1,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 1.3. Add Product Images ✅
```http
POST /api/products/:id/images
Authorization: Bearer {token}
Content-Type: application/json
```

**API hỗ trợ 2 format (đồng bộ với schema field `url`):**

**Option 1: Thêm 1 ảnh (single)**
```json
{
  "url": "https://res.cloudinary.com/example/image/upload/v1234567890/product1.jpg"
}
```

**Option 2: Thêm nhiều ảnh (multiple)**
```json
{
  "urls": [
    "https://res.cloudinary.com/example/image/upload/v1234567890/product1.jpg",
    "https://res.cloudinary.com/example/image/upload/v1234567890/product2.jpg",
    "https://res.cloudinary.com/example/image/upload/v1234567890/product3.jpg"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã thêm 1 ảnh thành công!"
}
```

Hoặc với nhiều ảnh:
```json
{
  "success": true,
  "message": "Đã thêm 3 ảnh thành công!"
}
```

#### 1.4. Update Product Image
```http
PUT /api/products/images/:imageId
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://res.cloudinary.com/example/image/upload/v1234567890/product-updated.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://res.cloudinary.com/example/image/upload/v1234567890/product-updated.jpg",
    "productId": 1,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 1.5. Delete Product Image
```http
DELETE /api/products/images/:imageId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã xóa ảnh thành công!"
}
```

---

## 2. Product Variants

### Schema trong Database
```typescript
model ProductVariant {
  id        Int        @id @default(autoincrement())
  sku       String     @unique
  size      String
  color     String
  stock     Int        @default(0)
  price     Float?
  salePrice Float?
  productId Int
  product   Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

### API Endpoints

#### 2.1. Get All Product Variants
```http
GET /api/products/:id/variants
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sku": "AO-LOT-M-WHITE",
      "size": "M",
      "color": "Trắng",
      "stock": 100,
      "price": 250000,
      "salePrice": 200000,
      "productId": 1,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2.2. Get Product Variant by ID
```http
GET /api/products/variants/:variantId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sku": "AO-LOT-M-WHITE",
    "size": "M",
    "color": "Trắng",
    "stock": 100,
    "price": 250000,
    "salePrice": 200000,
    "productId": 1,
    "product": {
      "id": 1,
      "name": "Áo lót ren trắng"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 2.3. Add Product Variants ⚠️
```http
POST /api/products/:id/variants
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body (QUAN TRỌNG - GỬI MẢNG):**
```json
{
  "variants": [
    {
      "sku": "AO-LOT-M-WHITE",
      "size": "M",
      "color": "Trắng",
      "stock": 100,
      "price": 250000,
      "salePrice": 200000
    },
    {
      "sku": "AO-LOT-S-WHITE",
      "size": "S",
      "color": "Trắng",
      "stock": 50
    },
    {
      "sku": "AO-LOT-M-BLACK",
      "size": "M",
      "color": "Đen",
      "stock": 80
    }
  ]
}
```

**Lưu ý:**
- `sku` phải unique
- `price` và `salePrice` là optional (nếu không có sẽ dùng giá của product)
- Có thể thêm nhiều variants cùng lúc

**Response:**
```json
{
  "success": true,
  "message": "Đã thêm 3 biến thể thành công!",
  "data": [
    {
      "id": 1,
      "sku": "AO-LOT-M-WHITE",
      "size": "M",
      "color": "Trắng",
      "stock": 100,
      "price": 250000,
      "salePrice": 200000,
      "productId": 1,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2.4. Update Product Variant
```http
PUT /api/products/variants/:variantId
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "stock": 150,
  "price": 260000,
  "salePrice": 220000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "sku": "AO-LOT-M-WHITE",
    "size": "M",
    "color": "Trắng",
    "stock": 150,
    "price": 260000,
    "salePrice": 220000,
    "productId": 1,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

#### 2.5. Delete Product Variant
```http
DELETE /api/products/variants/:variantId
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã xóa biến thể thành công!"
}
```

---

## 3. Lỗi thường gặp

### ❌ Lỗi: "URL ảnh là bắt buộc! Gửi 'url' (string) hoặc 'urls' (array)"
**Nguyên nhân:** Không gửi field `url` hoặc `urls`

**Giải pháp:** Gửi 1 trong 2 format:
```json
// Single image
{
  "url": "https://example.com/image.jpg"
}

// Multiple images
{
  "urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
}
```

### ❌ Lỗi: "Danh sách biến thể là bắt buộc!"
**Nguyên nhân:** Gửi object đơn lẻ thay vì mảng

**Giải pháp:** Luôn gửi mảng:
```json
{
  "variants": [
    {
      "sku": "...",
      "size": "...",
      "color": "...",
      "stock": 100
    }
  ]
}
```

### ❌ Lỗi: "Expected 3 records to be connected, found only 1"
**Nguyên nhân:** Permission IDs không tồn tại trong database

**Giải pháp:** Chạy seed trước:
```bash
cd backend
bun run seed
```

---

## 4. Import vào Postman

1. Mở Postman
2. Click **Import**
3. Chọn file `Lingerie_Shop_API.postman_collection.json`
4. Import environment file `Lingerie_Shop_Environment.postman_environment.json`
5. Đặt `base_url` = `http://localhost:5000/api` (hoặc port của bạn)

Tất cả endpoints đã được cập nhật với format đúng!

# Hướng Dẫn Test API ProductImage trên Postman

## Thông tin chung

**Base URL:** `http://localhost:3000/api`

**Endpoints:** `/products/`

---

## 1️⃣ GET - Lấy tất cả ảnh của 1 Product

### Request
```
GET http://localhost:3000/api/products/:id/images
```

**Param:**
- `id` = ID của product (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

### Example
```
GET http://localhost:3000/api/products/1/images
```

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://example.com/image1.jpg",
      "productId": 1
    },
    {
      "id": 2,
      "url": "https://example.com/image2.jpg",
      "productId": 1
    }
  ]
}
```

### Error (404 Not Found)
```json
{
  "error": "Không tìm thấy sản phẩm!"
}
```

---

## 2️⃣ GET - Lấy chi tiết 1 ảnh theo imageId

### Request
```
GET http://localhost:3000/api/products/images/:imageId
```

**Param:**
- `imageId` = ID của ảnh (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

### Example
```
GET http://localhost:3000/api/products/images/1
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://example.com/image1.jpg",
    "productId": 1,
    "product": {
      "id": 1,
      "name": "Áo lót ren hoa",
      "slug": "ao-lot-ren-hoa"
    }
  }
}
```

### Error (404 Not Found)
```json
{
  "error": "Không tìm thấy ảnh!"
}
```

---

## 3️⃣ POST - Thêm ảnh vào Product

### Request
```
POST http://localhost:3000/api/products/:id/images
```

**Param:**
- `id` = ID của product (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}
```

**Body (raw JSON):**
```json
{
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ]
}
```

### Example
```
POST http://localhost:3000/api/products/1/images

Body:
{
  "images": [
    "https://res.cloudinary.com/example/image/upload/v1234567890/product1.jpg"
  ]
}
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Đã thêm 3 ảnh thành công!"
}
```

### Errors

**400 Bad Request** - Danh sách ảnh trống:
```json
{
  "error": "Danh sách ảnh là bắt buộc!"
}
```

**404 Not Found** - Product không tồn tại:
```json
{
  "error": "Không tìm thấy sản phẩm!"
}
```

**401 Unauthorized** - Token không hợp lệ:
```json
{
  "error": "Token không hợp lệ"
}
```

---

## 4️⃣ PUT - Cập nhật URL ảnh

### Request
```
PUT http://localhost:3000/api/products/images/:imageId
```

**Param:**
- `imageId` = ID của ảnh (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}
```

**Body (raw JSON):**
```json
{
  "url": "https://example.com/new-image.jpg"
}
```

### Example
```
PUT http://localhost:3000/api/products/images/1

Body:
{
  "url": "https://res.cloudinary.com/example/image/upload/v1234567890/updated-product.jpg"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://example.com/new-image.jpg",
    "productId": 1
  }
}
```

### Errors

**400 Bad Request** - URL không được cung cấp:
```json
{
  "error": "URL ảnh là bắt buộc!"
}
```

**404 Not Found** - Ảnh không tồn tại:
```json
{
  "error": "Không tìm thấy ảnh!"
}
```

---

## 5️⃣ DELETE - Xóa ảnh

### Request
```
DELETE http://localhost:3000/api/products/images/:imageId
```

**Param:**
- `imageId` = ID của ảnh (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}
```

### Example
```
DELETE http://localhost:3000/api/products/images/1
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Đã xóa ảnh thành công!"
}
```

### Error (404 Not Found)
```json
{
  "error": "Không tìm thấy ảnh!"
}
```

---

## 📝 Quy trình Test Chi Tiết

### Bước 1: Tạo Product (nếu chưa có)
```
POST http://localhost:3000/api/products

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}

Body:
{
  "name": "Áo lót ren hoa",
  "slug": "ao-lot-ren-hoa",
  "description": "Áo lót đẹp với họa tiết ren",
  "price": 150000,
  "categoryId": 1
}
```

### Bước 2: Thêm ảnh vào Product
```
POST http://localhost:3000/api/products/1/images

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}

Body:
{
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

### Bước 3: Lấy danh sách ảnh của Product
```
GET http://localhost:3000/api/products/1/images
```

### Bước 4: Lấy chi tiết 1 ảnh
```
GET http://localhost:3000/api/products/images/1
```

### Bước 5: Cập nhật URL ảnh
```
PUT http://localhost:3000/api/products/images/1

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}

Body:
{
  "url": "https://example.com/updated-image.jpg"
}
```

### Bước 6: Xóa ảnh
```
DELETE http://localhost:3000/api/products/images/1

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}
```

---

## 🔐 Cách lấy Token

### 1. Login để nhận Token
```
POST http://localhost:3000/api/auth/login

Body:
{
  "email": "admin@example.com",
  "password": "password123"
}
```

### Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### 2. Copy Token và sử dụng trong Headers
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## ✅ Checklist Test

- [ ] GET `/api/products/:id/images` - Lấy tất cả ảnh
- [ ] GET `/api/products/images/:imageId` - Lấy 1 ảnh chi tiết
- [ ] POST `/api/products/:id/images` - Thêm ảnh (cần token)
- [ ] PUT `/api/products/images/:imageId` - Cập nhật ảnh (cần token)
- [ ] DELETE `/api/products/images/:imageId` - Xóa ảnh (cần token)
- [ ] Test với imageId không tồn tại → 404 error
- [ ] Test với productId không tồn tại → 404 error
- [ ] Test POST mà quên token → 401 error
- [ ] Test POST với images trống → 400 error

---

## 💡 Tips

1. **Lưu token vào Environment Variable** để dễ sử dụng:
   - Click vào environment icon
   - Tạo biến `token` với giá trị từ login
   - Dùng `{{token}}` trong Authorization

2. **Sử dụng Pre-request Script** để tự động login:
   ```javascript
   const loginRequest = {
     url: "http://localhost:3000/api/auth/login",
     method: 'POST',
     body: {
       mode: 'raw',
       raw: JSON.stringify({
         email: "admin@example.com",
         password: "password123"
       })
     }
   };
   
   pm.sendRequest(loginRequest, function(err, response) {
     if (!err) {
       const token = response.json().token;
       pm.environment.set("token", token);
     }
   });
   ```

3. **Lưu Test Results** bằng cách chạy Collection Runner

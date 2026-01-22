# Hướng Dẫn Test API ProductVariant trên Postman

## Thông tin chung

**Base URL:** `http://localhost:5000/api`

**Endpoints:** `/products/`

---

## 1️⃣ GET - Lấy tất cả Variant của 1 Product

### Request
```
GET http://localhost:5000/api/products/:id/variants
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
GET http://localhost:5000/api/products/1/variants
```

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "size": "M",
      "color": "Đỏ",
      "stock": 10,
      "productId": 1
    },
    {
      "id": 2,
      "size": "L",
      "color": "Đen",
      "stock": 15,
      "productId": 1
    },
    {
      "id": 3,
      "size": "XL",
      "color": "Hồng",
      "stock": 8,
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

## 2️⃣ GET - Lấy chi tiết 1 Variant theo variantId

### Request
```
GET http://localhost:5000/api/products/variants/:variantId
```

**Param:**
- `variantId` = ID của variant (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

### Example
```
GET http://localhost:5000/api/products/variants/1
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "size": "M",
    "color": "Đỏ",
    "stock": 10,
    "productId": 1,
    "product": {
      "id": 1,
      "name": "Áo lót ren cao cấp",
      "slug": "ao-lot-ren-cao-cap"
    }
  }
}
```

### Error (404 Not Found)
```json
{
  "error": "Không tìm thấy biến thể!"
}
```

---

## 3️⃣ POST - Thêm Variant vào Product 🔒

### Request
```
POST http://localhost:5000/api/products/:id/variants
```

**Param:**
- `id` = ID của product (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_ADMIN_TOKEN"
}
```

**Body (raw JSON):**
```json
{
  "variants": [
    {
      "size": "S",
      "color": "Trắng",
      "stock": 5
    },
    {
      "size": "M",
      "color": "Kem",
      "stock": 12
    },
    {
      "size": "L",
      "color": "Xanh nước biển",
      "stock": 8
    }
  ]
}
```

### Example
```
POST http://localhost:5000/api/products/1/variants

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Body:
{
  "variants": [
    {
      "size": "34B",
      "color": "Đỏ tươi",
      "stock": 20
    },
    {
      "size": "36B",
      "color": "Đen",
      "stock": 18
    }
  ]
}
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Đã thêm 2 biến thể thành công!"
}
```

### Errors

**400 Bad Request** - Danh sách biến thể trống:
```json
{
  "error": "Danh sách biến thể là bắt buộc!"
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
  "error": "Token không hợp lệ hoặc đã hết hạn!"
}
```

**403 Forbidden** - Không phải admin:
```json
{
  "error": "Chỉ admin mới có quyền truy cập!"
}
```

---

## 4️⃣ PUT - Cập nhật Variant 🔒

### Request
```
PUT http://localhost:5000/api/products/variants/:variantId
```

**Param:**
- `variantId` = ID của variant (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_ADMIN_TOKEN"
}
```

**Body (raw JSON):**
```json
{
  "size": "XL",
  "color": "Hồng pastel",
  "stock": 25
}
```

### Example 1: Cập nhật toàn bộ field
```
PUT http://localhost:5000/api/products/variants/1

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Body:
{
  "size": "M",
  "color": "Đỏ ruby",
  "stock": 15
}
```

### Example 2: Cập nhật chỉ stock (khi bán được hàng)
```
PUT http://localhost:5000/api/products/variants/1

Body:
{
  "stock": 8
}
```

### Example 3: Cập nhật màu sắc
```
PUT http://localhost:5000/api/products/variants/2

Body:
{
  "color": "Đen tuyền"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "size": "XL",
    "color": "Hồng pastel",
    "stock": 25,
    "productId": 1
  }
}
```

### Errors

**404 Not Found** - Variant không tồn tại:
```json
{
  "error": "Không tìm thấy biến thể!"
}
```

**401 Unauthorized** - Token không hợp lệ:
```json
{
  "error": "Token không hợp lệ hoặc đã hết hạn!"
}
```

---

## 5️⃣ DELETE - Xóa Variant 🔒

### Request
```
DELETE http://localhost:5000/api/products/variants/:variantId
```

**Param:**
- `variantId` = ID của variant (ví dụ: 1)

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_ADMIN_TOKEN"
}
```

### Example
```
DELETE http://localhost:5000/api/products/variants/1

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Đã xóa biến thể thành công!"
}
```

### Error (404 Not Found)
```json
{
  "error": "Không tìm thấy biến thể!"
}
```

---

## 📝 Quy trình Test Chi Tiết

### Bước 1: Login để lấy Admin Token
```
POST http://localhost:5000/api/users/login

Headers:
{
  "Content-Type": "application/json"
}

Body:
{
  "email": "admin@shop.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@shop.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

💡 **Lưu token này để dùng cho các request tiếp theo!**

### Bước 2: Tạo hoặc chọn Product (nếu chưa có)
```
POST http://localhost:5000/api/products

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}

Body:
{
  "name": "Áo lót ren cao cấp",
  "slug": "ao-lot-ren-cao-cap",
  "description": "Áo lót đẹp với họa tiết ren",
  "price": 299000,
  "salePrice": 249000,
  "categoryId": 1
}
```

Lưu `productId` từ response (ví dụ: 5)

### Bước 3: Thêm Variant vào Product
```
POST http://localhost:5000/api/products/5/variants

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}

Body:
{
  "variants": [
    {
      "size": "32A",
      "color": "Đỏ",
      "stock": 10
    },
    {
      "size": "34A",
      "color": "Đỏ",
      "stock": 12
    },
    {
      "size": "32B",
      "color": "Đen",
      "stock": 8
    },
    {
      "size": "34B",
      "color": "Đen",
      "stock": 15
    }
  ]
}
```

### Bước 4: Lấy danh sách tất cả Variant của Product
```
GET http://localhost:5000/api/products/5/variants
```

Response sẽ hiển thị tất cả 4 variant vừa thêm.

### Bước 5: Lấy chi tiết 1 Variant
```
GET http://localhost:5000/api/products/variants/1

(1 là variantId)
```

### Bước 6: Cập nhật stock khi bán được hàng
```
PUT http://localhost:5000/api/products/variants/1

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}

Body:
{
  "stock": 8
}
```

### Bước 7: Cập nhật toàn bộ thông tin Variant
```
PUT http://localhost:5000/api/products/variants/1

Body:
{
  "size": "32A",
  "color": "Đỏ hồng",
  "stock": 7
}
```

### Bước 8: Xóa Variant
```
DELETE http://localhost:5000/api/products/variants/1

Headers:
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}
```

---

## 🔐 Cách lấy và sử dụng Token

### 1. Login để nhận Token
```
POST http://localhost:5000/api/users/login

Body:
{
  "email": "admin@shop.com",
  "password": "Admin@123"
}
```

### 2. Copy Token từ Response
Token sẽ nằm trong `data.token`

### 3. Sử dụng Token trong Headers
```json
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 💡 Tips & Tricks

### 1. Lưu Token vào Environment Variable (Postman)
1. Click vào icon **⚙️** góc trên bên phải
2. Chọn **Manage Environments**
3. Tạo Environment mới (ví dụ: "Lingerie Shop Dev")
4. Thêm biến:
   - `base_url`: `http://localhost:5000`
   - `token`: (để trống lúc đầu)
   - `admin_email`: `admin@shop.com`
   - `admin_password`: `Admin@123`

5. Sử dụng trong request:
   - URL: `{{base_url}}/api/products/5/variants`
   - Header: `Bearer {{token}}`

### 2. Auto-save Token sau khi Login
Vào tab **Tests** của request Login, thêm script:
```javascript
var response = pm.response.json();
if (response.success && response.data.token) {
    pm.environment.set("token", response.data.token);
}
```

Bây giờ token sẽ tự động lưu vào environment sau mỗi lần login!

### 3. Sử dụng Pre-request Script để tự động Login
Thêm Pre-request Script vào Collection hoặc Folder:
```javascript
const loginRequest = {
  url: "{{base_url}}/api/users/login",
  method: 'POST',
  header: {
    'Content-Type': 'application/json'
  },
  body: {
    mode: 'raw',
    raw: JSON.stringify({
      email: pm.environment.get("admin_email"),
      password: pm.environment.get("admin_password")
    })
  }
};

pm.sendRequest(loginRequest, function(err, response) {
  if (!err && response.code === 200) {
    const token = response.json().data.token;
    pm.environment.set("token", token);
    console.log("✅ Token updated successfully!");
  } else {
    console.log("❌ Login failed:", err);
  }
});
```

---

## ✅ Checklist Test Complete

### Public APIs (Không cần Token)
- [ ] GET `/api/products/:id/variants` - Lấy tất cả variant
- [ ] GET `/api/products/variants/:variantId` - Lấy chi tiết 1 variant
- [ ] Test với variantId không tồn tại → 404 error
- [ ] Test với productId không tồn tại → 404 error

### Admin APIs (Cần Token)
- [ ] POST `/api/products/:id/variants` - Thêm variant (cần admin token)
- [ ] PUT `/api/products/variants/:variantId` - Cập nhật variant (cần admin token)
- [ ] DELETE `/api/products/variants/:variantId` - Xóa variant (cần admin token)

### Error Cases
- [ ] POST mà quên token → 401 error
- [ ] POST với token customer (non-admin) → 403 error
- [ ] POST với variants trống → 400 error
- [ ] POST với invalid variantId → 404 error
- [ ] PUT với invalid variantId → 404 error
- [ ] DELETE với invalid variantId → 404 error

### Use Cases thực tế
- [ ] Thêm nhiều size/màu cho 1 product
- [ ] Cập nhật stock sau khi bán
- [ ] Xóa variant hết hàng
- [ ] Tạo product hoàn chỉnh (với images + variants)

---

## 📋 Sample Data để Test

### Product 1: Áo lót ren cao cấp
```json
{
  "name": "Áo lót ren cao cấp",
  "slug": "ao-lot-ren-cao-cap",
  "price": 299000,
  "categoryId": 1
}
```

**Variants:**
```json
[
  { "size": "32A", "color": "Đỏ", "stock": 10 },
  { "size": "34A", "color": "Đỏ", "stock": 12 },
  { "size": "36A", "color": "Đỏ", "stock": 8 },
  { "size": "32B", "color": "Đen", "stock": 15 },
  { "size": "34B", "color": "Đen", "stock": 20 },
  { "size": "36B", "color": "Đen", "stock": 18 }
]
```

### Product 2: Quần lót sexy
```json
{
  "name": "Quần lót sexy",
  "slug": "quan-lot-sexy",
  "price": 199000,
  "categoryId": 1
}
```

**Variants:**
```json
[
  { "size": "S", "color": "Đỏ", "stock": 25 },
  { "size": "M", "color": "Đỏ", "stock": 30 },
  { "size": "L", "color": "Đỏ", "stock": 20 },
  { "size": "S", "color": "Xanh", "stock": 15 },
  { "size": "M", "color": "Xanh", "stock": 18 },
  { "size": "L", "color": "Xanh", "stock": 12 }
]
```

---

## 🚀 Test Flow hoàn chỉnh

```
1. POST /api/users/login 
   → Lấy token

2. POST /api/categories 
   → Tạo category "Áo lót ren" (lưu ID)

3. POST /api/products 
   → Tạo product trong category (lưu ID)

4. POST /api/products/:id/variants 
   → Thêm 6 variant size/color

5. GET /api/products/:id/variants 
   → Xem tất cả variant (expect 6 items)

6. GET /api/products/variants/1 
   → Xem chi tiết variant 1

7. PUT /api/products/variants/1 
   → Cập nhật stock = 5

8. GET /api/products/variants/1 
   → Xem lại stock = 5 (check update thành công)

9. DELETE /api/products/variants/1 
   → Xóa variant 1

10. GET /api/products/:id/variants 
    → Xem lại (expect 5 items, variant 1 bị xóa)

11. DELETE /api/products/:id 
    → Xóa toàn bộ product (variants auto-deleted)

12. GET /api/products/variants/2 
    → Expect 404 (variants đã bị xóa cascade)
```

---

## ⚠️ Lưu ý Bảo mật & Best Practices

- **KHÔNG BAO GIỜ** commit token lên GitHub
- Token có thời hạn 7 ngày, sau đó phải login lại
- Chỉ admin mới có quyền thêm/sửa/xóa variant
- Luôn validate stock > 0 trước khi bán
- Dùng slug duy nhất và SEO-friendly cho product
- Khi xóa product, tất cả variant sẽ auto-delete (cascade)

---

## 📚 Tài liệu liên quan

- [POSTMAN_TESTING.md](./POSTMAN_TESTING.md) - Test API User & Category
- [POSTMAN_PRODUCT_IMAGE_TESTING.md](./POSTMAN_PRODUCT_IMAGE_TESTING.md) - Test API ProductImage

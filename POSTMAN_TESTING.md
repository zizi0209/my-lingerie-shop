# Hướng dẫn Test API trên Postman

## Mục lục
1. [API User](#api-user)
2. [API Categories](#api-categories)
3. [API Products](#api-products)

## Bước 1: Cài đặt Postman
- Download tại: https://www.postman.com/downloads/
- Hoặc dùng Postman Web: https://web.postman.com/

## Bước 2: Khởi động Backend Server
```bash
cd backend
npm run dev
```
Server sẽ chạy tại: `http://localhost:5000`

---

## API User

## 📌 API Endpoints

### 1. Đăng ký User mới (Register)

**URL:** `http://localhost:5000/api/users/register`
**Method:** `POST`
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "admin@shop.com",
  "password": "Admin@123",
  "name": "Admin Shop",
  "role": "admin"
}
```

**Response thành công (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@shop.com",
      "name": "Admin Shop",
      "role": "admin",
      "createdAt": "2025-12-26T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**💡 Lưu ý:** Copy token này để dùng cho các request tiếp theo!

---

### 2. Đăng nhập (Login)

**URL:** `http://localhost:5000/api/users/login`
**Method:** `POST`
**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "email": "admin@shop.com",
  "password": "Admin@123"
}
```

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@shop.com",
      "name": "Admin Shop",
      "role": "admin",
      "createdAt": "2025-12-26T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Xem Profile của mình (Get Profile)

**URL:** `http://localhost:5000/api/users/profile`
**Method:** `GET`
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**💡 Cách thêm Token vào Postman:**
1. Vào tab **Headers**
2. Thêm key: `Authorization`
3. Value: `Bearer <token_của_bạn>` (có khoảng trắng sau Bearer)

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@shop.com",
    "name": "Admin Shop",
    "role": "admin",
    "createdAt": "2025-12-26T10:00:00.000Z",
    "orders": []
  }
}
```

---

### 4. Lấy danh sách tất cả Users (Get All Users)

**URL:** `http://localhost:5000/api/users?page=1&limit=10`
**Method:** `GET`
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameters:**
- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số lượng users mỗi trang (mặc định: 20)
- `role`: Lọc theo role (optional) - ví dụ: `?role=admin`

**Response thành công (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "email": "admin@shop.com",
      "name": "Admin Shop",
      "role": "admin",
      "createdAt": "2025-12-26T10:00:00.000Z"
    },
    {
      "id": 2,
      "email": "customer@gmail.com",
      "name": "Khách hàng",
      "role": "customer",
      "createdAt": "2025-12-26T10:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

---

### 5. Xem chi tiết User theo ID

**URL:** `http://localhost:5000/api/users/1`
**Method:** `GET`
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@shop.com",
    "name": "Admin Shop",
    "role": "admin",
    "createdAt": "2025-12-26T10:00:00.000Z",
    "orders": []
  }
}
```

---

### 6. Cập nhật User (Update User)

**URL:** `http://localhost:5000/api/users/1`
**Method:** `PUT`
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Admin Shop Updated",
  "email": "newemail@shop.com"
}
```

Hoặc đổi password:
```json
{
  "password": "NewPassword@456"
}
```

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "newemail@shop.com",
    "name": "Admin Shop Updated",
    "role": "admin",
    "createdAt": "2025-12-26T10:00:00.000Z"
  }
}
```

---

### 7. Xóa User (Delete User)

**URL:** `http://localhost:5000/api/users/2`
**Method:** `DELETE`
**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đã xóa người dùng thành công!"
}
```

---

## 🔒 Error Responses

### Không có token
**Status:** 401 Unauthorized
```json
{
  "error": "Token không được cung cấp!"
}
```

### Token không hợp lệ
**Status:** 403 Forbidden
```json
{
  "error": "Token không hợp lệ hoặc đã hết hạn!"
}
```

### Email đã tồn tại
**Status:** 400 Bad Request
```json
{
  "error": "Email đã được sử dụng!"
}
```

### Sai email/password
**Status:** 401 Unauthorized
```json
{
  "error": "Email hoặc password không đúng!"
}
```

### Không tìm thấy user
**Status:** 404 Not Found
```json
{
  "error": "Không tìm thấy người dùng!"
}
```

---

## 🎯 Tips khi test với Postman

### Sử dụng Environment Variables
1. Tạo Environment mới: Click vào icon **⚙️** góc trên bên phải
2. Tạo biến:
   - `base_url`: `http://localhost:5000`
   - `token`: (để trống, sẽ set sau khi login)

3. Sử dụng trong request:
   - URL: `{{base_url}}/api/users/login`
   - Header: `Bearer {{token}}`

### Auto-save Token sau khi Login
Vào tab **Tests** của request Login, thêm script:
```javascript
var response = pm.response.json();
if (response.success && response.data.token) {
    pm.environment.set("token", response.data.token);
}
```

Bây giờ token sẽ tự động lưu vào environment sau mỗi lần login!

---

## 🚀 Test Flow hoàn chỉnh

1. **Đăng ký Admin** → Lưu token
2. **Đăng ký Customer** → Tạo thêm vài users
3. **Login với Admin** → Lấy token mới
4. **Xem Profile** → Kiểm tra thông tin
5. **Lấy danh sách Users** → Xem tất cả users
6. **Update User** → Đổi tên hoặc email
7. **Delete User** → Xóa user test

---

## ⚠️ Lưu ý Bảo mật

- **KHÔNG BAO GIỜ** commit file `.env` lên GitHub
- Token có thời hạn 7 ngày, sau đó phải login lại
- Luôn dùng HTTPS khi deploy production
- Đổi `JWT_SECRET` trong `.env` thành chuỗi phức tạp hơn khi deploy

---
---

# API Categories

## 📌 API Endpoints

### 1. Lấy tất cả Categories (Get All Categories)

**URL:** `http://localhost:5000/api/categories?page=1&limit=10`
**Method:** `GET`
**Authentication:** Không cần (Public)

**Query Parameters:**
- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số lượng categories mỗi trang (mặc định: 20)

**Response thành công (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Áo lót ren",
      "slug": "ao-lot-ren",
      "image": "https://example.com/ao-lot-ren.jpg",
      "createdAt": "2025-12-27T10:00:00.000Z",
      "_count": {
        "products": 15
      }
    },
    {
      "id": 2,
      "name": "Quần lót",
      "slug": "quan-lot",
      "image": "https://example.com/quan-lot.jpg",
      "createdAt": "2025-12-27T10:05:00.000Z",
      "_count": {
        "products": 23
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

---

### 2. Lấy Category theo ID (Get Category by ID)

**URL:** `http://localhost:5000/api/categories/1`
**Method:** `GET`
**Authentication:** Không cần (Public)

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Áo lót ren",
    "slug": "ao-lot-ren",
    "image": "https://example.com/ao-lot-ren.jpg",
    "createdAt": "2025-12-27T10:00:00.000Z",
    "products": [
      {
        "id": 1,
        "name": "Áo lót ren cao cấp",
        "slug": "ao-lot-ren-cao-cap",
        "price": 299000,
        "salePrice": 249000,
        "isFeatured": true,
        "isVisible": true
      }
    ],
    "_count": {
      "products": 15
    }
  }
}
```

**Response lỗi (404):**
```json
{
  "error": "Không tìm thấy danh mục!"
}
```

---

### 3. Lấy Category theo Slug (Get Category by Slug)

**URL:** `http://localhost:5000/api/categories/slug/ao-lot-ren`
**Method:** `GET`
**Authentication:** Không cần (Public)

**💡 Use Case:** Endpoint này dùng cho Frontend khi hiển thị trang danh mục với URL đẹp (SEO-friendly)

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Áo lót ren",
    "slug": "ao-lot-ren",
    "image": "https://example.com/ao-lot-ren.jpg",
    "createdAt": "2025-12-27T10:00:00.000Z",
    "products": [
      {
        "id": 1,
        "name": "Áo lót ren cao cấp",
        "slug": "ao-lot-ren-cao-cap",
        "price": 299000,
        "salePrice": 249000,
        "isFeatured": true,
        "images": [
          {
            "url": "https://example.com/product1.jpg"
          }
        ]
      }
    ],
    "_count": {
      "products": 15
    }
  }
}
```

**Response lỗi (404):**
```json
{
  "error": "Không tìm thấy danh mục!"
}
```

---

### 4. Tạo Category mới (Create Category) 🔒

**URL:** `http://localhost:5000/api/categories`
**Method:** `POST`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Đồ ngủ",
  "slug": "do-ngu",
  "image": "https://example.com/do-ngu.jpg"
}
```

**💡 Lưu ý:**
- `name` và `slug` là bắt buộc
- `image` là optional
- `slug` phải là unique (không trùng lặp)

**Response thành công (201):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Đồ ngủ",
    "slug": "do-ngu",
    "image": "https://example.com/do-ngu.jpg",
    "createdAt": "2025-12-27T10:15:00.000Z"
  }
}
```

**Response lỗi - Thiếu field bắt buộc (400):**
```json
{
  "error": "Tên và slug là bắt buộc!"
}
```

**Response lỗi - Slug đã tồn tại (400):**
```json
{
  "error": "Slug đã được sử dụng!"
}
```

**Response lỗi - Không phải Admin (403):**
```json
{
  "error": "Chỉ admin mới có quyền truy cập!"
}
```

---

### 5. Cập nhật Category (Update Category) 🔒

**URL:** `http://localhost:5000/api/categories/1`
**Method:** `PUT`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Áo lót ren cao cấp",
  "slug": "ao-lot-ren-cao-cap",
  "image": "https://example.com/new-image.jpg"
}
```

**💡 Lưu ý:**
- Có thể update một hoặc nhiều field
- Slug mới không được trùng với category khác

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Áo lót ren cao cấp",
    "slug": "ao-lot-ren-cao-cap",
    "image": "https://example.com/new-image.jpg",
    "createdAt": "2025-12-27T10:00:00.000Z"
  }
}
```

**Response lỗi - Category không tồn tại (404):**
```json
{
  "error": "Không tìm thấy danh mục!"
}
```

**Response lỗi - Slug đã được dùng (400):**
```json
{
  "error": "Slug đã được sử dụng!"
}
```

---

### 6. Xóa Category (Delete Category) 🔒

**URL:** `http://localhost:5000/api/categories/1`
**Method:** `DELETE`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**💡 Lưu ý:**
- Chỉ xóa được category KHÔNG CÓ sản phẩm
- Nếu có sản phẩm, phải xóa/chuyển sản phẩm trước

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đã xóa danh mục thành công!"
}
```

**Response lỗi - Category có sản phẩm (400):**
```json
{
  "error": "Không thể xóa danh mục vì còn 15 sản phẩm!"
}
```

**Response lỗi - Category không tồn tại (404):**
```json
{
  "error": "Không tìm thấy danh mục!"
}
```

---

## 🚀 Test Flow cho Categories

### Flow 1: Test các Public APIs (Không cần token)
1. **GET All Categories** → Xem danh sách rỗng hoặc có sẵn
2. **GET Category by ID** → Test với ID = 1
3. **GET Category by Slug** → Test với slug

### Flow 2: Test Admin APIs (Cần login Admin trước)
1. **Login Admin** → Lấy token (xem phần API User)
2. **POST Create Category** → Tạo "Áo lót ren"
   ```json
   {
     "name": "Áo lót ren",
     "slug": "ao-lot-ren",
     "image": "https://example.com/image.jpg"
   }
   ```
3. **POST Create Category** → Tạo "Quần lót"
   ```json
   {
     "name": "Quần lót",
     "slug": "quan-lot",
     "image": null
   }
   ```
4. **GET All Categories** → Xem danh sách vừa tạo
5. **PUT Update Category** → Đổi tên hoặc ảnh
6. **DELETE Category** → Xóa category không có sản phẩm

### Flow 3: Test Error Cases
1. **Tạo category trùng slug** → Expect 400 error
2. **Tạo category thiếu name/slug** → Expect 400 error
3. **Update/Delete không có token** → Expect 401 error
4. **Update/Delete với customer token** → Expect 403 error
5. **Xóa category có sản phẩm** → Expect 400 error (test sau khi có Product API)

---

## 📝 Collection Postman Gợi ý

Tạo Collection với cấu trúc:
```
My Lingerie Shop API
├── 📁 Auth
│   ├── Register Admin
│   ├── Register Customer
│   └── Login
├── 📁 Users
│   ├── Get Profile
│   ├── Get All Users
│   └── ...
└── 📁 Categories
    ├── 📂 Public
    │   ├── Get All Categories
    │   ├── Get Category by ID
    │   └── Get Category by Slug
    └── 📂 Admin Only
        ├── Create Category
        ├── Update Category
        └── Delete Category
```

---

## 💡 Tips

### 1. Tạo slug từ name trong JavaScript
```javascript
function createSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Ví dụ:
createSlug("Áo lót ren"); // "ao-lot-ren"
createSlug("Đồ ngủ sexy"); // "do-ngu-sexy"
```

### 2. Auto-generate slug trong Postman Pre-request Script
Vào tab **Pre-request Script** của request Create Category:
```javascript
var name = pm.request.body.raw ? JSON.parse(pm.request.body.raw).name : "";
if (name) {
    var slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    var body = JSON.parse(pm.request.body.raw);
    body.slug = slug;
    pm.request.body.raw = JSON.stringify(body, null, 2);
}
```

Bây giờ chỉ cần nhập `name`, slug sẽ tự động tạo!

---
---

# API Products

## 📌 API Endpoints - Product CRUD

### 1. Lấy tất cả Products (Get All Products)

**URL:** `http://localhost:5000/api/products?page=1&limit=10`
**Method:** `GET`
**Authentication:** Không cần (Public)

**Query Parameters:**
- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số lượng products mỗi trang (mặc định: 20)
- `categoryId`: Lọc theo danh mục (ví dụ: `?categoryId=1`)
- `isFeatured`: Lọc sản phẩm nổi bật (`?isFeatured=true`)
- `minPrice`: Giá tối thiểu (ví dụ: `?minPrice=100000`)
- `maxPrice`: Giá tối đa (ví dụ: `?maxPrice=500000`)
- `search`: Tìm kiếm theo tên hoặc mô tả (ví dụ: `?search=áo lót`)

**Ví dụ các URL:**
```
# Tất cả sản phẩm
http://localhost:5000/api/products

# Sản phẩm nổi bật
http://localhost:5000/api/products?isFeatured=true

# Sản phẩm trong khoảng giá 200k-500k
http://localhost:5000/api/products?minPrice=200000&maxPrice=500000

# Sản phẩm thuộc category ID = 1
http://localhost:5000/api/products?categoryId=1

# Tìm kiếm sản phẩm
http://localhost:5000/api/products?search=ren
```

**Response thành công (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Áo lót ren cao cấp",
      "slug": "ao-lot-ren-cao-cap",
      "description": "Áo lót ren đẹp, chất liệu mềm mại",
      "price": 299000,
      "salePrice": 249000,
      "categoryId": 1,
      "isFeatured": true,
      "isVisible": true,
      "createdAt": "2025-12-27T10:00:00.000Z",
      "category": {
        "id": 1,
        "name": "Áo lót ren",
        "slug": "ao-lot-ren"
      },
      "images": [
        {
          "url": "https://example.com/product1.jpg"
        }
      ],
      "variants": [
        {
          "id": 1,
          "size": "M",
          "color": "Đỏ",
          "stock": 10
        },
        {
          "id": 2,
          "size": "L",
          "color": "Đen",
          "stock": 15
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

---

### 2. Lấy Product theo ID (Get Product by ID)

**URL:** `http://localhost:5000/api/products/1`
**Method:** `GET`
**Authentication:** Không cần (Public)

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Áo lót ren cao cấp",
    "slug": "ao-lot-ren-cao-cap",
    "description": "Áo lót ren đẹp, chất liệu mềm mại",
    "price": 299000,
    "salePrice": 249000,
    "categoryId": 1,
    "isFeatured": true,
    "isVisible": true,
    "createdAt": "2025-12-27T10:00:00.000Z",
    "category": {
      "id": 1,
      "name": "Áo lót ren",
      "slug": "ao-lot-ren"
    },
    "images": [
      {
        "id": 1,
        "url": "https://example.com/product1.jpg",
        "productId": 1
      },
      {
        "id": 2,
        "url": "https://example.com/product2.jpg",
        "productId": 1
      }
    ],
    "variants": [
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
      }
    ]
  }
}
```

---

### 3. Lấy Product theo Slug (Get Product by Slug)

**URL:** `http://localhost:5000/api/products/slug/ao-lot-ren-cao-cap`
**Method:** `GET`
**Authentication:** Không cần (Public)

**💡 Use Case:** Endpoint này dùng cho Frontend khi hiển thị trang chi tiết sản phẩm với URL đẹp (SEO-friendly)

**Response:** Giống như Get by ID

---

### 4. Tạo Product mới (Create Product) 🔒

**URL:** `http://localhost:5000/api/products`
**Method:** `POST`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON) - Cơ bản:**
```json
{
  "name": "Áo lót ren cao cấp",
  "slug": "ao-lot-ren-cao-cap",
  "description": "Áo lót ren đẹp, chất liệu mềm mại, thiết kế sang trọng",
  "price": 299000,
  "salePrice": 249000,
  "categoryId": 1,
  "isFeatured": true,
  "isVisible": true
}
```

**Body (raw JSON) - Tạo kèm Images và Variants:**
```json
{
  "name": "Áo lót ren cao cấp",
  "slug": "ao-lot-ren-cao-cap",
  "description": "Áo lót ren đẹp, chất liệu mềm mại",
  "price": 299000,
  "salePrice": 249000,
  "categoryId": 1,
  "isFeatured": true,
  "isVisible": true,
  "images": [
    "https://example.com/product1.jpg",
    "https://example.com/product2.jpg",
    "https://example.com/product3.jpg"
  ],
  "variants": [
    {
      "size": "M",
      "color": "Đỏ",
      "stock": 10
    },
    {
      "size": "L",
      "color": "Đen",
      "stock": 15
    },
    {
      "size": "M",
      "color": "Trắng",
      "stock": 8
    }
  ]
}
```

**💡 Lưu ý:**
- `name`, `slug`, `price`, `categoryId` là bắt buộc
- `salePrice` là optional (giá khuyến mãi)
- `images` và `variants` là optional, có thể thêm sau
- `categoryId` phải là ID của category đã tồn tại

**Response thành công (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Áo lót ren cao cấp",
    "slug": "ao-lot-ren-cao-cap",
    "description": "Áo lót ren đẹp, chất liệu mềm mại",
    "price": 299000,
    "salePrice": 249000,
    "categoryId": 1,
    "isFeatured": true,
    "isVisible": true,
    "createdAt": "2025-12-27T10:00:00.000Z",
    "category": {
      "id": 1,
      "name": "Áo lót ren",
      "slug": "ao-lot-ren",
      "image": null,
      "createdAt": "2025-12-27T09:00:00.000Z"
    },
    "images": [
      {
        "id": 1,
        "url": "https://example.com/product1.jpg",
        "productId": 1
      },
      {
        "id": 2,
        "url": "https://example.com/product2.jpg",
        "productId": 1
      }
    ],
    "variants": [
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
      }
    ]
  }
}
```

**Response lỗi - Thiếu field bắt buộc (400):**
```json
{
  "error": "Tên, slug, giá và categoryId là bắt buộc!"
}
```

**Response lỗi - Slug đã tồn tại (400):**
```json
{
  "error": "Slug đã được sử dụng!"
}
```

**Response lỗi - Category không tồn tại (404):**
```json
{
  "error": "Không tìm thấy danh mục!"
}
```

---

### 5. Cập nhật Product (Update Product) 🔒

**URL:** `http://localhost:5000/api/products/1`
**Method:** `PUT`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Áo lót ren cao cấp VIP",
  "price": 350000,
  "salePrice": 299000,
  "isFeatured": true,
  "isVisible": true
}
```

**💡 Lưu ý:**
- Có thể update một hoặc nhiều field
- Không thể update `images` và `variants` qua endpoint này (dùng endpoints riêng)

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Áo lót ren cao cấp VIP",
    "slug": "ao-lot-ren-cao-cap",
    "description": "Áo lót ren đẹp, chất liệu mềm mại",
    "price": 350000,
    "salePrice": 299000,
    "categoryId": 1,
    "isFeatured": true,
    "isVisible": true,
    "createdAt": "2025-12-27T10:00:00.000Z",
    "category": { ... },
    "images": [ ... ],
    "variants": [ ... ]
  }
}
```

---

### 6. Xóa Product (Delete Product) 🔒

**URL:** `http://localhost:5000/api/products/1`
**Method:** `DELETE`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**💡 Lưu ý:**
- Images và Variants sẽ tự động bị xóa theo (Cascade Delete)

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đã xóa sản phẩm thành công!"
}
```

---

## 📌 API Endpoints - Product Images

### 7. Thêm Images vào Product 🔒

**URL:** `http://localhost:5000/api/products/1/images`
**Method:** `POST`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "images": [
    "https://example.com/product4.jpg",
    "https://example.com/product5.jpg"
  ]
}
```

**Response thành công (201):**
```json
{
  "success": true,
  "message": "Đã thêm 2 ảnh thành công!"
}
```

---

### 8. Xóa Image của Product 🔒

**URL:** `http://localhost:5000/api/products/images/5`
**Method:** `DELETE`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**💡 Lưu ý:** URL parameter `5` là `imageId`, không phải `productId`

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đã xóa ảnh thành công!"
}
```

---

## 📌 API Endpoints - Product Variants

### 9. Thêm Variants vào Product 🔒

**URL:** `http://localhost:5000/api/products/1/variants`
**Method:** `POST`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "variants": [
    {
      "size": "XL",
      "color": "Hồng",
      "stock": 20
    },
    {
      "size": "S",
      "color": "Xanh",
      "stock": 5
    }
  ]
}
```

**Response thành công (201):**
```json
{
  "success": true,
  "message": "Đã thêm 2 biến thể thành công!"
}
```

---

### 10. Cập nhật Variant 🔒

**URL:** `http://localhost:5000/api/products/variants/3`
**Method:** `PUT`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "stock": 25
}
```

Hoặc update nhiều field:
```json
{
  "size": "XL",
  "color": "Hồng pastel",
  "stock": 30
}
```

**💡 Lưu ý:** URL parameter `3` là `variantId`

**Response thành công (200):**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "size": "XL",
    "color": "Hồng pastel",
    "stock": 30,
    "productId": 1
  }
}
```

---

### 11. Xóa Variant 🔒

**URL:** `http://localhost:5000/api/products/variants/3`
**Method:** `DELETE`
**Authentication:** Cần Admin token

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response thành công (200):**
```json
{
  "success": true,
  "message": "Đã xóa biến thể thành công!"
}
```

---

## 🚀 Test Flow cho Products

### Flow 1: Test các Public APIs (Không cần token)

1. **GET All Products** → Xem danh sách (có thể rỗng)
2. **GET Products với filter** → Test với `?categoryId=1`, `?isFeatured=true`, `?search=ren`
3. **GET Product by ID** → Test với ID = 1
4. **GET Product by Slug** → Test với slug

### Flow 2: Tạo Product hoàn chỉnh (Cần Admin token)

**Bước 1: Login Admin và tạo Category**
```
1. POST /api/users/login → Lấy admin token
2. POST /api/categories → Tạo category "Áo lót ren" (lưu categoryId)
```

**Bước 2: Tạo Product cơ bản**
```json
POST /api/products
{
  "name": "Áo lót ren cao cấp",
  "slug": "ao-lot-ren-cao-cap",
  "description": "Áo lót ren đẹp",
  "price": 299000,
  "salePrice": 249000,
  "categoryId": 1,
  "isFeatured": true
}
```

**Bước 3: Thêm Images**
```json
POST /api/products/1/images
{
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ]
}
```

**Bước 4: Thêm Variants**
```json
POST /api/products/1/variants
{
  "variants": [
    { "size": "M", "color": "Đỏ", "stock": 10 },
    { "size": "L", "color": "Đen", "stock": 15 }
  ]
}
```

**Bước 5: Xem Product đầy đủ**
```
GET /api/products/1
```

### Flow 3: Tạo Product với Images và Variants luôn (Nhanh hơn)

```json
POST /api/products
{
  "name": "Quần lót sexy",
  "slug": "quan-lot-sexy",
  "description": "Quần lót gợi cảm",
  "price": 199000,
  "categoryId": 1,
  "images": [
    "https://example.com/img1.jpg",
    "https://example.com/img2.jpg"
  ],
  "variants": [
    { "size": "M", "color": "Đỏ", "stock": 10 },
    { "size": "L", "color": "Đen", "stock": 15 }
  ]
}
```

### Flow 4: Test Update và Delete

1. **PUT Product** → Update giá, tên, featured status
2. **PUT Variant** → Update stock của variant
3. **DELETE Image** → Xóa 1 ảnh
4. **DELETE Variant** → Xóa 1 variant
5. **DELETE Product** → Xóa toàn bộ product

### Flow 5: Test Error Cases

1. **Tạo product thiếu field** → Expect 400
2. **Tạo product với slug trùng** → Expect 400
3. **Tạo product với categoryId không tồn tại** → Expect 404
4. **Update product không tồn tại** → Expect 404
5. **Xóa image không tồn tại** → Expect 404

---

## 📝 Collection Postman Gợi ý

```
My Lingerie Shop API
├── 📁 Auth
│   ├── Register Admin
│   ├── Register Customer
│   └── Login
├── 📁 Users
│   └── ...
├── 📁 Categories
│   └── ...
└── 📁 Products
    ├── 📂 Public
    │   ├── Get All Products
    │   ├── Get All (with filters)
    │   ├── Get Product by ID
    │   └── Get Product by Slug
    ├── 📂 Admin - Product CRUD
    │   ├── Create Product (Basic)
    │   ├── Create Product (Full)
    │   ├── Update Product
    │   └── Delete Product
    ├── 📂 Admin - Images
    │   ├── Add Images
    │   └── Delete Image
    └── 📂 Admin - Variants
        ├── Add Variants
        ├── Update Variant
        └── Delete Variant
```

---

## 💡 Tips

### 1. Test "Xóa Category có sản phẩm" (Error 400)

Bây giờ bạn có thể test case này:

```
1. POST /api/categories → Tạo category (lưu ID)
2. POST /api/products → Tạo product với categoryId = ID trên
3. DELETE /api/categories/{ID} → Expect error 400
```

Response:
```json
{
  "error": "Không thể xóa danh mục vì còn 1 sản phẩm!"
}
```

### 2. Test filter Products

```
# Sản phẩm nổi bật
GET /api/products?isFeatured=true

# Sản phẩm trong khoảng giá
GET /api/products?minPrice=200000&maxPrice=500000

# Tìm kiếm
GET /api/products?search=ren

# Kết hợp nhiều filter
GET /api/products?categoryId=1&isFeatured=true&minPrice=200000
```

### 3. Update stock nhanh

Khi có đơn hàng, update stock của variant:
```json
PUT /api/products/variants/1
{
  "stock": 5
}
```


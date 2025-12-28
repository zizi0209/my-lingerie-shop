# Hướng dẫn Test API PageSection trên Postman

## 1. Base URL
```
http://localhost:5000/api/page-sections
```

---

## 2. Các Endpoint

### A. GET - Lấy tất cả page sections
**URL:** `GET http://localhost:5000/api/page-sections`

**Params (Optional):**
- `includeHidden=false` - Chỉ lấy section đang hiển thị (mặc định)
- `includeHidden=true` - Lấy tất cả section (có và không hiển thị)

**Example:**
```
GET http://localhost:5000/api/page-sections?includeHidden=false
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "HERO",
      "name": "Hero Section",
      "isVisible": true,
      "order": 0,
      "content": {
        "title": "Welcome to Lingerie Shop",
        "subtitle": "Premium Quality Products",
        "bannerUrl": "https://...",
        "buttonText": "Shop Now",
        "buttonLink": "/products"
      }
    },
    {
      "id": 2,
      "code": "FEATURED",
      "name": "Featured Products",
      "isVisible": true,
      "order": 1,
      "content": null
    }
  ]
}
```

---

### B. GET - Lấy page section theo ID
**URL:** `GET http://localhost:5000/api/page-sections/:id`

**Example:**
```
GET http://localhost:5000/api/page-sections/1
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "HERO",
    "name": "Hero Section",
    "isVisible": true,
    "order": 0,
    "content": {
      "title": "Welcome to Lingerie Shop",
      "subtitle": "Premium Quality Products",
      "bannerUrl": "https://...",
      "buttonText": "Shop Now"
    }
  }
}
```

**Response (404):**
```json
{
  "error": "Không tìm thấy section!"
}
```

---

### C. GET - Lấy page section theo CODE
**URL:** `GET http://localhost:5000/api/page-sections/code/:code`

**Example:**
```
GET http://localhost:5000/api/page-sections/code/HERO
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "HERO",
    "name": "Hero Section",
    "isVisible": true,
    "order": 0,
    "content": {
      "title": "Welcome to Lingerie Shop"
    }
  }
}
```

---

### D. POST - Tạo page section mới (Admin Only)
**URL:** `POST http://localhost:5000/api/page-sections`

**Headers:**
```
Authorization: Bearer <YOUR_ADMIN_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "code": "HERO",
  "name": "Hero Section",
  "isVisible": true,
  "order": 0,
  "content": {
    "title": "Welcome to Lingerie Shop",
    "subtitle": "Premium Quality Products",
    "bannerUrl": "https://example.com/banner.jpg",
    "buttonText": "Shop Now",
    "buttonLink": "/products"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "HERO",
    "name": "Hero Section",
    "isVisible": true,
    "order": 0,
    "content": {
      "title": "Welcome to Lingerie Shop",
      "subtitle": "Premium Quality Products",
      "bannerUrl": "https://example.com/banner.jpg",
      "buttonText": "Shop Now",
      "buttonLink": "/products"
    }
  }
}
```

**Response (400 - Validation Error):**
```json
{
  "error": "Code và name là bắt buộc!"
}
```

**Response (400 - Code Already Exists):**
```json
{
  "error": "Code đã được sử dụng!"
}
```

---

### E. PUT - Cập nhật page section (Admin Only)
**URL:** `PUT http://localhost:5000/api/page-sections/:id`

**Headers:**
```
Authorization: Bearer <YOUR_ADMIN_TOKEN>
Content-Type: application/json
```

**Body (Cập nhật một phần):**
```json
{
  "name": "Updated Hero Section",
  "isVisible": true,
  "order": 1,
  "content": {
    "title": "Updated Title",
    "subtitle": "Updated Subtitle",
    "bannerUrl": "https://example.com/new-banner.jpg"
  }
}
```

**Example:**
```
PUT http://localhost:5000/api/page-sections/1
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "HERO",
    "name": "Updated Hero Section",
    "isVisible": true,
    "order": 1,
    "content": {
      "title": "Updated Title",
      "subtitle": "Updated Subtitle",
      "bannerUrl": "https://example.com/new-banner.jpg"
    }
  }
}
```

**Response (404):**
```json
{
  "error": "Không tìm thấy section!"
}
```

---

### F. DELETE - Xóa page section (Admin Only)
**URL:** `DELETE http://localhost:5000/api/page-sections/:id`

**Headers:**
```
Authorization: Bearer <YOUR_ADMIN_TOKEN>
```

**Example:**
```
DELETE http://localhost:5000/api/page-sections/1
```

**Response (200):**
```json
{
  "success": true,
  "message": "Đã xóa section thành công!"
}
```

**Response (404):**
```json
{
  "error": "Không tìm thấy section!"
}
```

---

## 3. Cách Lấy Admin Token

1. Đăng nhập với tài khoản Admin:
   ```
   POST http://localhost:5000/api/users/login
   ```
   
   Body:
   ```json
   {
     "email": "admin@example.com",
     "password": "admin_password"
   }
   ```

2. Copy token từ response:
   ```json
   {
     "success": true,
     "data": {
       "id": 1,
       "email": "admin@example.com",
       "name": "Admin User",
       "role": "admin",
       "token": "eyJhbGciOiJIUzI1NiIs..."
     }
   }
   ```

3. Paste token vào header `Authorization: Bearer <token>`

---

## 4. Ví dụ Test Cases

### Test Case 1: Tạo HERO Section
```
POST http://localhost:5000/api/page-sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "HERO",
  "name": "Hero Banner",
  "order": 0,
  "isVisible": true,
  "content": {
    "title": "Khám phá bộ sưu tập mới",
    "subtitle": "Chất lượng premium, giá cạnh tranh",
    "bannerUrl": "https://cloudinary.com/...",
    "buttonText": "Mua ngay",
    "buttonLink": "/products"
  }
}
```

### Test Case 2: Tạo FEATURED Section
```
POST http://localhost:5000/api/page-sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "FEATURED",
  "name": "Sản phẩm nổi bật",
  "order": 1,
  "isVisible": true,
  "content": {
    "title": "Sản phẩm bán chạy",
    "limit": 8
  }
}
```

### Test Case 3: Tạo TESTIMONIALS Section
```
POST http://localhost:5000/api/page-sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "TESTIMONIALS",
  "name": "Đánh giá khách hàng",
  "order": 2,
  "isVisible": true,
  "content": {
    "title": "Khách hàng yêu thích chúng tôi",
    "showRating": true,
    "limit": 5
  }
}
```

### Test Case 4: Tạo NEWSLETTER Section
```
POST http://localhost:5000/api/page-sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "NEWSLETTER",
  "name": "Đăng ký newsletter",
  "order": 3,
  "isVisible": true,
  "content": {
    "title": "Nhận ưu đãi độc quyền",
    "description": "Đăng ký để nhận thông tin sản phẩm mới và khuyến mãi",
    "buttonText": "Đăng ký"
  }
}
```

---

## 5. Lưu ý quan trọng

### Về content (JSON Object)
- Field `content` có thể chứa bất kỳ dữ liệu JSON nào
- Không có định dạng cố định, tùy theo nhu cầu từng section
- Nếu không cần content, có thể để null

### Về authentication
- **Public endpoints**: Không cần token
  - `GET /` - Lấy tất cả section
  - `GET /:id` - Lấy chi tiết
  - `GET /code/:code` - Lấy theo code

- **Protected endpoints**: Cần token admin
  - `POST /` - Tạo section
  - `PUT /:id` - Cập nhật section
  - `DELETE /:id` - Xóa section

### Về order
- Dùng để sắp xếp thứ tự hiển thị sections trên trang
- Sections được sắp xếp tăng dần theo order
- Nên bắt đầu từ 0, 1, 2, 3...

### Về code
- Code phải là duy nhất (unique)
- Nên dùng UPPERCASE (VD: HERO, FEATURED, TESTIMONIALS)
- Dùng để query section một cách dễ dàng

---

## 6. Kiểm tra TypeScript

Chạy lệnh sau để kiểm tra lỗi TypeScript:
```bash
bunx tsc --project backend/tsconfig.json --noEmit
```

Nếu không có lỗi, output sẽ trống.

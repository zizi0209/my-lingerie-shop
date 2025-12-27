# Hướng dẫn Test API User trên Postman

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

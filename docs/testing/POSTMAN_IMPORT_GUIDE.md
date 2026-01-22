# Hướng Dẫn Import Postman Collection

## 📦 Files Cần Import

Trong thư mục gốc của project, bạn sẽ tìm thấy 2 files:

1. **`Lingerie_Shop_API.postman_collection.json`** - Collection chứa tất cả API endpoints (60+ requests)
2. **`Lingerie_Shop_Environment.postman_environment.json`** - Environment variables cho môi trường local

---

## 🚀 Bước 1: Import Collection

### Cách 1: Import từ File
1. Mở **Postman**
2. Click nút **Import** ở góc trên bên trái
3. Kéo thả file `Lingerie_Shop_API.postman_collection.json` vào cửa sổ import
   
   **HOẶC**
   
   Click **Upload Files** → Chọn file `Lingerie_Shop_API.postman_collection.json`
4. Click **Import**
5. Collection sẽ xuất hiện trong sidebar bên trái với tên **"Lingerie Shop API - Comprehensive"**

### Cách 2: Import bằng URL (nếu file trên Git)
1. Click **Import** → **Link**
2. Paste URL của file JSON
3. Click **Continue** → **Import**

---

## 🌍 Bước 2: Import Environment

1. Click icon **⚙️ (Settings)** ở góc trên bên phải
2. Chọn **Environments** tab
3. Click **Import** 
4. Chọn file `Lingerie_Shop_Environment.postman_environment.json`
5. Click **Import**
6. Environment **"Lingerie Shop - Local"** sẽ xuất hiện trong danh sách

---

## ⚙️ Bước 3: Activate Environment

1. Ở góc trên bên phải, click dropdown **"No Environment"**
2. Chọn **"Lingerie Shop - Local"**
3. Kiểm tra biến `base_url` = `http://localhost:3000/api` (click icon con mắt 👁️ để xem)

---

## 📋 Cấu Trúc Collection

Collection được tổ chức thành 11 folders chính:

```
📁 Lingerie Shop API - Comprehensive
│
├── 📂 1. Roles & Permissions
│   ├── 📂 Permissions (5 requests)
│   └── 📂 Roles (5 requests)
│
├── 📂 2. Users (6 requests)
│   ├── Register User
│   ├── Login
│   ├── Get All Users
│   └── ...
│
├── 📂 3. Categories (6 requests)
│
├── 📂 4. Products
│   ├── 📂 Products (6 requests)
│   ├── 📂 Product Images (2 requests)
│   └── 📂 Product Variants (4 requests)
│
├── 📂 5. Post Categories (6 requests)
│
├── 📂 6. Posts (6 requests)
│
├── 📂 7. Cart (6 requests)
│
├── 📂 8. Orders (5 requests)
│
├── 📂 9. Page Sections (6 requests)
│
├── 📂 10. Tracking & Analytics
│   ├── 📂 Page Views (2 requests)
│   ├── 📂 Product Views (2 requests)
│   └── 📂 Cart Events (4 requests)
│
├── 📂 11. Media (4 requests)
│
└── 🏥 Health Check (1 request)
```

**Tổng cộng: 65+ API Requests**

---

## 🔥 Bước 4: Test Collection

### 1. Khởi động Server
```bash
cd backend
npm run dev
```

Server sẽ chạy tại: `http://localhost:3000`

### 2. Test Health Check
1. Trong collection, click request **"Health Check"**
2. Click **Send**
3. Bạn sẽ nhận được response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

✅ Nếu thấy response này → Server đang hoạt động!

---

## 🎯 Quy Trình Test Khuyến Nghị

### Phase 1: Setup System (Roles & Users)
```
1. Roles & Permissions
   → Create Permission (products.create, products.edit, orders.view...)
   → Create Role (admin) với permissions

2. Users
   → Register User với roleId
   → Login → Lưu token vào environment
```

### Phase 2: Core Entities
```
3. Categories
   → Create Category (Áo lót, Quần lót...)
   → Get All Categories

4. Products
   → Create Product
   → Add Product Images
   → Create Product Variants
   → Get Product by Slug
```

### Phase 3: Content Management
```
5. Post Categories
   → Create Post Category (Tin tức, Hướng dẫn...)

6. Posts
   → Create Post
   → Get Post by Slug (auto increment views)
```

### Phase 4: E-commerce Flow
```
7. Cart
   → Get Cart (by userId or sessionId)
   → Add Item to Cart
   → Update Cart Item Quantity

8. Orders
   → Create Order
   → Update Order Status
```

### Phase 5: CMS & Analytics
```
9. Page Sections
   → Create Page Section (HERO, FEATURED...)

10. Tracking
    → Track Page View
    → Track Product View
    → Track Cart Events
    → Get Analytics
```

---

## 💡 Tips Sử Dụng Environment Variables

### Lưu Values Động

Sau khi Login thành công, lưu token:

**Response từ Login:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, ... },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Scripts để tự động lưu:**

Vào tab **Tests** của request "Login", thêm:
```javascript
// Parse response
var jsonData = pm.response.json();

// Lưu token vào environment
if (jsonData.success && jsonData.data.token) {
    pm.environment.set("auth_token", jsonData.data.token);
    pm.environment.set("user_id", jsonData.data.user.id);
    console.log("✅ Token và User ID đã được lưu!");
}
```

### Sử Dụng Variables trong Requests

Trong URL hoặc Body, dùng cú pháp `{{variable_name}}`:

```
URL: {{base_url}}/users/{{user_id}}
```

```json
{
  "userId": {{user_id}},
  "sessionId": "{{session_id}}"
}
```

---

## 🔐 Authentication (Optional - Nếu có)

Nếu API yêu cầu authentication, thêm header vào requests:

1. Click vào Collection **"Lingerie Shop API"**
2. Tab **Authorization**
3. Chọn Type: **Bearer Token**
4. Token: `{{auth_token}}`
5. Click **Save**

→ Tất cả requests trong collection sẽ tự động thêm header:
```
Authorization: Bearer {{auth_token}}
```

---

## 🐛 Troubleshooting

### ❌ Error: "Could not get any response"
**Nguyên nhân:** Server chưa chạy hoặc sai URL

**Giải pháp:**
1. Kiểm tra server đang chạy: `npm run dev`
2. Kiểm tra `base_url` trong environment = `http://localhost:3000/api`
3. Thử Health Check request trước

---

### ❌ Error: "404 Not Found"
**Nguyên nhân:** Endpoint không tồn tại hoặc sai path

**Giải pháp:**
1. Check logs của server xem routes đã được mount chưa
2. Xem console log khi server start:
```
Server is running on port 3000
```

---

### ❌ Error: "500 Internal Server Error"
**Nguyên nhân:** Lỗi server-side (thường là database)

**Giải pháp:**
1. Kiểm tra database đã migrate: `npx prisma migrate reset`
2. Xem logs trong terminal server
3. Check file `.env` có đúng DATABASE_URL không

---

### ❌ Error: "422 Unprocessable Entity" hoặc "400 Bad Request"
**Nguyên nhân:** Thiếu hoặc sai required fields

**Giải pháp:**
1. Kiểm tra request body có đủ fields bắt buộc không
2. Đọc response error message (tiếng Việt) để biết field nào thiếu
3. So sánh với ví dụ trong file `POSTMAN_COMPREHENSIVE_TESTING.md`

---

## 📚 Tài Liệu Bổ Sung

- **Chi tiết API:** Xem file `POSTMAN_COMPREHENSIVE_TESTING.md`
- **Schema Database:** Xem file `backend/prisma/schema.prisma`
- **Controllers:** Thư mục `backend/src/controllers/`

---

## 🎓 Video Hướng Dẫn (Nếu cần)

### Import Collection
1. Postman → Import → Upload file JSON → Done

### Test First Request
1. Select environment "Lingerie Shop - Local"
2. Open "Health Check" request
3. Click Send
4. See response ✅

---

## ✅ Checklist

- [ ] Import Collection thành công
- [ ] Import Environment thành công
- [ ] Select Environment "Lingerie Shop - Local"
- [ ] Server đang chạy (`npm run dev`)
- [ ] Database đã migrate (`npx prisma migrate reset`)
- [ ] Test Health Check → Response 200 OK
- [ ] Ready to test all endpoints! 🚀

---

**Happy Testing! 🎉**

Nếu gặp vấn đề, check lại file `POSTMAN_COMPREHENSIVE_TESTING.md` để xem chi tiết từng endpoint.

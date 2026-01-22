# Hướng dẫn API Orders

## 1. Schema Database

```prisma
model Order {
  id              Int         @id @default(autoincrement())
  orderNumber     String      @unique
  
  userId          Int?
  user            User?       @relation(fields: [userId], references: [id])
  guestInfo       Json?
  
  shippingAddress String
  shippingCity    String?
  shippingPhone   String
  shippingMethod  String?
  trackingNumber  String?
  
  paymentMethod   String      @default("COD")
  paymentStatus   String      @default("PENDING")
  paidAt          DateTime?
  
  totalAmount     Float
  shippingFee     Float       @default(0)
  discount        Float       @default(0)
  notes           String?     @db.Text
  
  status          String      @default("PENDING")
  items           OrderItem[]
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  cancelledAt     DateTime?
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Float
  variant   String?
}
```

## 2. API Endpoints

### 2.1. Create Order (Public - Không cần auth)
```http
POST /api/orders
Content-Type: application/json
```

**Request Body:**
```json
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
    },
    {
      "productId": 2,
      "quantity": 1,
      "price": 150000,
      "variant": "Size L - Màu Đen"
    }
  ]
}
```

**Hoặc cho Guest (không có userId):**
```json
{
  "guestInfo": {
    "name": "Nguyễn Văn A",
    "email": "guest@example.com",
    "phone": "0987654321"
  },
  "shippingAddress": "456 Đường XYZ, Quận 2",
  "shippingCity": "TP. Hồ Chí Minh",
  "shippingPhone": "0987654321",
  "totalAmount": 300000,
  "items": [
    {
      "productId": 1,
      "quantity": 1,
      "price": 300000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-0001",
    "userId": 1,
    "shippingAddress": "123 Đường ABC, Quận 1",
    "shippingCity": "TP. Hồ Chí Minh",
    "shippingPhone": "0123456789",
    "totalAmount": 500000,
    "shippingFee": 30000,
    "status": "PENDING",
    "items": [
      {
        "id": 1,
        "productId": 1,
        "quantity": 2,
        "price": 200000,
        "variant": "Size M - Màu Trắng",
        "product": {
          "id": 1,
          "name": "Áo lót ren trắng",
          "slug": "ao-lot-ren-trang"
        }
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Required Fields:**
- `shippingAddress`
- `shippingPhone`
- `totalAmount`
- `items` (array, ít nhất 1 item)

**Optional Fields:**
- `userId` (nếu là user đã đăng nhập)
- `guestInfo` (nếu là khách)
- `orderNumber` (auto generate nếu không có)
- `shippingCity`, `shippingMethod`, `notes`
- `paymentMethod` (default: "COD")
- `shippingFee` (default: 0)
- `discount` (default: 0)

---

### 2.2. Get All Orders (Protected)
```http
GET /api/orders?page=1&limit=20&status=PENDING&userId=1
Authorization: Bearer {token}
```

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20)
- `status` (optional: PENDING, CONFIRMED, SHIPPING, COMPLETED, CANCELLED)
- `userId` (optional: filter by user)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "orderNumber": "ORD-2024-0001",
      "status": "PENDING",
      "totalAmount": 500000,
      "user": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "items": [
        {
          "id": 1,
          "quantity": 2,
          "price": 200000,
          "product": {
            "id": 1,
            "name": "Áo lót ren trắng"
          }
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

---

### 2.3. Get Order by ID (Protected)
```http
GET /api/orders/:id
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-0001",
    "userId": 1,
    "shippingAddress": "123 Đường ABC, Quận 1",
    "shippingCity": "TP. Hồ Chí Minh",
    "shippingPhone": "0123456789",
    "shippingMethod": "Standard",
    "trackingNumber": null,
    "paymentMethod": "COD",
    "paymentStatus": "PENDING",
    "totalAmount": 500000,
    "shippingFee": 30000,
    "discount": 0,
    "notes": "Giao giờ hành chính",
    "status": "PENDING",
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@example.com",
      "phone": "0123456789"
    },
    "items": [
      {
        "id": 1,
        "productId": 1,
        "quantity": 2,
        "price": 200000,
        "variant": "Size M - Màu Trắng",
        "product": {
          "id": 1,
          "name": "Áo lót ren trắng",
          "slug": "ao-lot-ren-trang",
          "price": 250000
        }
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "cancelledAt": null
  }
}
```

---

### 2.4. Update Order (Protected)
```http
PUT /api/orders/:id
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body (các field optional):**
```json
{
  "status": "SHIPPING",
  "trackingNumber": "TRACK-123456",
  "paymentStatus": "PAID",
  "paidAt": "2024-01-02T00:00:00Z",
  "shippingMethod": "Express",
  "notes": "Cập nhật ghi chú mới"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-0001",
    "status": "SHIPPING",
    "trackingNumber": "TRACK-123456",
    "paymentStatus": "PAID",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}
```

---

### 2.5. Cancel Order (Protected)
```http
PUT /api/orders/:id/cancel
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã hủy đơn hàng thành công!",
  "data": {
    "id": 1,
    "orderNumber": "ORD-2024-0001",
    "status": "CANCELLED",
    "cancelledAt": "2024-01-02T00:00:00Z"
  }
}
```

**Lưu ý:** 
- Không thể hủy đơn hàng đã COMPLETED hoặc đang SHIPPING
- Đơn hàng đã CANCELLED không thể hủy lại

---

## 3. Order Status Flow

```
PENDING → CONFIRMED → SHIPPING → COMPLETED
   ↓
CANCELLED
```

**Order Status:**
- `PENDING`: Chờ xác nhận
- `CONFIRMED`: Đã xác nhận
- `SHIPPING`: Đang giao hàng
- `COMPLETED`: Hoàn thành
- `CANCELLED`: Đã hủy

**Payment Status:**
- `PENDING`: Chờ thanh toán
- `PAID`: Đã thanh toán
- `REFUNDED`: Đã hoàn tiền

---

## 4. Lỗi thường gặp

### ❌ Lỗi 404: "Cannot POST /api/orders"
**Nguyên nhân:** Server chưa được restart sau khi thêm order routes

**Giải pháp:**
```bash
cd backend
bun dev
```

### ❌ Lỗi 400: "Thiếu thông tin bắt buộc"
**Nguyên nhân:** Thiếu field bắt buộc

**Giải pháp:** Đảm bảo có đủ các field:
- `shippingAddress`
- `shippingPhone`
- `totalAmount`
- `items` (array không rỗng)

### ❌ Lỗi 404: "Không tìm thấy sản phẩm với ID: X"
**Nguyên nhân:** Product ID trong items không tồn tại

**Giải pháp:** Kiểm tra product ID có đúng không

### ❌ Lỗi 400: "Mã đơn hàng đã tồn tại"
**Nguyên nhân:** `orderNumber` bị trùng

**Giải pháp:** Không gửi `orderNumber`, để hệ thống tự generate

---

## 5. Test với Postman

**Bước 1:** Import collection đã cập nhật

**Bước 2:** Test tạo order (không cần token):
```
POST http://localhost:5000/api/orders
```

**Bước 3:** Lấy token từ login để test các endpoint khác:
```
POST http://localhost:5000/api/users/login
```

**Bước 4:** Set token vào Authorization → Bearer Token

**Bước 5:** Test các endpoint get/update/cancel

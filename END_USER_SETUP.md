# Lộ trình Setup Trang End User

## Tổng quan

Setup trang End User (Customer) với JWT authentication, sử dụng các API hiện có.

---

## Phase 1: Authentication cho Customer (Cơ bản)

### 1.1 API Backend đã có sẵn

| API | Method | Mô tả | Auth |
|-----|--------|-------|------|
| `/api/users/register` | POST | Đăng ký tài khoản | No |
| `/api/users/login` | POST | Đăng nhập | No |
| `/api/users/profile` | GET | Lấy thông tin profile | JWT |

**JWT Token:**
- Payload: `{ userId, email, roleId, roleName, tokenVersion }`
- Expires: 7 ngày
- Header: `Authorization: Bearer <token>`

### 1.2 Frontend đã có

- `lib/api.ts` - API service với JWT
- `hooks/useApi.ts` - Hook `useAuth()` (login, register, logout)
- `(auth)/login-register/page.tsx` - UI đăng nhập/đăng ký

### 1.3 Đã hoàn thành

- [x] Hoàn thiện form login/register (gọi API thực)
- [x] Tạo AuthContext/Provider để quản lý state global
- [x] Protected routes cho trang cần đăng nhập (ProtectedRoute component)
- [x] Lưu user info vào context sau login

**Files đã tạo/sửa:**
- `types/auth.ts` - Type definitions
- `context/AuthContext.tsx` - Auth state management
- `components/auth/ProtectedRoute.tsx` - Protected route wrapper
- `components/layout/Providers.tsx` - Thêm AuthProvider
- `app/(auth)/login-register/page.tsx` - Cập nhật form gọi API

---

## Phase 2: Profile & Account Management

### 2.1 API cần thêm (Backend)

```typescript
// routes/userRoutes.ts
router.put('/profile', authenticateToken, updateProfile); // Cập nhật profile
router.put('/password', authenticateToken, changePassword); // Đổi mật khẩu
```

### 2.2 Frontend

- [ ] Trang `/profile` - Xem/sửa thông tin cá nhân
- [ ] Form đổi mật khẩu
- [ ] Upload avatar

---

## Phase 3: Shopping Flow

### 3.1 API đã có

| API | Method | Mô tả |
|-----|--------|-------|
| `/api/products` | GET | Danh sách sản phẩm |
| `/api/products/:id` | GET | Chi tiết sản phẩm |
| `/api/products/:slug/by-slug` | GET | Lấy theo slug |
| `/api/categories` | GET | Danh mục |
| `/api/carts` | GET/POST/PUT/DELETE | Giỏ hàng |
| `/api/orders` | POST | Tạo đơn hàng |

### 3.2 Cần làm

- [ ] Tích hợp cart với user (liên kết userId)
- [ ] Checkout flow với thông tin user đã đăng nhập
- [ ] Lưu địa chỉ giao hàng mặc định

---

## Phase 4: Order Management (Customer)

### 4.1 API cần thêm

```typescript
// routes/orderRoutes.ts
router.get('/my-orders', authenticateToken, getMyOrders); // Đơn hàng của tôi
router.get('/my-orders/:id', authenticateToken, getMyOrderDetail); // Chi tiết
router.put('/my-orders/:id/cancel', authenticateToken, cancelMyOrder); // Hủy đơn
```

### 4.2 Frontend

- [ ] Trang `/order` hoặc `/profile/orders` - Lịch sử đơn hàng
- [ ] Chi tiết đơn hàng
- [ ] Theo dõi trạng thái đơn

---

## Phase 5: Wishlist & Reviews (Optional)

### 5.1 API mới

```typescript
// Wishlist
router.get('/wishlist', authenticateToken, getWishlist);
router.post('/wishlist/:productId', authenticateToken, addToWishlist);
router.delete('/wishlist/:productId', authenticateToken, removeFromWishlist);

// Reviews
router.post('/products/:id/reviews', authenticateToken, createReview);
router.get('/products/:id/reviews', getProductReviews);
```

### 5.2 Frontend

- [ ] Nút yêu thích trên sản phẩm
- [ ] Trang wishlist
- [ ] Form đánh giá sản phẩm (sau khi mua)

---

## Phase 6: Address Management

### 6.1 API mới

```typescript
// routes/addressRoutes.ts
router.get('/addresses', authenticateToken, getMyAddresses);
router.post('/addresses', authenticateToken, createAddress);
router.put('/addresses/:id', authenticateToken, updateAddress);
router.delete('/addresses/:id', authenticateToken, deleteAddress);
router.put('/addresses/:id/default', authenticateToken, setDefaultAddress);
```

### 6.2 Frontend

- [ ] Quản lý nhiều địa chỉ giao hàng
- [ ] Chọn địa chỉ khi checkout

---

## Cấu trúc Files (Đề xuất)

```
frontend/src/
├── contexts/
│   └── AuthContext.tsx         # Auth state management
├── hooks/
│   └── useApi.ts               # Đã có
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       └── ProtectedRoute.tsx
├── app/
│   ├── (auth)/
│   │   ├── login-register/     # Đã có
│   │   └── forget-pass/        # Đã có
│   ├── profile/
│   │   ├── page.tsx            # Profile chính
│   │   ├── orders/page.tsx     # Đơn hàng
│   │   ├── addresses/page.tsx  # Địa chỉ
│   │   └── wishlist/page.tsx   # Yêu thích
│   └── ...
```

---

## Thứ tự ưu tiên thực hiện

1. **Phase 1** - Auth cơ bản (BẮT BUỘC)
2. **Phase 2** - Profile management
3. **Phase 3** - Shopping flow integration
4. **Phase 4** - Order history
5. **Phase 5 & 6** - Optional features

---

## Ghi chú kỹ thuật

### JWT Flow

```
1. User đăng nhập → Server trả token
2. Frontend lưu token vào localStorage
3. Mỗi request protected → gửi header Authorization
4. Token hết hạn → redirect về login
```

### Role-based Access

- **Customer (roleId: null hoặc USER)**: Trang end-user
- **Admin**: Dashboard quản trị

### Security Notes

- Password hash với bcrypt (cost 12)
- Rate limiting: 5 login attempts/15 phút
- Account lockout sau 5 lần sai
- Token invalidation khi đổi password

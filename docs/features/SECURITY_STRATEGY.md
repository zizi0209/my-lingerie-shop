# Chiến lược Bảo mật - Hướng 2: Flexible + HttpOnly

## Tổng quan

Cho phép Admin đăng nhập và sử dụng trang User bình thường, nhưng yêu cầu xác thực lại (re-authentication) khi truy cập Dashboard quản trị.

---

## So sánh 2 hướng tiếp cận

| Đặc điểm | Hướng 1: Strict | Hướng 2: Flexible (Chọn) |
|----------|-----------------|--------------------------|
| **Cơ chế** | Admin vào trang khách → Báo lỗi "Cấm" | Admin vào trang khách → Mua hàng được |
| **Bảo mật** | Tuyệt đối | Tốt (nếu làm đúng HttpOnly) |
| **Rủi ro lộ Token** | 0% tại trang khách | Thấp (HttpOnly bảo vệ) |
| **Sự tiện lợi** | Thấp (2 tài khoản) | Cao (1 tài khoản) |
| **Phù hợp với** | Ngân hàng, Tài chính | TMĐT, Blog, Shop |

**Kết luận:** Lingerie Shop chọn **Hướng 2** vì tiện lợi cho chủ shop.

---

## Điều kiện bắt buộc

### 1. HttpOnly Cookie cho Refresh Token ✅ (Đã triển khai)

```
┌─────────────────────────────────────────────────────────┐
│  Refresh Token                                          │
│  ├── Lưu trữ: HttpOnly Cookie                          │
│  ├── JavaScript KHÔNG thể đọc được                     │
│  ├── Chống XSS: ✅                                      │
│  └── Thời hạn: 30 ngày (User) / 24 giờ (Admin)         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Access Token                                           │
│  ├── Lưu trữ: localStorage (hoặc memory)               │
│  ├── Thời hạn ngắn: 1 giờ (User) / 15 phút (Admin)     │
│  ├── Tự động refresh trước khi hết hạn                 │
│  └── Rủi ro: Có thể bị XSS, nhưng hết hạn nhanh        │
└─────────────────────────────────────────────────────────┘
```

### 2. Re-authentication khi vào Dashboard 🔄 (Cần triển khai)

Khi Admin từ trang User click vào Dashboard → Yêu cầu nhập lại password.

---

## Kiến trúc Re-authentication

### Flow hoạt động

```
                    ┌─────────────────┐
                    │  User đăng nhập │
                    │  (Admin account)│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Duyệt web,      │
                    │ mua hàng...     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Click Dashboard │
                    └────────┬────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │ Kiểm tra dashboardAuthExpiry │
              │ (cookie/localStorage)        │
              └──────────────┬───────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
        Còn hiệu lực               Hết hạn/Chưa có
              │                             │
              ▼                             ▼
     ┌─────────────────┐         ┌─────────────────┐
     │ Vào Dashboard   │         │ Hiện Modal      │
     │ trực tiếp       │         │ nhập password   │
     └─────────────────┘         └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │ Verify password │
                                 │ với server      │
                                 └────────┬────────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                         Sai password           Đúng password
                              │                       │
                              ▼                       ▼
                    ┌─────────────────┐     ┌─────────────────┐
                    │ Hiện lỗi,       │     │ Set expiry      │
                    │ cho thử lại     │     │ (30 phút)       │
                    └─────────────────┘     └────────┬────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │ Redirect vào    │
                                            │ Dashboard       │
                                            └─────────────────┘
```

### Thời gian hiệu lực Dashboard Auth

| Cấu hình | Giá trị | Lý do |
|----------|---------|-------|
| **Thời hạn** | 30 phút | Đủ để làm việc, không quá dài |
| **Gia hạn** | Mỗi thao tác | Reset timer khi có activity |
| **Timeout** | 15 phút không thao tác | Auto logout khỏi dashboard |

---

## API Endpoints cần thêm

### POST /api/auth/verify-password

Xác thực password để vào Dashboard.

**Request:**
```json
{
  "password": "current_password"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "dashboardToken": "short_lived_token",
    "expiresIn": 1800000
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Mật khẩu không đúng!"
}
```

---

## Frontend Implementation

### Components cần tạo

```
frontend/src/
├── components/
│   └── auth/
│       ├── ProtectedRoute.tsx      (Đã có)
│       ├── DashboardGuard.tsx      (Mới) - Bảo vệ Dashboard
│       └── ReAuthModal.tsx         (Mới) - Modal nhập password
├── context/
│   └── AuthContext.tsx             (Cập nhật) - Thêm dashboard auth
└── hooks/
    └── useDashboardAuth.ts         (Mới) - Hook quản lý dashboard auth
```

### DashboardGuard Component

```tsx
// Pseudo-code
function DashboardGuard({ children }) {
  const { user, isDashboardAuthenticated } = useAuth();
  const [showReAuthModal, setShowReAuthModal] = useState(false);

  // Kiểm tra quyền Admin
  if (!isAdminRole(user?.role?.name)) {
    return <Redirect to="/" />;
  }

  // Kiểm tra dashboard auth
  if (!isDashboardAuthenticated) {
    return <ReAuthModal onSuccess={() => ...} />;
  }

  return children;
}
```

### Cách sử dụng

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <DashboardGuard>
      <DashboardSidebar />
      {children}
    </DashboardGuard>
  );
}
```

---

## Storage Strategy

### Option A: localStorage (Đơn giản)

```typescript
// Lưu
localStorage.setItem('dashboardAuthExpiry', Date.now() + 30 * 60 * 1000);

// Kiểm tra
const expiry = localStorage.getItem('dashboardAuthExpiry');
const isValid = expiry && Number(expiry) > Date.now();
```

**Ưu điểm:** Đơn giản, dễ implement
**Nhược điểm:** Có thể bị XSS đọc

### Option B: HttpOnly Cookie (An toàn hơn)

Server set cookie khi verify password thành công.

```typescript
// Backend
res.cookie('dashboardAuth', 'verified', {
  httpOnly: true,
  secure: true,
  maxAge: 30 * 60 * 1000, // 30 phút
  sameSite: 'lax'
});
```

**Ưu điểm:** An toàn hơn, không bị XSS
**Nhược điểm:** Cần API check `/api/auth/check-dashboard-auth`

### Khuyến nghị: Option B (HttpOnly Cookie)

---

## Checklist triển khai

### Backend ✅ COMPLETED

- [x] `POST /api/auth/verify-password` - Xác thực password
- [x] `GET /api/auth/check-dashboard-auth` - Kiểm tra dashboard cookie
- [x] `POST /api/auth/revoke-dashboard-auth` - Xóa dashboard cookie
- [x] Dashboard auth cookie config trong `config/auth.ts`

### Frontend ✅ COMPLETED

- [x] `components/auth/ReAuthModal.tsx` - Modal nhập password
- [x] `components/auth/DashboardGuard.tsx` - Guard component
- [x] Cập nhật `app/dashboard/layout.tsx` - Wrap với DashboardGuard

### Testing

- [ ] Test: User thường không vào được Dashboard
- [ ] Test: Admin vào Dashboard lần đầu → Hiện modal
- [ ] Test: Nhập đúng password → Vào được Dashboard
- [ ] Test: Sau 30 phút → Yêu cầu nhập lại
- [ ] Test: Logout → Xóa dashboard auth

---

## Tóm tắt

| Thành phần | Trạng thái | Ghi chú |
|------------|------------|---------|
| HttpOnly Refresh Token | ✅ Done | `config/auth.ts` |
| Access Token + Auto Refresh | ✅ Done | `lib/api.ts` |
| Role-based Token Expiry | ✅ Done | Admin 15m, User 1h |
| Re-auth Modal | 🔄 Todo | Cần triển khai |
| Dashboard Guard | 🔄 Todo | Cần triển khai |
| Dashboard Cookie | 🔄 Todo | Cần triển khai |

---

## Timeline ước tính

| Task | Thời gian |
|------|-----------|
| Backend: verify-password API | 15 phút |
| Backend: dashboard cookie logic | 15 phút |
| Frontend: ReAuthModal | 20 phút |
| Frontend: DashboardGuard | 15 phút |
| Frontend: Hook + Context update | 15 phút |
| Testing | 15 phút |
| **Tổng** | **~1.5 giờ** |

# Chiến lược Access Token + Refresh Token

## Hiện trạng

- Chỉ có 1 JWT token duy nhất
- Thời hạn: 7 ngày cho tất cả
- Không phân biệt Admin/User

---

## Chiến lược mới (Industry Standard)

### Token Configuration

| Đối tượng | Access Token | Refresh Token | Lý do |
|-----------|--------------|---------------|-------|
| **End User** | 1 giờ | 30 ngày | Ưu tiên tiện lợi, rủi ro thấp |
| **Admin** | 15 phút | 24 giờ | Ưu tiên bảo mật, dữ liệu nhạy cảm |

### Token Flow

```
1. Login → Server trả về { accessToken, refreshToken }
2. Client lưu:
   - accessToken → Memory (state) hoặc localStorage
   - refreshToken → HttpOnly Cookie (bảo mật hơn)
3. Gọi API → Gửi accessToken trong header
4. accessToken hết hạn → Tự động gọi /refresh với refreshToken
5. Nhận accessToken mới → Tiếp tục gọi API
6. refreshToken hết hạn → Redirect về login
```

---

## Kế hoạch triển khai

### Phase 1: Backend

#### 1.1 Database Schema
```prisma
model RefreshToken {
  id          String    @id @default(uuid())
  token       String    @unique
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?
  
  @@index([token])
  @@index([userId])
}
```

#### 1.2 Config constants
```typescript
// config/auth.ts
export const AUTH_CONFIG = {
  ACCESS_TOKEN: {
    USER: { expiresIn: '1h', expiresInMs: 60 * 60 * 1000 },
    ADMIN: { expiresIn: '15m', expiresInMs: 15 * 60 * 1000 },
  },
  REFRESH_TOKEN: {
    USER: { expiresIn: '30d', expiresInMs: 30 * 24 * 60 * 60 * 1000 },
    ADMIN: { expiresIn: '24h', expiresInMs: 24 * 60 * 60 * 1000 },
  },
};
```

#### 1.3 API Endpoints
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/auth/login` | POST | Login, trả accessToken + set refreshToken cookie |
| `/api/auth/register` | POST | Register, trả accessToken + set refreshToken cookie |
| `/api/auth/refresh` | POST | Dùng refreshToken cookie để lấy accessToken mới |
| `/api/auth/logout` | POST | Xóa refreshToken khỏi DB và cookie |

#### 1.4 Security
- refreshToken lưu trong HttpOnly cookie (chống XSS)
- Mỗi refresh tạo refreshToken mới (rotation)
- Revoke tất cả refresh tokens khi đổi password
- Rate limiting cho /refresh endpoint

---

### Phase 2: Frontend

#### 2.1 API Service updates
```typescript
// Interceptor tự động refresh
- Khi nhận 401 → Gọi /refresh
- Nếu refresh thành công → Retry request gốc
- Nếu refresh thất bại → Logout, redirect login
```

#### 2.2 Auth Context updates
```typescript
- Lưu accessToken trong memory/state
- Không lưu refreshToken (cookie HttpOnly)
- Auto refresh trước khi token hết hạn
```

---

## Files đã tạo/sửa (COMPLETED)

### Backend
- [x] `prisma/schema.prisma` - Thêm RefreshToken model
- [x] `src/config/auth.ts` - Token config constants
- [x] `src/routes/authRoutes.ts` - Auth endpoints mới
- [x] `src/controllers/authController.ts` - Auth logic
- [x] `src/utils/tokenUtils.ts` - Helper functions
- [x] `src/server.ts` - Thêm cookie-parser + authRoutes

### Frontend
- [x] `src/lib/api.ts` - Thêm refresh interceptor
- [x] `src/context/AuthContext.tsx` - Cập nhật logic
- [x] `src/types/auth.ts` - Cập nhật AuthResponse type

---

## Timeline ước tính

| Task | Thời gian |
|------|-----------|
| Backend schema + migration | 10 phút |
| Backend auth endpoints | 30 phút |
| Frontend interceptor | 20 phút |
| Testing | 15 phút |
| **Tổng** | **~1.5 giờ** |

---
title: Authentication
---

# Authentication

Hệ thống dùng **JWT Bearer Token**. Token được trả về từ các endpoint trong nhóm `/api/auth/*`.

```http
Authorization: Bearer <jwt-token>
```

## Trạng thái phổ biến

- `401`: thiếu token / token hết hạn / token bị thu hồi
- `403`: không đủ quyền (Admin)

## Ghi chú bảo mật

- Token bị vô hiệu nếu `tokenVersion` thay đổi (logout-all / promote role / restore user).
- Nếu đổi mật khẩu, token cũ sẽ không còn hợp lệ.

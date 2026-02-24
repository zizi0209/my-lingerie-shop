---
title: Auth API
---

# Auth API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Đăng ký |
| POST | `/api/auth/login` | Public | Đăng nhập |
| POST | `/api/auth/social-login` | Public | Đăng nhập social |
| POST | `/api/auth/forgot-password` | Public | Yêu cầu OTP |
| POST | `/api/auth/verify-otp` | Public | Xác thực OTP |
| POST | `/api/auth/reset-password` | Public | Đặt lại mật khẩu |
| POST | `/api/auth/set-admin-password` | Public | Thiết lập mật khẩu admin sau social login |
| POST | `/api/auth/refresh` | Public | Refresh token |
| POST | `/api/auth/logout` | Public | Logout |

### User (JWT)

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/auth/logout-all` | User | Thu hồi toàn bộ session |
| POST | `/api/auth/verify-password` | User | Xác thực lại mật khẩu |
| GET | `/api/auth/check-dashboard-auth` | User | Kiểm tra quyền dashboard |
| POST | `/api/auth/revoke-dashboard-auth` | User | Thu hồi quyền dashboard |

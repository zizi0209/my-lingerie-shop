---
title: Users API
---

# Users API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/users/register` | Public | Đăng ký |
| POST | `/api/users/login` | Public | Đăng nhập |

### User (JWT)

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/users/profile` | User | Lấy hồ sơ |
| PUT | `/api/users/profile` | User | Cập nhật hồ sơ |
| POST | `/api/users/upload-avatar` | User | Upload avatar |
| PUT | `/api/users/change-password` | User | Đổi mật khẩu |

### Admin

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/users` | Admin | Danh sách user |
| GET | `/api/users/:id` | Admin | Chi tiết user |
| PUT | `/api/users/:id` | Admin | Cập nhật user |
| DELETE | `/api/users/:id` | Admin | Xóa user |

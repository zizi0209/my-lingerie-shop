---
title: Media API
---

# Media API

Tất cả endpoint yêu cầu **Admin**.

## Endpoints

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/media/upload` | Admin | Upload 1 ảnh (alias) |
| POST | `/api/media/single` | Admin | Upload 1 ảnh (field `image`) |
| POST | `/api/media/multiple` | Admin | Upload nhiều ảnh (max 10) |
| GET | `/api/media` | Admin | Danh sách media |
| GET | `/api/media/:id` | Admin | Chi tiết media |
| DELETE | `/api/media/:id` | Admin | Xóa media |

## Ghi chú

- Có `uploadLimiter` (10 upload/giờ/IP).
- `upload` dùng `multipart/form-data`.

---
title: Colors API
---

# Colors API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/colors` | Public | Danh sách màu |
| GET | `/api/colors/filter` | Public | Màu dùng cho filter |
| GET | `/api/colors/:id` | Public | Chi tiết màu |

### Admin

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/colors` | Admin | Tạo màu |
| PUT | `/api/colors/reorder` | Admin | Sắp xếp màu |
| PUT | `/api/colors/:id` | Admin | Cập nhật màu |
| DELETE | `/api/colors/:id` | Admin | Xóa màu |

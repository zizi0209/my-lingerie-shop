---
title: Categories API
---

# Categories API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/categories` | Public | Danh sách danh mục |
| GET | `/api/categories/slug/:slug` | Public | Chi tiết theo slug |
| GET | `/api/categories/:id` | Public | Chi tiết theo ID |

### Admin

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/categories` | Admin | Tạo danh mục |
| PUT | `/api/categories/:id` | Admin | Cập nhật danh mục |
| DELETE | `/api/categories/:id` | Admin | Xóa danh mục |

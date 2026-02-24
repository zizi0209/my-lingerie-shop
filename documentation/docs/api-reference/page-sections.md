---
title: Page Sections API
---

# Page Sections API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/page-sections` | Public | Danh sách section |
| GET | `/api/page-sections/code/:code` | Public | Lấy theo code |
| GET | `/api/page-sections/:id` | Public | Lấy theo ID |

### Admin

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/page-sections` | Admin | Tạo section |
| PUT | `/api/page-sections/:id` | Admin | Cập nhật section |
| DELETE | `/api/page-sections/:id` | Admin | Xóa section |

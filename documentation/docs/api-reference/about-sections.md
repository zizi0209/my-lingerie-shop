---
title: About Sections API
---

# About Sections API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/about-sections` | Public | Danh sách about sections |
| GET | `/api/about-sections/key/:key` | Public | Lấy theo key |
| GET | `/api/about-sections/:id` | Public | Lấy theo ID |

### Admin

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| PUT | `/api/about-sections/:id` | Admin | Cập nhật section |

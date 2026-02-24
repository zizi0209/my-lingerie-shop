---
title: Reviews API
---

# Reviews API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/reviews/product/:slug` | Public | Review theo sản phẩm |
| GET | `/api/reviews/product/:slug/stats` | Public | Thống kê review |
| POST | `/api/reviews/:id/helpful` | Optional | Vote hữu ích |

### User (JWT)

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/reviews/me` | User | Review của tôi |
| GET | `/api/reviews/pending` | User | Đơn chờ review |
| POST | `/api/reviews` | User | Tạo review |
| PUT | `/api/reviews/:id` | User | Cập nhật review |
| DELETE | `/api/reviews/:id` | User | Xóa review |

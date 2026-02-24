---
title: Orders API
---

# Orders API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/orders` | Public | Tạo đơn hàng |
| GET | `/api/orders/track/:orderNumber` | Public | Tra cứu đơn theo mã |

### User (JWT)

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/orders` | User | Danh sách đơn hàng |
| GET | `/api/orders/:id` | User | Chi tiết đơn |
| PUT | `/api/orders/:id` | User | Cập nhật đơn |
| PUT | `/api/orders/:id/cancel` | User | Hủy đơn |

## Ghi chú

- `track/:orderNumber` dành cho khách chưa đăng nhập.
- Các field body/response phụ thuộc `orderController`.

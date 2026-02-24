---
title: Carts API
---

# Carts API

## Endpoints

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/carts` | Public | Lấy giỏ hàng hiện tại |
| POST | `/api/carts/items` | Public | Thêm sản phẩm |
| PUT | `/api/carts/items/:id` | Public | Cập nhật item |
| DELETE | `/api/carts/items/:id` | Public | Xóa item |
| DELETE | `/api/carts/:id/clear` | Public | Xóa toàn bộ |
| POST | `/api/carts/:id/apply-coupon` | Public | Apply coupon (legacy) |
| DELETE | `/api/carts/:id/remove-coupon` | Public | Remove coupon (legacy) |
| POST | `/api/carts/:id/apply-discount` | Public | Apply mã giảm giá |
| POST | `/api/carts/:id/apply-shipping` | Public | Apply mã freeship |
| DELETE | `/api/carts/:id/remove-discount` | Public | Gỡ mã giảm giá |
| DELETE | `/api/carts/:id/remove-shipping` | Public | Gỡ mã ship |
| PUT | `/api/carts/:id/use-points` | Public | Dùng điểm |
| POST | `/api/carts/:id/calculate` | Public | Tính tổng |
| GET | `/api/carts/:id/available-vouchers` | Public | Voucher khả dụng |

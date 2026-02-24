---
title: Wishlist API
---

# Wishlist API

Tất cả endpoint yêu cầu **User (JWT)**.

## Endpoints

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/wishlist` | User | Danh sách wishlist |
| POST | `/api/wishlist` | User | Thêm wishlist |
| POST | `/api/wishlist/toggle` | User | Toggle wishlist |
| GET | `/api/wishlist/check/:productId` | User | Kiểm tra tồn tại |
| DELETE | `/api/wishlist/:productId` | User | Xóa khỏi wishlist |

---
title: Products API
---

# Products API

## Mục đích
Quản lý sản phẩm, ảnh, biến thể và xử lý ảnh 2D/3D.

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/products` | Public | Danh sách sản phẩm |
| GET | `/api/products/slug/:slug` | Public | Chi tiết theo slug |
| GET | `/api/products/:id` | Public | Chi tiết theo ID |
| GET | `/api/products/:id/images` | Public | Ảnh của sản phẩm |
| GET | `/api/products/images/:imageId` | Public | Ảnh theo imageId |
| GET | `/api/products/:id/variants` | Public | Biến thể của sản phẩm |
| GET | `/api/products/variants/:variantId` | Public | Biến thể theo ID |

### Admin

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/products` | Admin | Tạo sản phẩm |
| PUT | `/api/products/:id` | Admin | Cập nhật sản phẩm |
| DELETE | `/api/products/:id` | Admin | Xóa sản phẩm |
| POST | `/api/products/:id/images` | Admin | Thêm ảnh |
| PUT | `/api/products/images/:imageId` | Admin | Cập nhật ảnh |
| DELETE | `/api/products/images/:imageId` | Admin | Xóa ảnh |
| GET | `/api/products/:id/processing-status` | Admin | Trạng thái xử lý ảnh |
| POST | `/api/products/:id/process-images` | Admin | Trigger xử lý ảnh |
| POST | `/api/products/:id/retry-processing` | Admin | Retry xử lý |
| POST | `/api/products/images/:imageId/process` | Admin | Xử lý 1 ảnh |
| POST | `/api/products/images/:imageId/retry-3d` | Admin | Retry tạo 3D |
| GET | `/api/products/processing/triposr-status` | Admin | Trạng thái TripoSR |
| POST | `/api/products/:id/variants` | Admin | Thêm biến thể |
| PUT | `/api/products/variants/:variantId` | Admin | Cập nhật biến thể |
| DELETE | `/api/products/variants/:variantId` | Admin | Xóa biến thể |

## Ghi chú

- Các trường request/response phụ thuộc vào controller tương ứng.
- Endpoint xử lý ảnh chỉ dành cho admin và có rate limit chung theo `/api`.

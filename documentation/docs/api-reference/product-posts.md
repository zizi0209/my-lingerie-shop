---
title: Product Posts API
---

# Product Posts API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/product-posts/posts/:postId/products` | Public | Sản phẩm trong bài viết |
| GET | `/api/product-posts/posts/:postId/recommended` | Public | Gợi ý sản phẩm theo bài viết |
| GET | `/api/product-posts/products/:productId/posts` | Public | Bài viết liên quan sản phẩm |

### Admin

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/product-posts/link` | Admin | Link sản phẩm ↔ bài viết |
| DELETE | `/api/product-posts/unlink/:postId/:productId` | Admin | Gỡ link |
| POST | `/api/product-posts/batch-link` | Admin | Link nhiều sản phẩm |

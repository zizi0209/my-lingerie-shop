---
title: Post Categories API
---

# Post Categories API

## Endpoints

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/post-categories` | Public | Danh sách danh mục bài viết |
| GET | `/api/post-categories/:id` | Public | Chi tiết theo ID |
| GET | `/api/post-categories/slug/:slug` | Public | Chi tiết theo slug |
| POST | `/api/post-categories` | Public | Tạo danh mục (hiện không guard) |
| PUT | `/api/post-categories/:id` | Public | Cập nhật (hiện không guard) |
| DELETE | `/api/post-categories/:id` | Public | Xóa (hiện không guard) |

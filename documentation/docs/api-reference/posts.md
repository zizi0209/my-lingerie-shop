---
title: Posts API
---

# Posts API

## Endpoints

### Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/posts` | Public | Danh sách bài viết |
| GET | `/api/posts/slug/:slug` | Public | Chi tiết theo slug |
| GET | `/api/posts/:id` | Public | Chi tiết theo ID (hiện không guard) |
| POST | `/api/posts` | Public | Tạo bài viết (hiện không guard) |
| PUT | `/api/posts/:id` | Public | Cập nhật bài viết (hiện không guard) |
| DELETE | `/api/posts/:id` | Public | Xóa bài viết (hiện không guard) |

### User (JWT)

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/posts/me/bookmarks` | User | Bài viết đã bookmark |
| POST | `/api/posts/:postId/like` | User | Toggle like |
| POST | `/api/posts/:postId/bookmark` | User | Toggle bookmark |

### Optional Auth

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/posts/:postId/interaction` | Optional | Trạng thái like/bookmark |

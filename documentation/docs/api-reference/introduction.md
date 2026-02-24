---
title: Giới thiệu API
---

# API Reference

## Base URL

- Development: `http://localhost:<PORT>/api` (PORT mặc định `3000` nếu không cấu hình)
- Production: `https://<your-domain>/api`

## Xác thực

Hầu hết endpoint yêu cầu **JWT Bearer Token**.

```http
Authorization: Bearer <jwt-token>
```

## Chuẩn phản hồi

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": "Thông báo lỗi"
}
```

## Rate limit (tóm tắt)

- `apiLimiter`: 200 req / phút / IP (toàn bộ `/api`)
- `adminApiLimiter`: 100 req / phút / IP (toàn bộ `/api/admin/*`)
- `loginLimiter`: 5 req / 15 phút / IP
- `registerLimiter`: 3 req / giờ / IP
- `uploadLimiter`: 10 upload / giờ / IP
- `ai-consultant`: 20 req / phút / IP
- `adminCriticalLimiter`: 10 thao tác / 15 phút / IP

## Pagination chuẩn

```http
GET /api/products?page=1&limit=20
```

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "pages": 0
  }
}
```

## Phân loại quyền

- **Public**: không cần token
- **User**: cần JWT hợp lệ
- **Admin**: cần JWT + role `ADMIN` / `SUPER_ADMIN`

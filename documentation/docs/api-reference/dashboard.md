---
title: Admin Dashboard API
---

# Admin Dashboard API

Tất cả endpoint dưới đây yêu cầu **Admin**.

## Endpoints

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard/stats` | Admin | Tổng quan số liệu |
| GET | `/api/admin/dashboard/analytics` | Admin | Analytics theo period/date |
| GET | `/api/admin/dashboard/recent-activities` | Admin | Hoạt động admin gần đây |
| GET | `/api/admin/dashboard/live-feed` | Admin | Live feed đơn hàng/review |
| GET | `/api/admin/dashboard/carts` | Admin | Theo dõi cart |
| DELETE | `/api/admin/dashboard/carts/cleanup` | Admin | Dọn cart trống |

## Query phổ biến

- `stats`: `startDate`, `endDate`
- `analytics`: `period` hoặc `startDate` + `endDate`
- `recent-activities`: `limit`
- `live-feed`: `limit`
- `carts`: `page`, `limit`, `status`

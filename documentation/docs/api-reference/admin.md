---
title: Admin API
---

# Admin API

Tất cả endpoint dưới đây đều nằm dưới `/api/admin/*`, yêu cầu **Admin**.

## System Config

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/system-config` | Danh sách config |
| GET | `/api/admin/system-config/:key` | Lấy theo key |
| PUT | `/api/admin/system-config` | Cập nhật nhiều key |
| PUT | `/api/admin/system-config/:key` | Cập nhật 1 key |
| DELETE | `/api/admin/system-config/:key` | Xóa key |

## Users (Admin)

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/users` | Danh sách user |
| POST | `/api/admin/users` | Tạo user staff/admin |
| GET | `/api/admin/users/:id` | Chi tiết user |
| PUT | `/api/admin/users/:id` | Cập nhật user |
| DELETE | `/api/admin/users/:id` | Xóa user |
| PATCH | `/api/admin/users/:id/role` | Đổi role |
| PATCH | `/api/admin/users/:id/status` | Kích hoạt/vô hiệu |
| PATCH | `/api/admin/users/:id/unlock` | Mở khóa |
| GET | `/api/admin/users/:id/audit-logs` | Audit log theo user |
| PATCH | `/api/admin/users/:id/promote-role` | Promote role |
| PATCH | `/api/admin/users/:id/restore` | Khôi phục user |

## Reviews (Admin)

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/reviews` | Danh sách review |
| GET | `/api/admin/reviews/:id` | Chi tiết review |
| PUT | `/api/admin/reviews/:id/status` | Duyệt/ẩn review |
| PUT | `/api/admin/reviews/:id/reply` | Trả lời review |
| DELETE | `/api/admin/reviews/:id/reply` | Xóa reply |
| DELETE | `/api/admin/reviews/:id` | Xóa review |
| POST | `/api/admin/reviews/bulk-status` | Cập nhật nhiều review |

## Search (Admin)

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/search/synonyms` | Danh sách synonym |
| POST | `/api/admin/search/synonyms` | Tạo synonym |
| PUT | `/api/admin/search/synonyms/:id` | Cập nhật synonym |
| DELETE | `/api/admin/search/synonyms/:id` | Xóa synonym |
| GET | `/api/admin/search/keywords` | Danh sách keyword |
| POST | `/api/admin/search/keywords` | Tạo keyword |
| PUT | `/api/admin/search/keywords/:id` | Cập nhật keyword |
| DELETE | `/api/admin/search/keywords/:id` | Xóa keyword |
| GET | `/api/admin/search/analytics` | Thống kê search |

## Size Templates (Admin)

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/size-templates` | Danh sách template |
| GET | `/api/admin/size-templates/:type` | Chi tiết template |
| PUT | `/api/admin/size-templates/:type` | Cập nhật template |
| PATCH | `/api/admin/size-templates/:type/toggle` | Bật/tắt template |
| GET | `/api/admin/size-templates/stats/usage` | Thống kê usage |

## Analytics (Admin)

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/analytics/overview` | Tổng quan |
| GET | `/api/admin/analytics/funnel` | Funnel checkout |
| GET | `/api/admin/analytics/size-distribution` | Phân bổ size |
| GET | `/api/admin/analytics/search-keywords` | Từ khóa search |
| GET | `/api/admin/analytics/high-view-no-buy` | View cao - mua thấp |
| GET | `/api/admin/analytics/traffic-by-hour` | Traffic theo giờ |
| GET | `/api/admin/analytics/abandoned-carts` | Cart bị bỏ |
| GET | `/api/admin/analytics/size-heatmap` | Heatmap size |
| GET | `/api/admin/analytics/color-trends` | Trend màu |
| GET | `/api/admin/analytics/return-by-size` | Return theo size |
| GET | `/api/admin/analytics/product-performance` | Hiệu suất sản phẩm |
| GET | `/api/admin/analytics/recommendation-effectiveness` | Hiệu quả recommend |
| GET | `/api/admin/analytics/co-viewed-products` | Sản phẩm được xem cùng |
| GET | `/api/admin/analytics/bought-together` | Mua cùng |
| GET | `/api/admin/analytics/traffic-sources` | Nguồn traffic |
| GET | `/api/admin/analytics/wishlist` | Thống kê wishlist |
| GET | `/api/admin/analytics/low-stock` | Sản phẩm sắp hết |

## Audit Logs (Admin)

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/audit-logs` | Danh sách audit log |
| GET | `/api/admin/audit-logs/stats/summary` | Thống kê audit log |
| GET | `/api/admin/audit-logs/actions/list` | Danh sách action |
| GET | `/api/admin/audit-logs/resources/list` | Danh sách resource |
| GET | `/api/admin/audit-logs/admins/list` | Danh sách admin |
| GET | `/api/admin/audit-logs/:id` | Chi tiết audit log |

## Cleanup (Admin)

| Method | Path | Mô tả |
| --- | --- | --- |
| GET | `/api/admin/cleanup/status` | Trạng thái cleanup |
| GET | `/api/admin/cleanup/preview` | Preview dữ liệu sẽ xóa |
| POST | `/api/admin/cleanup/run/full` | Chạy full cleanup |
| POST | `/api/admin/cleanup/run/light` | Chạy light cleanup |

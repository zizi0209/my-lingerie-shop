---
title: Coupons & Loyalty API
---

# Coupons & Loyalty API

## Endpoints

### User / Public

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/vouchers` | Public | Voucher public |
| POST | `/api/vouchers/validate` | Public | Validate voucher |
| GET | `/api/rewards` | Public | Danh sách rewards |
| GET | `/api/my-vouchers` | User | Ví voucher của user |
| POST | `/api/my-vouchers/collect/:code` | User | Thu thập voucher |
| GET | `/api/my-points` | User | Điểm tích lũy |
| GET | `/api/my-tier` | User | Tiến độ tier |
| POST | `/api/rewards/:id/redeem` | User | Đổi điểm |
| POST | `/api/points/calculate` | Public | Tính preview điểm |
| GET | `/api/birthday-voucher` | User | Kiểm tra voucher sinh nhật |

### Admin - Coupons

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/admin/coupons` | Admin | Danh sách coupon |
| GET | `/api/admin/coupons/:id` | Admin | Chi tiết coupon |
| POST | `/api/admin/coupons` | Admin | Tạo coupon |
| PUT | `/api/admin/coupons/:id` | Admin | Cập nhật coupon |
| DELETE | `/api/admin/coupons/:id` | Admin | Xóa coupon |
| GET | `/api/admin/coupons/:id/usage` | Admin | Usage coupon |
| POST | `/api/admin/coupons/generate-private` | Admin | Sinh coupon private |

### Admin - Campaigns

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/admin/campaigns` | Admin | Danh sách campaign |
| GET | `/api/admin/campaigns/:id` | Admin | Chi tiết campaign |
| POST | `/api/admin/campaigns` | Admin | Tạo campaign |
| PUT | `/api/admin/campaigns/:id` | Admin | Cập nhật campaign |
| DELETE | `/api/admin/campaigns/:id` | Admin | Xóa campaign |

### Admin - Rewards

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/admin/rewards` | Admin | Danh sách rewards |
| GET | `/api/admin/rewards/:id` | Admin | Chi tiết reward |
| POST | `/api/admin/rewards` | Admin | Tạo reward |
| PUT | `/api/admin/rewards/:id` | Admin | Cập nhật reward |
| DELETE | `/api/admin/rewards/:id` | Admin | Xóa reward |

### Admin - Birthday

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/admin/birthday-vouchers/process` | Admin | Xử lý voucher sinh nhật |

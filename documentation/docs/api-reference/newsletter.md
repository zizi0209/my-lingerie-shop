---
title: Newsletter API
---

# Newsletter API

## Endpoints

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/newsletter/subscribe` | Public | Đăng ký newsletter |
| GET | `/api/newsletter/verify/:token` | Public | Xác nhận email |
| POST | `/api/newsletter/validate-coupon` | Public | Validate mã chào mừng |
| POST | `/api/newsletter/use-coupon` | Public | Ghi nhận dùng coupon |
| POST | `/api/newsletter/unsubscribe` | Public | Hủy đăng ký |

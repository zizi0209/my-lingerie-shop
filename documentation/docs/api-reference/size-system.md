---
title: Size System V2 API
---

# Size System V2 API

## Endpoints

### Sister sizing

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/sizes/sister/:universalCode` | Public | Lấy sister sizes |
| GET | `/api/sizes/sister-family/:universalCode` | Public | Family cùng cup volume |
| POST | `/api/sizes/sister/accept` | Public | Ghi nhận accept |
| GET | `/api/sizes/sister/stats` | Public | Thống kê accept |
| GET | `/api/sizes/out-of-stock` | Public | Size hay out-of-stock |
| GET | `/api/products/:productId/sizes/alternatives` | Public | Gợi ý size thay thế |

### Cup progression

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/sizes/cup/convert` | Public | Convert cup giữa vùng |
| GET | `/api/sizes/cup/progression/:regionCode` | Public | Lộ trình cup |
| GET | `/api/sizes/cup/matrix/:cupVolume` | Public | Ma trận cup |

### Brand fit

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/brands/fit/adjust` | Public | Điều chỉnh size theo brand |
| GET | `/api/brands/:brandId/fit` | Public | Hồ sơ brand fit |
| GET | `/api/brands/fit/all` | Public | Danh sách brand fit |
| POST | `/api/brands/fit/feedback` | Public | Gửi feedback fit |
| GET | `/api/brands/:brandId/fit/stats` | Public | Thống kê fit |
| GET | `/api/brands/:brandId/fit/suggested-adjustment` | Public | Gợi ý điều chỉnh |

### Admin utility

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/sizes/seed-cup-progression` | Admin | Seed dữ liệu cup |

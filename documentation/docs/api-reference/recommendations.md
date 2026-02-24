---
title: Recommendations API
---

# Recommendations API

## Endpoints

| Method | Path | Auth | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/recommendations/similar/:productId` | Public | Sản phẩm tương tự |
| GET | `/api/recommendations/recently-viewed` | Public | Sản phẩm đã xem |
| GET | `/api/recommendations/trending` | Public | Sản phẩm trending |
| GET | `/api/recommendations/bought-together/:productId` | Public | Mua cùng |
| GET | `/api/recommendations/personalized` | Public | Gợi ý cá nhân (cần userId) |
| GET | `/api/recommendations/new-arrivals` | Public | Hàng mới |
| GET | `/api/recommendations/best-sellers` | Public | Bán chạy |
| POST | `/api/recommendations/track-click` | Public | Track click |
| GET | `/api/recommendations/for-cart` | Public | Gợi ý cho giỏ hàng |

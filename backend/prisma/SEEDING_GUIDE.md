# 🌱 Database Seeding Guide

Hướng dẫn seed dữ liệu mẫu cho My Lingerie Shop.

## 📋 Yêu cầu

1. Đảm bảo file `.env` đã có:
```env
DATABASE_URL="postgresql://..."
ADMIN_EMAIL=admin@mylingerie.com
ADMIN_PASSWORD="YourSecurePassword123!"  # Phải wrap trong "" nếu có ký tự đặc biệt như #
```

2. Database đã được tạo và migrate:
```bash
npx prisma@6 db push
# hoặc
npx prisma@6 migrate deploy
```

---

## 🚀 Quick Start

### Reset hoàn toàn và seed lại

```bash
# 1. Reset database (XÓA HẾT dữ liệu!)
npx prisma@6 db push --force-reset

# 2. Generate Prisma client
npx prisma@6 generate

# 3. Seed dữ liệu cơ bản
npx ts-node prisma/seed.ts

# 4. Seed thêm sản phẩm (tùy chọn)
npx ts-node prisma/seed-products.ts
```

---

## 📁 Seed Files

| File | Mô tả | Models |
|------|-------|--------|
| `seed.ts` | **Dữ liệu cơ bản** (BẮT BUỘC chạy đầu tiên) | Role, Permission, User, SystemConfig, Category, PostCategory, Post, Coupon, PointReward, PageSection |
| `seed-products.ts` | Sản phẩm mẫu đầy đủ | Category, Product, ProductImage, ProductVariant, User, Order, OrderItem, Review |
| `seed-colors.ts` | Attribute màu sắc | Attribute, AttributeValue |
| `seed-search.ts` | Dữ liệu tìm kiếm | SearchSynonym, SearchKeyword |
| `seed-size-templates.ts` | Bảng size theo loại sản phẩm | SizeChartTemplate |
| `seed-voucher-test.ts` | Voucher & khuyến mãi test | Campaign, Coupon, PointReward, UserCoupon, PointHistory |

---

## 📦 Chi tiết từng Seed

### 1. `seed.ts` - Dữ liệu cơ bản (BẮT BUỘC)

```bash
npx ts-node prisma/seed.ts
```

**Tạo:**
- 3 Roles: `SUPER_ADMIN`, `ADMIN`, `USER`
- 9 Permissions
- Admin user (từ `.env`)
- Test user: `test@example.com` / `Test@12345`
- 6 SystemConfig (store_name, primary_color, etc.)
- 6 Categories (Áo lót, Quần lót, Set, Đồ ngủ, Định hình, Phụ kiện)
- 4 Post Categories
- 2 Sample Posts
- 3 Coupons: `NEWUSER50K`, `WELCOME10`, `FREESHIP`
- 1 Point Reward
- 6 Page Sections

---

### 2. `seed-products.ts` - Sản phẩm mẫu

```bash
npx ts-node prisma/seed-products.ts
```

**Tạo:**
- 30 Products (5 mỗi category)
- 3-4 Images mỗi product (từ picsum.photos)
- ~9 Variants mỗi product (size x color)
- 5 Test users
- 10 Sample orders
- 20+ Reviews

---

### 3. `seed-colors.ts` - Màu sắc

```bash
npx ts-node prisma/seed-colors.ts
```

**Tạo:**
- 1 Attribute "Màu sắc" (type: COLOR)
- 15 AttributeValue với hex code

---

### 4. `seed-search.ts` - Tìm kiếm

```bash
npx ts-node prisma/seed-search.ts
```

**Tạo:**
- 30+ SearchSynonym (bra → áo lót, panty → quần lót, etc.)
- 6 SearchKeyword (sale, new, hot, etc.)

---

### 5. `seed-size-templates.ts` - Bảng size

```bash
npx ts-node prisma/seed-size-templates.ts
```

**Tạo:**
- 5 SizeChartTemplate (BRA, PANTY, SET, SLEEPWEAR, SHAPEWEAR)
- Mỗi template có: headers, sizes, measurements, tips

---

### 6. `seed-voucher-test.ts` - Voucher test

```bash
npx ts-node prisma/seed-voucher-test.ts
```

**Tạo:**
- 2 Campaigns
- 7 Coupons đa dạng
- 4 Point Rewards
- Update test user với điểm và voucher

---

## 🔧 Seed đầy đủ tất cả

```bash
# Chạy tuần tự
npx ts-node prisma/seed.ts
npx ts-node prisma/seed-products.ts
npx ts-node prisma/seed-colors.ts
npx ts-node prisma/seed-search.ts
npx ts-node prisma/seed-size-templates.ts
npx ts-node prisma/seed-voucher-test.ts
```

---

## 📊 Model Coverage

| Model | Seed File |
|-------|-----------|
| User | `seed.ts`, `seed-products.ts`, `seed-voucher-test.ts` |
| Role | `seed.ts` |
| Permission | `seed.ts` |
| RefreshToken | _(runtime only)_ |
| Category | `seed.ts`, `seed-products.ts` |
| Product | `seed-products.ts`, `seed-voucher-test.ts` |
| ProductImage | `seed-products.ts` |
| ProductVariant | `seed-products.ts` |
| Attribute | `seed-colors.ts` |
| AttributeValue | `seed-colors.ts` |
| CategoryAttribute | _(manual)_ |
| ProductAttributeValue | _(manual)_ |
| PageSection | `seed.ts` |
| Order | `seed-products.ts` |
| OrderItem | `seed-products.ts` |
| Media | _(runtime only)_ |
| SystemConfig | `seed.ts` |
| PostCategory | `seed.ts` |
| Post | `seed.ts` |
| PostLike | `seed.ts` |
| PostBookmark | `seed.ts` |
| Cart | _(runtime only)_ |
| CartItem | _(runtime only)_ |
| PageView | _(runtime only)_ |
| ProductView | _(runtime only)_ |
| RecommendationClick | _(runtime only)_ |
| CartEvent | _(runtime only)_ |
| AuditLog | _(runtime only)_ |
| AdminInvitation | _(runtime only)_ |
| Review | `seed-products.ts` |
| ReviewImage | _(manual)_ |
| ReviewHelpful | _(runtime only)_ |
| ContactMessage | _(runtime only)_ |
| WishlistItem | _(runtime only)_ |
| Campaign | `seed-voucher-test.ts` |
| Coupon | `seed.ts`, `seed-voucher-test.ts` |
| UserCoupon | `seed-voucher-test.ts` |
| CouponUsage | _(runtime only)_ |
| PointHistory | `seed-voucher-test.ts` |
| PointReward | `seed.ts`, `seed-voucher-test.ts` |
| RewardRedemption | _(runtime only)_ |
| SearchLog | _(runtime only)_ |
| SearchSynonym | `seed-search.ts` |
| SearchKeyword | `seed-search.ts` |
| SizeChartTemplate | `seed-size-templates.ts` |
| UserPreference | _(runtime only)_ |
| NewsletterSubscriber | _(runtime only)_ |
| WelcomeCouponUsage | _(runtime only)_ |

---

## 🧪 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | `admin@mylingerie.com` | _(check .env)_ |
| USER | `test@example.com` | `Test@12345` |
| USER | `user1@test.com` | `password123` |
| USER | `user2@test.com` | `password123` |

---

## 🎫 Test Voucher Codes

| Code | Loại | Giảm | Điều kiện |
|------|------|------|-----------|
| `NEWUSER50K` | Thành viên mới | 50K | Đơn từ 300K |
| `WELCOME10` | Public | 10% (max 100K) | Đơn từ 200K |
| `FREESHIP` | Free ship | 30K ship | Đơn từ 400K |
| `SALE10` | Public | 10% (max 100K) | Đơn từ 200K |
| `GIAM50K` | Public | 50K | Đơn từ 300K |
| `GIAM100K` | Public | 100K | Đơn từ 500K |
| `SUMMER20` | Campaign | 20% (max 200K) | Đơn từ 300K |

---

## ❓ Troubleshooting

### Lỗi "Failed to fetch theme: 500"
```bash
# Seed lại SystemConfig
npx ts-node prisma/seed.ts
# Restart backend
```

### Lỗi "ADMIN_PASSWORD environment variable is required"
```bash
# Kiểm tra .env có ADMIN_PASSWORD
# Nếu password có ký tự #, wrap trong ""
ADMIN_PASSWORD="MyPass#123"
```

### Lỗi "Server has closed the connection" (P1017)
```bash
# Nếu dùng adapter trong prisma.ts, bỏ đi
# File src/lib/prisma.ts chỉ cần:
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient();
```

### Lỗi "EPERM: operation not permitted"
```bash
# Prisma client file bị lock, tắt backend trước khi generate
taskkill /F /IM node.exe
npx prisma@6 generate
```

---

## 📝 Tạo seed mới

Template cho seed file mới:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');
  
  // Your seed logic here
  
  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🔄 Chạy khi deploy

```bash
# Production seeding (chỉ dữ liệu cơ bản)
NODE_ENV=production npx ts-node prisma/seed.ts
```

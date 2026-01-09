# Promotion & Loyalty System - Lingerie Shop

> **Chiến lược**: Chuyển đổi từ "Quản lý mã giảm giá" → "Quản lý Khuyến mãi & Trải nghiệm khách hàng"

---

## Mục Lục

1. [Tổng quan Kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Phân tích Nghiệp vụ](#2-phân-tích-nghiệp-vụ)
3. [Thiết kế Database Schema](#3-thiết-kế-database-schema)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Components](#5-frontend-components)
6. [Kịch bản Nghiệp vụ](#6-kịch-bản-nghiệp-vụ)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. Tổng quan Kiến trúc

### 1.1 Hai Phân hệ Chính

```
┌─────────────────────────────────────────────────────────────────────┐
│                     PROMOTION & LOYALTY SYSTEM                      │
├─────────────────────────────────┬───────────────────────────────────┤
│     PROMOTION ENGINE            │     LOYALTY & GAMIFICATION        │
│     (Bộ máy khuyến mãi)         │     (Tích điểm & Hạng thành viên) │
├─────────────────────────────────┼───────────────────────────────────┤
│ • Campaign Management           │ • Point Balance                   │
│ • Coupon/Voucher CRUD           │ • Point History (Earn/Burn)       │
│ • Voucher Wallet (UserCoupon)   │ • Member Tier (Bronze/Silver/Gold)│
│ • Auto-apply Logic              │ • Point Redemption → Voucher      │
│ • Condition Engine (JSON)       │ • Birthday Bonus                  │
└─────────────────────────────────┴───────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │      CHECKOUT FLOW          │
                    │  (Tự động áp dụng tốt nhất) │
                    └─────────────────────────────┘
```

### 1.2 Luồng Voucher (Vòng đời)

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   CAMPAIGN   │ ───► │   COLLECT    │ ───► │    APPLY     │ ───► │    USED      │
│  (Tạo chiến  │      │  (User lưu   │      │ (Checkout    │      │  (Đánh dấu   │
│   dịch)      │      │   vào ví)    │      │  áp dụng)    │      │   đã dùng)   │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
     Admin                 User                 System               System
```

---

## 2. Phân tích Nghiệp vụ

### 2.1 Phân loại Voucher

| Loại | Mô tả | Cách phát | Ví dụ |
|------|-------|-----------|-------|
| **NEW_USER** | Voucher chào mừng thành viên mới | Tự động khi đăng ký | Giảm 50K đơn đầu tiên |
| **PUBLIC** | Mã công khai, ai cũng dùng được | Nhập code / Lưu vào ví | BLACKFRIDAY, SALE2024 |
| **PRIVATE** | Mã riêng cho 1 user cụ thể | System generate | Mã xin lỗi, đổi điểm |
| **PRODUCT** | Chỉ áp dụng cho sản phẩm/danh mục | Admin tạo | Giảm 20% Áo lót |
| **SHIPPING** | Miễn phí vận chuyển | Theo điều kiện đơn | Freeship đơn từ 500K |

### 2.2 Các loại Giảm giá

| Type | Mô tả | Ví dụ |
|------|-------|-------|
| `PERCENTAGE` | Giảm % tổng đơn | Giảm 10% (max 100K) |
| `FIXED_AMOUNT` | Giảm số tiền cố định | Giảm 50,000đ |
| `FREE_SHIPPING` | Miễn phí ship | Freeship |
| `BUY_X_GET_Y` | Mua X tặng Y | Mua 2 tặng 1 |

### 2.3 Điều kiện Áp dụng (Conditions JSON)

```json
{
  "minOrderValue": 300000,
  "maxDiscount": 100000,
  "applicableProducts": [1, 2, 3],
  "applicableCategories": [1],
  "excludeProducts": [99],
  "excludeCategories": [5],
  "customerTiers": ["GOLD", "SILVER"],
  "firstOrderOnly": true,
  "maxUsagePerUser": 1,
  "validDays": ["MONDAY", "FRIDAY"],
  "validHours": { "from": 9, "to": 21 }
}
```

### 2.4 Hệ thống Tích điểm (Loyalty Points)

| Hành động | Điểm | Ghi chú |
|-----------|------|---------|
| Mua hàng | 1 điểm / 10,000đ | Sau khi đơn DELIVERED |
| Viết đánh giá | +5 điểm | Review APPROVED |
| Đánh giá có ảnh | +10 điểm | Review có ≥1 ảnh |
| Sinh nhật | x2 điểm | Trong tháng sinh nhật |
| Giới thiệu bạn | +50 điểm | Bạn đặt đơn đầu tiên |

### 2.5 Hạng thành viên (Member Tiers)

| Hạng | Điều kiện | Quyền lợi |
|------|-----------|-----------|
| **BRONZE** | Mặc định | Tích điểm 1% |
| **SILVER** | Tích lũy ≥ 2,000,000đ | Tích điểm 1.5%, Voucher sinh nhật 50K |
| **GOLD** | Tích lũy ≥ 5,000,000đ | Tích điểm 2%, Voucher sinh nhật 100K, Freeship |
| **PLATINUM** | Tích lũy ≥ 10,000,000đ | Tích điểm 3%, Voucher sinh nhật 200K, Ưu tiên hỗ trợ |

---

## 3. Thiết kế Database Schema

### 3.1 Prisma Schema (Thêm vào schema.prisma)

```prisma
// =============================================
// PROMOTION & LOYALTY SYSTEM
// =============================================

// CHIẾN DỊCH KHUYẾN MÃI
model Campaign {
  id          Int       @id @default(autoincrement())
  name        String    // "Sale Tết 2024"
  slug        String    @unique
  description String?   @db.Text
  
  startDate   DateTime
  endDate     DateTime
  
  isActive    Boolean   @default(true)
  coupons     Coupon[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([isActive, startDate, endDate])
}

// MÃ GIẢM GIÁ (VOUCHER/COUPON)
model Coupon {
  id          Int       @id @default(autoincrement())
  code        String    @unique // "BLACKFRIDAY", "NEWUSER50K"
  name        String    // "Giảm 50K cho thành viên mới"
  description String?
  
  // Loại giảm giá
  discountType    String    // PERCENTAGE | FIXED_AMOUNT | FREE_SHIPPING | BUY_X_GET_Y
  discountValue   Float     // 10 (10%) hoặc 50000 (50K)
  
  // Giới hạn
  maxDiscount     Float?    // Giảm tối đa (cho PERCENTAGE)
  minOrderValue   Float?    // Đơn tối thiểu
  
  // Số lượng
  quantity        Int?      // Tổng số mã (null = không giới hạn)
  usedCount       Int       @default(0)
  maxUsagePerUser Int       @default(1) // Mỗi user dùng tối đa
  
  // Phân loại
  couponType  String    @default("PUBLIC") // NEW_USER | PUBLIC | PRIVATE | PRODUCT | SHIPPING
  isSystem    Boolean   @default(false) // System tự tạo (không hiển thị public)
  isPublic    Boolean   @default(true)  // Hiển thị để user lưu
  
  // Điều kiện phức tạp (JSON)
  conditions  Json?     // { applicableCategories, excludeProducts, customerTiers, ... }
  
  // Thời gian hiệu lực
  startDate   DateTime  @default(now())
  endDate     DateTime?
  
  // Campaign (optional)
  campaignId  Int?
  campaign    Campaign? @relation(fields: [campaignId], references: [id])
  
  // Relationships
  userCoupons UserCoupon[]
  usageHistory CouponUsage[]
  
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([code])
  @@index([couponType, isActive])
  @@index([isPublic, isActive])
  @@index([startDate, endDate])
}

// VÍ VOUCHER CỦA USER (User đã lưu/được tặng)
model UserCoupon {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  couponId    Int
  coupon      Coupon    @relation(fields: [couponId], references: [id], onDelete: Cascade)
  
  // Trạng thái
  status      String    @default("AVAILABLE") // AVAILABLE | USED | EXPIRED
  
  // Thời hạn riêng cho user này (có thể khác với coupon gốc)
  expiresAt   DateTime?
  
  // Tracking
  usedAt      DateTime?
  usedOrderId Int?      // Đơn hàng đã dùng
  
  // Source: Từ đâu có voucher này
  source      String    @default("COLLECTED") // COLLECTED | SYSTEM | REWARD | REFERRAL
  
  createdAt   DateTime  @default(now())
  
  @@unique([userId, couponId])
  @@index([userId, status])
  @@index([couponId])
  @@index([expiresAt])
}

// LỊCH SỬ SỬ DỤNG VOUCHER (Chi tiết hơn)
model CouponUsage {
  id          Int       @id @default(autoincrement())
  couponId    Int
  coupon      Coupon    @relation(fields: [couponId], references: [id])
  userId      Int?
  orderId     Int
  
  discountAmount Float   // Số tiền đã giảm
  orderTotal     Float   // Tổng đơn trước giảm
  
  createdAt   DateTime  @default(now())
  
  @@index([couponId])
  @@index([userId])
  @@index([orderId])
}

// =============================================
// LOYALTY POINTS SYSTEM
// =============================================

// SỐ DƯ ĐIỂM (Denormalized cho performance)
// Thêm vào model User:
// pointBalance    Int       @default(0)
// totalSpent      Float     @default(0)
// memberTier      String    @default("BRONZE")
// birthday        DateTime?

// LỊCH SỬ ĐIỂM
model PointHistory {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Loại giao dịch
  type        String    // EARN | BURN | EXPIRE | ADJUST
  amount      Int       // Số điểm (+/-)
  balance     Int       // Số dư sau giao dịch
  
  // Nguồn
  source      String    // ORDER | REVIEW | BIRTHDAY | REFERRAL | REDEEM | ADMIN_ADJUST
  sourceId    String?   // Order ID, Review ID, etc.
  
  description String?   // "Tích điểm đơn hàng #12345"
  
  // Admin adjust
  adjustedBy  Int?      // Admin ID nếu là ADJUST
  
  expiresAt   DateTime? // Điểm có hạn sử dụng
  
  createdAt   DateTime  @default(now())
  
  @@index([userId, createdAt])
  @@index([type])
  @@index([source])
}

// QUÀ ĐỔI ĐIỂM (Reward Catalog)
model PointReward {
  id          Int       @id @default(autoincrement())
  name        String    // "Voucher giảm 50K"
  description String?
  
  pointCost   Int       // Số điểm cần đổi
  
  // Loại quà
  rewardType  String    // VOUCHER | GIFT | DISCOUNT
  
  // Nếu là VOUCHER, link đến coupon template
  couponId    Int?
  
  // Giới hạn
  quantity    Int?      // Số lượng quà (null = không giới hạn)
  redeemedCount Int     @default(0)
  maxPerUser  Int?      // Mỗi user đổi tối đa
  
  isActive    Boolean   @default(true)
  startDate   DateTime  @default(now())
  endDate     DateTime?
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@index([isActive, pointCost])
}

// LỊCH SỬ ĐỔI QUÀ
model RewardRedemption {
  id          Int       @id @default(autoincrement())
  userId      Int
  rewardId    Int
  
  pointSpent  Int       // Số điểm đã dùng
  
  // Kết quả
  resultType  String    // VOUCHER | GIFT
  resultId    String?   // UserCoupon ID nếu là voucher
  
  createdAt   DateTime  @default(now())
  
  @@index([userId])
  @@index([rewardId])
}
```

### 3.2 Cập nhật Model User

```prisma
model User {
  // ... existing fields ...
  
  // Loyalty System
  pointBalance    Int       @default(0)
  totalSpent      Float     @default(0)     // Tổng tiền đã chi
  memberTier      String    @default("BRONZE") // BRONZE | SILVER | GOLD | PLATINUM
  birthday        DateTime?
  
  // Relationships (thêm)
  userCoupons     UserCoupon[]
  pointHistory    PointHistory[]
}
```

### 3.3 Cập nhật Model Order

```prisma
model Order {
  // ... existing fields ...
  
  // Voucher đã áp dụng
  couponCode      String?
  couponDiscount  Float     @default(0)
  
  // Points
  pointsEarned    Int       @default(0)  // Điểm sẽ nhận
  pointsUsed      Int       @default(0)  // Điểm đã dùng để giảm
  pointsDiscount  Float     @default(0)  // Số tiền giảm từ điểm
}
```

---

## 4. API Endpoints

### 4.1 Coupon Management (Admin)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin/coupons` | Danh sách coupon (pagination, filter) |
| POST | `/api/admin/coupons` | Tạo coupon mới |
| GET | `/api/admin/coupons/:id` | Chi tiết coupon |
| PUT | `/api/admin/coupons/:id` | Cập nhật coupon |
| DELETE | `/api/admin/coupons/:id` | Xóa coupon |
| GET | `/api/admin/coupons/:id/usage` | Lịch sử sử dụng |
| POST | `/api/admin/coupons/generate-private` | Tạo mã private cho user |

### 4.2 Campaign Management (Admin)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/admin/campaigns` | Danh sách chiến dịch |
| POST | `/api/admin/campaigns` | Tạo chiến dịch |
| PUT | `/api/admin/campaigns/:id` | Cập nhật chiến dịch |
| DELETE | `/api/admin/campaigns/:id` | Xóa chiến dịch |

### 4.3 User Voucher Wallet

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/vouchers` | Voucher công khai có thể lưu |
| GET | `/api/my-vouchers` | Ví voucher của user |
| POST | `/api/my-vouchers/collect/:code` | Lưu voucher vào ví |
| POST | `/api/vouchers/validate` | Validate mã khi checkout |
| POST | `/api/vouchers/apply` | Áp dụng mã (tính toán giảm) |

### 4.4 Loyalty Points

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/my-points` | Số dư điểm + Lịch sử |
| GET | `/api/rewards` | Danh sách quà đổi điểm |
| POST | `/api/rewards/:id/redeem` | Đổi điểm lấy quà |

### 4.5 Checkout Integration

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/checkout/calculate` | Tính tổng đơn + gợi ý voucher |
| POST | `/api/checkout/apply-voucher` | Áp dụng voucher vào đơn |
| POST | `/api/checkout/apply-points` | Dùng điểm để giảm |

---

## 5. Frontend Components

### 5.1 User-facing Components

```
frontend/src/components/
├── voucher/
│   ├── VoucherCard.tsx           # Card hiển thị 1 voucher
│   ├── VoucherWallet.tsx         # Trang Ví voucher của tôi
│   ├── VoucherCollectModal.tsx   # Modal nhập mã / lưu mã
│   ├── VoucherSelector.tsx       # Chọn voucher trong checkout
│   └── VoucherBanner.tsx         # Banner voucher trên homepage
├── loyalty/
│   ├── PointBalance.tsx          # Hiển thị số dư điểm
│   ├── PointHistory.tsx          # Lịch sử điểm
│   ├── MemberTierBadge.tsx       # Badge hạng thành viên
│   ├── RewardCatalog.tsx         # Kho quà đổi điểm
│   └── RewardRedeemModal.tsx     # Modal đổi quà
└── checkout/
    ├── DiscountSection.tsx       # Section voucher + điểm trong checkout
    └── OrderSummary.tsx          # Tổng kết đơn (đã có, cần update)
```

### 5.2 Dashboard Components (Admin)

```
frontend/src/components/dashboard/pages/
├── Coupons.tsx                   # Quản lý voucher
├── CouponForm.tsx                # Form tạo/sửa voucher
├── Campaigns.tsx                 # Quản lý chiến dịch
├── CampaignForm.tsx              # Form tạo/sửa chiến dịch
├── PointRewards.tsx              # Quản lý quà đổi điểm
└── CustomerLoyalty.tsx           # Xem điểm/hạng của khách
```

### 5.3 UI/UX Mockups

#### Voucher Card
```
┌────────────────────────────────────────────┐
│  🎫  GIẢM 50K                              │
│      ──────────────────                    │
│      Đơn tối thiểu 300K                    │
│                                            │
│      HSD: 31/01/2024        [Lưu mã]      │
└────────────────────────────────────────────┘
```

#### Voucher Selector (Checkout)
```
┌────────────────────────────────────────────┐
│  🎟️ Mã giảm giá                      [-]   │
├────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐  │
│  │ 🔥 NEWUSER50K         -50,000đ   ✓  │  │
│  │    Giảm 50K cho thành viên mới       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 📦 FREESHIP           -30,000đ      │  │
│  │    Miễn phí vận chuyển đơn 500K     │  │
│  │    ⚠️ Đơn chưa đủ 500K              │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [Nhập mã khác...]                         │
└────────────────────────────────────────────┘
```

#### Point Balance Widget
```
┌────────────────────────────────────────────┐
│  💎 HẠNG VÀNG                              │
│                                            │
│       1,250 điểm                           │
│       ≈ 125,000đ                           │
│                                            │
│  Tích lũy: 5,200,000đ / 10,000,000đ        │
│  ░░░░░░░░░░░░░░▓▓▓▓▓▓▓ 52%                │
│                                            │
│  [Đổi điểm]  [Xem lịch sử]                │
└────────────────────────────────────────────┘
```

---

## 6. Kịch bản Nghiệp vụ

### 6.1 Voucher cho User mới (Auto-assign)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  User đăng  │────►│  Backend    │────►│ UserCoupon  │
│  ký xong    │     │  Event      │     │ Created     │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │ Coupon:     │
                    │ NEWUSER50K  │
                    │ (isSystem)  │
                    └─────────────┘
```

**Backend Logic:**
```typescript
// Sau khi register thành công
await prisma.userCoupon.create({
  data: {
    userId: newUser.id,
    couponId: NEW_USER_COUPON_ID, // System coupon
    expiresAt: addDays(new Date(), 30),
    source: 'SYSTEM',
  },
});
```

### 6.2 Flash Sale / Black Friday

```
User A: Bấm "Lưu mã" trên banner
  └─► POST /api/my-vouchers/collect/BLACKFRIDAY
        └─► Check: quantity > usedCount?
              └─► YES: Tạo UserCoupon

User B: Không lưu, nhập tay khi checkout
  └─► POST /api/vouchers/validate { code: "BLACKFRIDAY" }
        └─► Check: còn slot không?
              └─► Apply trực tiếp (không tạo UserCoupon)
```

### 6.3 Tích điểm từ Đơn hàng

```
Order Status: PENDING → DELIVERED
              │
              ▼
        ┌─────────────────────────────────────┐
        │ Event: order.delivered              │
        │                                     │
        │ Calculate points:                   │
        │ - Base: totalAmount / 10000         │
        │ - Tier bonus: x1.5 (SILVER)         │
        │ - Birthday bonus: x2 (if birthday)  │
        │                                     │
        │ Result: 150 points                  │
        └─────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ Update User.pointBalance += 150    │
        │ Create PointHistory                 │
        │ Check tier upgrade                  │
        └─────────────────────────────────────┘
```

### 6.4 Đổi điểm lấy Voucher

```
User: Bấm "Đổi" Voucher 50K (500 điểm)
  │
  ▼
┌─────────────────────────────────────────────┐
│ POST /api/rewards/:id/redeem                │
│                                             │
│ 1. Check: user.pointBalance >= 500?         │
│ 2. Trừ điểm: pointBalance -= 500            │
│ 3. Tạo PointHistory (type: BURN)            │
│ 4. Tạo UserCoupon từ reward template        │
│ 5. Return: Voucher đã vào ví                │
└─────────────────────────────────────────────┘
```

### 6.5 Auto-apply Voucher tốt nhất (Checkout)

```
User vào trang Checkout
  │
  ▼
GET /api/checkout/calculate
  │
  ├─► Lấy danh sách UserCoupon (status: AVAILABLE)
  │
  ├─► Với mỗi coupon, kiểm tra:
  │     - Còn hiệu lực?
  │     - Đủ điều kiện minOrderValue?
  │     - Product/Category phù hợp?
  │
  ├─► Tính discountAmount cho mỗi coupon hợp lệ
  │
  └─► Sort by discountAmount DESC
        │
        ▼
  Return: {
    applicableVouchers: [...],
    bestVoucher: { code: "NEWUSER50K", discount: 50000 },
    suggestedVoucher: bestVoucher // Auto-select
  }
```

---

## 7. Implementation Roadmap

### Phase 1: Database & Core API (2-3 ngày)
- [ ] Thêm schema Prisma (Campaign, Coupon, UserCoupon, PointHistory, PointReward)
- [ ] Update User model (pointBalance, totalSpent, memberTier, birthday)
- [ ] Update Order model (couponCode, couponDiscount, pointsEarned, pointsUsed)
- [ ] Run migration
- [ ] Seed data: Tạo coupon NEWUSER mặc định

### Phase 2: Admin CRUD (2 ngày)
- [ ] API: CRUD Coupons
- [ ] API: CRUD Campaigns
- [ ] API: CRUD Point Rewards
- [ ] Dashboard: Trang quản lý Voucher
- [ ] Dashboard: Trang quản lý Chiến dịch
- [ ] Dashboard: Trang quản lý Kho quà

### Phase 3: User Voucher Wallet (2 ngày)
- [ ] API: GET /api/vouchers (public)
- [ ] API: GET /api/my-vouchers (user's wallet)
- [ ] API: POST /api/my-vouchers/collect/:code
- [ ] Frontend: Trang Ví voucher
- [ ] Frontend: Component VoucherCard
- [ ] Frontend: Banner voucher trên Homepage

### Phase 4: Checkout Integration (2-3 ngày)
- [ ] API: POST /api/vouchers/validate
- [ ] API: POST /api/checkout/calculate (gợi ý voucher)
- [ ] Update Checkout page: Section chọn voucher
- [ ] Update Order creation: Lưu couponCode, tính discount
- [ ] Update UserCoupon status sau khi order thành công

### Phase 5: Loyalty Points (2-3 ngày)
- [ ] API: GET /api/my-points
- [ ] API: GET /api/rewards
- [ ] API: POST /api/rewards/:id/redeem
- [ ] Event handler: Cộng điểm khi order DELIVERED
- [ ] Event handler: Cộng điểm khi review APPROVED
- [ ] Frontend: Widget điểm + hạng thành viên
- [ ] Frontend: Trang Kho quà

### Phase 6: Auto-assign & Events (1-2 ngày)
- [ ] Event: Tự động tặng voucher khi user đăng ký
- [ ] Event: Kiểm tra nâng hạng thành viên
- [ ] Event: Voucher sinh nhật (cron job)
- [ ] Notification: Thông báo khi nhận voucher/điểm

### Phase 7: Testing & Polish (1-2 ngày)
- [ ] Unit tests cho Coupon validation logic
- [ ] E2E test: Checkout flow với voucher
- [ ] Performance test: Nhiều user apply cùng lúc
- [ ] UI/UX polish

---

## 8. Ước tính Thời gian

| Phase | Thời gian | Priority |
|-------|-----------|----------|
| Phase 1: Database & Core | 2-3 ngày | 🔴 Critical |
| Phase 2: Admin CRUD | 2 ngày | 🔴 Critical |
| Phase 3: Voucher Wallet | 2 ngày | 🟡 High |
| Phase 4: Checkout Integration | 2-3 ngày | 🔴 Critical |
| Phase 5: Loyalty Points | 2-3 ngày | 🟡 High |
| Phase 6: Auto Events | 1-2 ngày | 🟢 Medium |
| Phase 7: Testing | 1-2 ngày | 🟡 High |
| **TỔNG** | **12-17 ngày** | |

---

## 9. Rủi ro & Giải pháp

| Rủi ro | Giải pháp |
|--------|-----------|
| Race condition khi nhiều user dùng cùng mã | Dùng database transaction + optimistic locking |
| Fraud: User tạo nhiều account lấy mã new user | Limit theo IP/Device fingerprint |
| Performance: Query phức tạp khi validate | Cache điều kiện coupon, index hợp lý |
| Complexity: Logic conditions JSON | Tạo CouponConditionEngine riêng, unit test kỹ |

---

## 10. Approval Checklist

- [ ] **Product Owner** review nghiệp vụ
- [ ] **Tech Lead** review kiến trúc
- [ ] **QA** review test cases
- [ ] **Security** review fraud prevention

---

**Tạo bởi**: Droid AI  
**Ngày**: 2026-01-09  
**Version**: 1.0

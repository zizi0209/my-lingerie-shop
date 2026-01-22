# Kế hoạch Hệ thống Đánh giá Sản phẩm (Review System)

## 1. Tổng quan

Xây dựng hệ thống đánh giá sản phẩm chuẩn doanh nghiệp với các tính năng:
- Verified Purchase (xác thực đã mua hàng)
- Fit Feedback (độ vừa vặn - đặc thù lingerie)
- Media Upload (ảnh/video thực tế)
- Moderation (kiểm duyệt)
- Shop Reply (shop trả lời)
- Helpful votes (đánh giá hữu ích)

---

## 2. Prisma Schema

### 2.1 Model Review (Mới)

```prisma
// ĐÁNH GIÁ SẢN PHẨM
model Review {
  id          Int      @id @default(autoincrement())
  
  // Relationships
  productId   Int
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId      Int
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderId     Int?                    // Liên kết đơn hàng (để verify)
  order       Order?   @relation(fields: [orderId], references: [id])
  
  // Core Review
  rating      Int                     // 1-5 sao
  title       String?                 // Tiêu đề (optional)
  content     String   @db.Text       // Nội dung đánh giá
  
  // Product Context (Snapshot)
  variantName String?                 // "Màu Đỏ, Size M" - snapshot tại thời điểm mua
  
  // Lingerie Specific
  fitType     String?                 // SMALL | TRUE_TO_SIZE | LARGE
  
  // Verification
  isVerified  Boolean  @default(false) // Đã mua hàng thật
  
  // Media
  images      ReviewImage[]
  
  // Moderation
  status      String   @default("PENDING") // PENDING | APPROVED | REJECTED | HIDDEN
  
  // Shop Reply
  reply       String?  @db.Text
  repliedAt   DateTime?
  repliedBy   Int?                    // Admin ID đã trả lời
  
  // Interaction
  helpfulCount Int     @default(0)    // Số lượt "Hữu ích"
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([productId, userId, orderId]) // 1 user chỉ review 1 lần/order/product
  @@index([productId, status])
  @@index([userId])
  @@index([status, createdAt])
  @@index([rating])
}

// ẢNH ĐÁNH GIÁ
model ReviewImage {
  id        Int      @id @default(autoincrement())
  url       String
  reviewId  Int
  review    Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  
  @@index([reviewId])
}

// HELPFUL VOTES (Theo dõi ai đã vote)
model ReviewHelpful {
  id        Int      @id @default(autoincrement())
  reviewId  Int
  visitorId String   // sessionId hoặc visitorId (cho cả guest)
  userId    Int?     // Nếu đã đăng nhập
  createdAt DateTime @default(now())
  
  @@unique([reviewId, visitorId])
  @@index([reviewId])
}
```

### 2.2 Cập nhật Model Product

```prisma
model Product {
  // ... existing fields ...
  
  // Denormalized Review Stats (Performance)
  ratingAverage  Float   @default(0)   // Điểm trung bình (4.8)
  reviewCount    Int     @default(0)   // Tổng số review approved
  
  // Relation
  reviews        Review[]
}
```

### 2.3 Cập nhật Model User

```prisma
model User {
  // ... existing fields ...
  
  reviews  Review[]
}
```

### 2.4 Cập nhật Model Order

```prisma
model Order {
  // ... existing fields ...
  
  reviews  Review[]
}
```

---

## 3. API Endpoints

### 3.1 Public APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/products/:slug/reviews` | Lấy danh sách reviews (approved) |
| GET | `/products/:slug/reviews/stats` | Thống kê: rating distribution, fit feedback |
| POST | `/reviews/:id/helpful` | Vote "Hữu ích" |

### 3.2 User APIs (Authenticated)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/reviews` | Tạo review mới |
| PUT | `/reviews/:id` | Sửa review của mình |
| DELETE | `/reviews/:id` | Xóa review của mình |
| GET | `/users/me/reviews` | Xem reviews đã viết |
| GET | `/users/me/pending-reviews` | Sản phẩm chờ đánh giá |

### 3.3 Admin APIs

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/admin/reviews` | Danh sách reviews (all status) |
| PUT | `/admin/reviews/:id/status` | Approve/Reject review |
| PUT | `/admin/reviews/:id/reply` | Shop trả lời review |
| DELETE | `/admin/reviews/:id` | Xóa review |

---

## 4. Business Logic

### 4.1 Tạo Review (POST /reviews)

```typescript
// Pseudo-code
async function createReview(userId, data) {
  // 1. Kiểm tra user đã mua sản phẩm chưa
  const purchasedOrder = await findCompletedOrder(userId, data.productId);
  
  // 2. Kiểm tra đã review chưa (với order này)
  const existingReview = await findExistingReview(userId, data.productId, purchasedOrder?.id);
  if (existingReview) throw new Error("Bạn đã đánh giá sản phẩm này");
  
  // 3. Tạo review
  const review = await prisma.review.create({
    data: {
      ...data,
      userId,
      orderId: purchasedOrder?.id || null,
      isVerified: !!purchasedOrder,
      variantName: getVariantSnapshot(purchasedOrder, data.productId),
      status: autoModerate(data.content) ? "APPROVED" : "PENDING"
    }
  });
  
  // 4. Nếu auto-approved -> Cập nhật stats
  if (review.status === "APPROVED") {
    await updateProductRatingStats(data.productId);
  }
  
  return review;
}
```

### 4.2 Cập nhật Rating Stats

```typescript
async function updateProductRatingStats(productId: number) {
  const stats = await prisma.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { id: true }
  });
  
  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAverage: stats._avg.rating || 0,
      reviewCount: stats._count.id
    }
  });
}
```

### 4.3 Auto-Moderation (Basic)

```typescript
function autoModerate(content: string): boolean {
  const badWords = ["spam", "quảng cáo", "xxx", ...];
  const lowerContent = content.toLowerCase();
  
  // Reject nếu có từ nhạy cảm
  if (badWords.some(word => lowerContent.includes(word))) {
    return false; // -> PENDING
  }
  
  // Có thể thêm AI moderation sau
  return true; // -> APPROVED
}
```

---

## 5. Response Format

### 5.1 GET /products/:slug/reviews

```json
{
  "success": true,
  "data": {
    "stats": {
      "average": 4.6,
      "total": 127,
      "distribution": {
        "5": 89,
        "4": 25,
        "3": 8,
        "2": 3,
        "1": 2
      },
      "fitFeedback": {
        "SMALL": 15,
        "TRUE_TO_SIZE": 95,
        "LARGE": 17
      },
      "verifiedCount": 112
    },
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "title": "Sản phẩm tuyệt vời!",
        "content": "Chất liệu mềm mại, form đẹp...",
        "variantName": "Màu Đen, Size M",
        "fitType": "TRUE_TO_SIZE",
        "isVerified": true,
        "images": [
          { "id": 1, "url": "https://..." }
        ],
        "helpfulCount": 23,
        "reply": "Cảm ơn bạn đã ủng hộ shop!",
        "repliedAt": "2024-01-15T10:30:00Z",
        "user": {
          "name": "Nguyễn T***",
          "avatar": null
        },
        "createdAt": "2024-01-10T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 127,
      "pages": 13
    }
  }
}
```

---

## 6. Frontend Components

### 6.1 Trang chi tiết sản phẩm

```
┌─────────────────────────────────────────────────────┐
│  ⭐⭐⭐⭐⭐ 4.6 (127 đánh giá)                      │
├─────────────────────────────────────────────────────┤
│  Rating Distribution          │  Độ vừa vặn         │
│  ⭐⭐⭐⭐⭐ ████████████ 89   │  Chật |===●=====| Rộng│
│  ⭐⭐⭐⭐   ████         25   │  75% nói chuẩn form  │
│  ⭐⭐⭐     ██           8    │                      │
│  ⭐⭐       █            3    │                      │
│  ⭐         █            2    │                      │
├─────────────────────────────────────────────────────┤
│  [Tất cả] [Có hình ảnh] [Đã mua hàng] [5⭐] [4⭐]...│
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ Nguyễn T*** ⭐⭐⭐⭐⭐  ✓ Đã mua hàng           ││
│  │ Màu Đen, Size M  •  Chuẩn form                 ││
│  │                                                 ││
│  │ "Chất liệu mềm mại, form đẹp lắm!"             ││
│  │                                                 ││
│  │ [📷] [📷] [📷]                                 ││
│  │                                                 ││
│  │ 👍 23 người thấy hữu ích  •  10/01/2024        ││
│  │ ─────────────────────────────────────────────  ││
│  │ 🏪 Shop: Cảm ơn bạn đã ủng hộ!                 ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 6.2 Form viết đánh giá

```
┌─────────────────────────────────────────────────────┐
│  Đánh giá sản phẩm: Áo lót ren đen                  │
│  Phân loại đã mua: Màu Đen, Size M                  │
├─────────────────────────────────────────────────────┤
│  Chất lượng sản phẩm                               │
│  ☆ ☆ ☆ ☆ ☆                                        │
├─────────────────────────────────────────────────────┤
│  Độ vừa vặn                                        │
│  ○ Chật hơn mô tả                                  │
│  ● Chuẩn form                                      │
│  ○ Rộng hơn mô tả                                  │
├─────────────────────────────────────────────────────┤
│  Tiêu đề (tùy chọn)                                │
│  ┌─────────────────────────────────────────────────┐│
│  │ Sản phẩm tuyệt vời!                            ││
│  └─────────────────────────────────────────────────┘│
│  Nội dung đánh giá *                               │
│  ┌─────────────────────────────────────────────────┐│
│  │ Chất liệu mềm mại, form đẹp...                 ││
│  │                                                 ││
│  └─────────────────────────────────────────────────┘│
│  Thêm hình ảnh (tối đa 5)                          │
│  [+] [📷] [📷]                                     │
├─────────────────────────────────────────────────────┤
│                              [Hủy]  [Gửi đánh giá] │
└─────────────────────────────────────────────────────┘
```

---

## 7. Phân chia Task

### Phase 1: Backend Core
- [ ] Cập nhật Prisma schema (Review, ReviewImage, ReviewHelpful)
- [ ] Migration database
- [ ] API: GET /products/:slug/reviews
- [ ] API: GET /products/:slug/reviews/stats
- [ ] API: POST /reviews (create)
- [ ] Logic: updateProductRatingStats

### Phase 2: Backend Advanced
- [ ] API: PUT /reviews/:id (edit own)
- [ ] API: DELETE /reviews/:id (delete own)
- [ ] API: POST /reviews/:id/helpful
- [ ] API: GET /users/me/pending-reviews

### Phase 3: Admin APIs
- [ ] API: GET /admin/reviews (với filter status)
- [ ] API: PUT /admin/reviews/:id/status
- [ ] API: PUT /admin/reviews/:id/reply

### Phase 4: Frontend - Product Detail
- [ ] Component: ReviewStats (rating distribution, fit feedback)
- [ ] Component: ReviewList (với filter, pagination)
- [ ] Component: ReviewCard (single review)
- [ ] Component: ReviewImageGallery

### Phase 5: Frontend - User
- [ ] Component: WriteReviewForm
- [ ] Page: Sản phẩm chờ đánh giá
- [ ] Page: Reviews đã viết

### Phase 6: Frontend - Admin
- [ ] Page: Danh sách reviews (moderation)
- [ ] Modal: Reply review

---

## 8. Database Migration

```bash
# Sau khi cập nhật schema.prisma
npx prisma migrate dev --name add_review_system
npx prisma generate
```

---

## 9. Lưu ý bảo mật

1. **Rate Limiting**: Giới hạn số review/user/ngày
2. **Spam Detection**: Kiểm tra nội dung trùng lặp
3. **Image Validation**: Chỉ chấp nhận ảnh, giới hạn size
4. **XSS Prevention**: Sanitize content trước khi hiển thị
5. **Privacy**: Ẩn 1 phần tên user (Nguyễn T***)

---

## 10. Metrics cần theo dõi

- Tỷ lệ review/order (target: >10%)
- Tỷ lệ review có ảnh
- Thời gian duyệt review trung bình
- Rating trung bình theo category
- Conversion rate từ review (click review -> add to cart)

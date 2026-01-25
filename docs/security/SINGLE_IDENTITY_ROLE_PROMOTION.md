# Single Identity Principle với Role Promotion Policy

## 📋 Tổng Quan

Tài liệu này mô tả chính sách **Single Identity Principle** (Nguyên tắc Định danh Duy nhất) và **Role Promotion Workflow** (Quy trình Nâng cấp Vai trò) trong hệ thống Lingerie Shop.

**Nguyên tắc cốt lõi:** 1 Email = 1 User Account = 1 Identity

---

## 🎯 Mục Đích

### Tại sao Single Identity?

1. **Data Integrity** (Toàn vẹn dữ liệu)
   - Giữ nguyên lịch sử mua hàng, đánh giá, điểm thưởng
   - Không mất dữ liệu khi thay đổi vai trò
   - Audit trail liên tục, không bị phân mảnh

2. **User Experience** (Trải nghiệm người dùng)
   - Nhân viên không cần nhớ 2 email riêng biệt
   - Thuận tiện cho nhân viên vừa làm việc vừa mua hàng
   - Không cần tạo lại account khi được promote

3. **Compliance** (Tuân thủ quy định)
   - GDPR: Quyền truy cập dữ liệu cá nhân (1 identity = 1 data subject)
   - SOC 2: Audit trail không bị gián đoạn
   - Enterprise IAM standards: Single source of truth

---

## 🏗️ Kiến Trúc Hệ Thống

### Database Model: Single Role Model

```prisma
model User {
  id       Int   @id @default(autoincrement())
  email    String @unique              // ← 1 email duy nhất
  roleId   Int?                        // ← Chỉ 1 role tại 1 thời điểm

  // Customer data (preserved khi promote)
  orders          Order[]
  reviews         Review[]
  pointBalance    Int @default(0)
  totalSpent      Float @default(0)
  memberTier      String @default("BRONZE")
  wishlistItems   WishlistItem[]
  cart            Cart?

  role Role? @relation(fields: [roleId], references: [id])
}
```

**Không phải Many-to-Many** - Một user chỉ có 1 role duy nhất tại 1 thời điểm.

### Role Hierarchy

```
SUPER_ADMIN (highest privilege)
    ↓
  ADMIN
    ↓
  USER (customer)
```

---

## 🔄 Role Promotion Workflow

### Scenario: Promote USER → ADMIN

#### 1. Detection Phase (Phát hiện)

**Endpoint:** `POST /api/admin/users`

```typescript
// Super Admin nhập email: employee@shop.com
// Hệ thống check: Email này đã tồn tại?

const existingUser = await prisma.user.findFirst({
  where: { email: 'employee@shop.com', deletedAt: null },
  include: {
    role: true,
    orders: { select: { id: true }, take: 1 },
    reviews: { select: { id: true }, take: 1 },
    wishlistItems: { select: { id: true }, take: 1 }
  }
});

if (existingUser) {
  // ✅ Email tồn tại → Suggest promotion
}
```

#### 2. Suggestion Phase (Đề xuất)

**HTTP Status:** `409 Conflict` (not error, just conflict with suggestion)

**Response Structure:**

```json
{
  "error": "Email đã tồn tại trong hệ thống",
  "existingUser": {
    "id": 123,
    "name": "Nguyễn Văn A",
    "email": "employee@shop.com",
    "currentRole": "USER",
    "currentRoleId": 3,
    "isActive": true,
    "memberSince": "2024-01-15T08:00:00Z",
    "customerActivity": {
      "hasActivity": true,
      "orderCount": 5,
      "reviewCount": 2,
      "wishlistCount": 3,
      "pointBalance": 1500,
      "totalSpent": 2500000,
      "memberTier": "SILVER"
    }
  },
  "requestedRole": "ADMIN",
  "requestedRoleId": 2,
  "suggestion": "PROMOTE_ROLE",
  "message": "Tài khoản này đã có hoạt động mua sắm (5 đơn hàng, 1500 điểm). Nâng cấp lên ADMIN sẽ giữ nguyên toàn bộ lịch sử. Tiếp tục?"
}
```

#### 3. Confirmation Phase (Xác nhận)

**Frontend Action:**

```typescript
// Admin Dashboard shows confirmation dialog:
//
// ⚠️ Nâng cấp quyền tài khoản
//
// Tài khoản: Nguyễn Văn A (employee@shop.com)
// Vai trò hiện tại: USER
// Vai trò mới: ADMIN
//
// Hoạt động khách hàng:
// • 5 đơn hàng (Tổng: 2,500,000 VNĐ)
// • 2 đánh giá sản phẩm
// • 3 sản phẩm yêu thích
// • 1,500 điểm thưởng
// • Hạng thành viên: SILVER
//
// ⚠️ Lưu ý: Toàn bộ lịch sử mua hàng và điểm thưởng sẽ được giữ nguyên.
// Tài khoản sẽ được đăng xuất khỏi tất cả thiết bị và phải đăng nhập lại.
//
// [Hủy]  [Xác nhận nâng cấp]
```

#### 4. Promotion Phase (Thực hiện)

**Endpoint:** `PATCH /api/admin/users/:id/promote-role`

**Security Measures:**

```typescript
// Step 1: Validate permissions
// - Only SUPER_ADMIN can promote to ADMIN (Anti-Collusion)
// - Cannot promote SUPER_ADMIN (immutable)
// - Cannot promote yourself (prevent self-escalation)

// Step 2: Increment tokenVersion (invalidate old tokens)
await prisma.user.update({
  where: { id },
  data: {
    roleId: newRoleId,
    tokenVersion: { increment: 1 }
  }
});

// Step 3: Revoke all refresh tokens (force logout)
await revokeAllUserTokens(userId);

// Step 4: Audit log with customer context
await auditLog({
  action: 'PROMOTE_USER_ROLE',
  oldValue: { role: 'USER', roleId: 3 },
  newValue: {
    role: 'ADMIN',
    roleId: 2,
    preservedCustomerData: {
      orderCount: 5,
      pointBalance: 1500,
      totalSpent: 2500000,
      hadCustomerActivity: true
    }
  },
  severity: 'CRITICAL'
});

// Step 5: Email alert (if promoting to SUPER_ADMIN)
if (newRole === 'SUPER_ADMIN') {
  await sendSuperAdminCreationAlert(allSuperAdmins);
}
```

---

## 🔒 Security Considerations

### 1. Anti-Collusion Policy

**Rule:** Chỉ SUPER_ADMIN mới có quyền promote lên ADMIN hoặc SUPER_ADMIN

**Lý do:**
- Ngăn ADMIN tạo ADMIN khác để thông đồng (collusion)
- Đảm bảo chỉ highest authority mới cấp administrative privileges

**Code:**

```typescript
// users.ts:1110-1115
if ((newRole.name === 'ADMIN' || newRole.name === 'SUPER_ADMIN') && !isSuperAdmin) {
  return res.status(403).json({
    error: 'Chỉ SUPER ADMIN mới có thể cấp quyền ADMIN/SUPER_ADMIN (Anti-Collusion Policy)'
  });
}
```

### 2. Session Invalidation

**Khi promote role:**
- ✅ `tokenVersion` increment → Tất cả JWT tokens cũ invalid
- ✅ Revoke all refresh tokens → Force logout khỏi tất cả devices
- ✅ User phải đăng nhập lại → Token mới chứa role mới

**Tại sao quan trọng:**
- Token cũ chỉ chứa `role: 'USER'` trong payload
- Nếu không invalidate, user vẫn có token cũ với quyền thấp hơn
- Security vulnerability: Có thể dùng token cũ để bypass permission checks

### 3. Audit Trail

**Ghi lại:**
- Who: Super Admin thực hiện promotion
- What: Role cũ → Role mới
- When: Timestamp
- Where: IP address, User Agent
- Context: Customer activity data (orders, points, etc.)

**Mục đích:**
- Compliance: SOC 2, GDPR audit requirements
- Investigation: Trace back nếu có incident
- Transparency: Ai làm gì, khi nào, tại sao

---

## 📊 Data Preservation Policy

### Customer Data Được Giữ Nguyên

Khi USER được promote lên ADMIN, các dữ liệu sau **KHÔNG** bị xóa:

| Data Type | Description | Rationale |
|-----------|-------------|-----------|
| **Orders** | Lịch sử mua hàng | Nhân viên có quyền xem lại đơn hàng cá nhân |
| **Reviews** | Đánh giá sản phẩm | Review chân thực từ khách hàng thực |
| **Points** | Điểm thưởng loyalty | Nhân viên có thể tiếp tục tích điểm |
| **Wishlist** | Sản phẩm yêu thích | Personal preference không mất |
| **Cart** | Giỏ hàng | Có thể tiếp tục mua sắm |
| **Member Tier** | Hạng thành viên | BRONZE/SILVER/GOLD dựa trên totalSpent |

### Lý Do Giữ Data

1. **Single Identity Principle:** 1 người = 1 account = 1 dataset
2. **Data Integrity:** Xóa data = mất lịch sử = vi phạm GDPR
3. **Realistic Use Case:** Nhân viên shop thường là khách hàng trước khi làm việc
4. **Employee Benefit:** Nhân viên có thể mua với giá ưu đãi (employee discount)

---

## 🎯 Best Practices

### Cho Super Admin

**✅ DO:**
- Review customer activity trước khi promote
- Confirm với manager nếu account có nhiều orders (>10)
- Kiểm tra xem có phải nhân viên mới hay khách hàng cũ
- Document lý do promote trong internal notes

**❌ DON'T:**
- Promote random customer accounts lên admin
- Ignore warning về customer activity
- Skip confirmation dialog
- Promote without business justification

### Cho Admin có Customer History

**✅ DO:**
- Understand rằng own orders vẫn visible trong database
- Sử dụng filter "Exclude my orders" trong admin dashboard (nếu có)
- Maintain professional separation giữa admin work và personal shopping
- Report nếu thấy conflict of interest

**❌ DON'T:**
- Abuse admin privileges để modify own orders
- Give yourself discounts beyond employee policy
- Delete own reviews to manipulate product ratings
- Use admin dashboard để track own shopping habits

---

## 🔧 Implementation Reference

### Files Changed

**Backend:**
- `backend/src/routes/admin/users.ts:390-470` - Detection + Suggestion
- `backend/src/routes/admin/users.ts:1046-1230` - Promotion workflow
- `backend/src/middleware/requireAuth.ts:113-117` - Token version check

**Database:**
- `backend/prisma/schema.prisma` - User model với roleId (single role)

### API Endpoints

**1. Create User (với promotion suggestion):**
```http
POST /api/admin/users
Content-Type: application/json

{
  "email": "employee@shop.com",
  "name": "Nguyễn Văn A",
  "roleId": 2  // ADMIN
}

# Response nếu email tồn tại:
HTTP/1.1 409 Conflict
{
  "suggestion": "PROMOTE_ROLE",
  "existingUser": { ... },
  "customerActivity": { ... }
}
```

**2. Promote Role:**
```http
PATCH /api/admin/users/:id/promote-role
Content-Type: application/json

{
  "newRoleId": 2  // ADMIN
}

# Response:
HTTP/1.1 200 OK
{
  "success": true,
  "data": { ... },
  "message": "Đã nâng cấp quyền thành công. User cần đăng nhập lại.",
  "sessionInvalidated": true
}
```

---

## 📈 Metrics & Monitoring

### Audit Log Queries

**Xem tất cả role promotions:**
```sql
SELECT * FROM audit_logs
WHERE action = 'PROMOTE_USER_ROLE'
  AND severity = 'CRITICAL'
ORDER BY "createdAt" DESC;
```

**Tìm promotions có customer activity:**
```sql
SELECT * FROM audit_logs
WHERE action = 'PROMOTE_USER_ROLE'
  AND "newValue"->>'preservedCustomerData' IS NOT NULL
  AND ("newValue"->'preservedCustomerData'->>'hadCustomerActivity')::boolean = true;
```

**Statistics:**
```sql
SELECT
  COUNT(*) as total_promotions,
  COUNT(CASE WHEN ("newValue"->'preservedCustomerData'->>'hadCustomerActivity')::boolean = true THEN 1 END) as with_customer_data,
  AVG(("newValue"->'preservedCustomerData'->>'orderCount')::int) as avg_orders
FROM audit_logs
WHERE action = 'PROMOTE_USER_ROLE'
  AND "createdAt" >= NOW() - INTERVAL '30 days';
```

---

## ❓ FAQ

### Q1: Có nên tạo email admin riêng thay vì promote?

**A:** Tùy context:
- **Nếu là khách hàng lâu năm (>20 orders):** Recommend tạo email riêng
- **Nếu là nhân viên mới/ít orders (<5 orders):** Promote OK
- **Best practice:** Hỏi nhân viên họ muốn gì

### Q2: Admin có thể modify own customer orders không?

**A:** Về kỹ thuật: Có thể (database không block)
**Về policy:** KHÔNG được phép
**Solution:**
- Admin dashboard nên filter out own orders
- Audit log ghi lại mọi modification
- HR/Manager review audit logs định kỳ

### Q3: Điểm thưởng và member tier xử lý thế nào?

**A:** Giữ nguyên 100%
- Admin vẫn có point balance
- Admin vẫn có member tier (BRONZE/SILVER/GOLD)
- Admin có thể tiếp tục tích điểm khi mua hàng
- Points có thể dùng cho employee purchases

### Q4: Nếu admin bị demote về user thì sao?

**A:** Data vẫn preserved (symmetry)
- Role change: ADMIN → USER
- Orders, points, reviews giữ nguyên
- Session invalidated (same như promote)
- Audit log ghi lại với severity CRITICAL

### Q5: Multi-role có tốt hơn không? (1 user có nhiều roles)

**A:** Không, với context lingerie shop:
- **Over-engineering:** Không cần complexity
- **Permission conflict:** User role + Admin role = confusing
- **Audit complexity:** Khó track "ai làm gì với vai trò nào"
- **Single role = Simple = Maintainable**

---

## 🔐 Security Checklist

Trước khi promote USER → ADMIN:

- [ ] Verify đây là nhân viên thực sự (không phải random customer)
- [ ] Review customer activity (orders, points, reviews)
- [ ] Confirm với manager nếu có nhiều orders
- [ ] Check email domain (@company.com vs @gmail.com)
- [ ] Ensure Anti-Collusion policy (chỉ SUPER_ADMIN promote)
- [ ] Confirm user sẽ bị logout và phải login lại
- [ ] Verify audit log sẽ ghi lại đầy đủ context
- [ ] Check email alert sẽ được gửi (nếu promote lên SUPER_ADMIN)

---

## 📚 References

- **OWASP:** [Identity and Access Management Cheat Sheet](https://cheatsheetseries.owasp.org/)
- **NIST:** [Digital Identity Guidelines (SP 800-63)](https://pages.nist.gov/800-63-3/)
- **GDPR:** Article 15 (Right of Access), Article 5 (Data Minimization)
- **SOC 2:** CC6.1 (Logical Access Controls), CC7.2 (System Monitoring)

---

**Last Updated:** 2026-01-25
**Version:** 1.0
**Maintainer:** Engineering Team

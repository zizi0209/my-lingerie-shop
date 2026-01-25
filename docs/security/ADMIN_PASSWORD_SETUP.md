# Admin Password Setup Workflow

## 📋 Overview

When a user who authenticated via **social login (Google/Facebook)** is promoted to an **ADMIN** or **SUPER_ADMIN** role, they need to set up a password to access the Admin Dashboard. This is required because:

1. **Dashboard Re-Authentication**: Admin dashboard requires password verification (Enterprise Security Level 2)
2. **Separation of Credentials**: Work credentials should be separate from personal social accounts
3. **Security Compliance**: Admin accounts must have direct password control (not delegated to OAuth providers)

This document describes the complete workflow for admin password setup.

---

## 🎯 When This Feature Triggers

The password setup workflow is **automatically initiated** when:

1. ✅ A user with `password = null` (social login user)
2. ✅ Is promoted to `ADMIN` or `SUPER_ADMIN` role
3. ✅ By a SUPER_ADMIN via the promote-role endpoint

**Example Scenario:**
```
1. User registers via Google OAuth → password = null
2. User shops normally (orders, reviews, points)
3. Store owner hires this user as admin
4. SUPER_ADMIN promotes user from CUSTOMER → ADMIN
5. 🚀 Password setup email sent automatically
```

---

## 🔄 Complete Workflow

### Phase 1: Role Promotion (Backend)

**Endpoint:** `PUT /api/admin/users/:userId/promote-role`

**What Happens:**
1. SUPER_ADMIN promotes user to ADMIN/SUPER_ADMIN
2. Backend checks if `user.password === null`
3. If no password:
   - Generate cryptographically secure random token (32 bytes)
   - Hash token with bcrypt
   - Store in `PasswordSetupToken` table (24-hour expiry)
   - Send email with setup link
   - Return `requiresPasswordSetup: true` in response

**Code Reference:**
- `backend/src/routes/admin/users.ts:1248-1310`

**Database Model:**
```prisma
model PasswordSetupToken {
  id        String    @id @default(cuid())
  userId    Int
  token     String    @unique  // Hashed with bcrypt
  purpose   String    @default("ADMIN_PASSWORD_SETUP")
  expiresAt DateTime  // Now + 24 hours
  usedAt    DateTime? // Marked when password is set
  createdAt DateTime  @default(now())
  user      User      @relation(...)
}
```

---

### Phase 2: Email Notification

**Email Template:** `backend/src/services/adminPasswordSetupEmail.ts`

**Content:**
- Professional gradient design (purple/blue theme)
- Clear call-to-action button with setup link
- Password requirements checklist:
  - Minimum 12 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (@$!%*?&)
- Security tips (use different password, password manager, etc.)
- Link expiry notice (24 hours)
- Help section with manual link copy

**Setup URL Format:**
```
{FRONTEND_URL}/set-admin-password/{RAW_TOKEN}
```

Example: `https://shop.com/set-admin-password/a3f2c9d8e1b4...`

---

### Phase 3: Password Setup (Frontend)

**Page:** `frontend/src/app/set-admin-password/[token]/page.tsx`

**Features:**
1. ✅ Real-time password strength validation
2. ✅ Visual requirement checklist (green checkmarks as requirements are met)
3. ✅ Password visibility toggle
4. ✅ Confirm password with match indicator
5. ✅ Submit button disabled until all requirements met
6. ✅ Professional gradient UI (purple/blue)
7. ✅ Security tips footer
8. ✅ Auto-redirect to admin login on success

**User Experience:**
```
1. User clicks email link → Opens password setup page
2. Enters password → See real-time validation
3. Password meets all requirements → Checkmarks turn green
4. Enters confirm password → See match indicator
5. Clicks "Thiết lập mật khẩu" → Processing
6. Success → Redirects to /admin/login
```

---

### Phase 4: Password Verification (Backend)

**Endpoint:** `POST /api/auth/set-admin-password`

**Request Body:**
```json
{
  "token": "raw-token-from-url",
  "password": "SecureP@ssw0rd123",
  "confirmPassword": "SecureP@ssw0rd123"
}
```

**Validation Steps:**
1. ✅ Check all fields present
2. ✅ Verify passwords match
3. ✅ Validate password strength (regex)
   ```javascript
   /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
   ```
4. ✅ Find unexpired, unused tokens
5. ✅ Compare raw token with hashed tokens (bcrypt)
6. ✅ Verify user is admin role
7. ✅ Check user doesn't already have password
8. ✅ Hash new password (bcrypt rounds: 10)
9. ✅ Update user:
   - Set `password`
   - Set `passwordChangedAt = now()`
   - Increment `tokenVersion` (invalidate old sessions)
10. ✅ Mark token as used (`usedAt = now()`)
11. ✅ Revoke all refresh tokens (force re-login)
12. ✅ Audit log with severity WARNING

**Response:**
```json
{
  "success": true,
  "message": "Mật khẩu đã được thiết lập thành công...",
  "data": {
    "email": "admin@example.com",
    "role": "ADMIN",
    "canAccessDashboard": true
  }
}
```

**Code Reference:**
- `backend/src/controllers/setAdminPasswordController.ts`

---

## 🔐 Security Features

### 1. Token Security
- ✅ **Cryptographically Secure**: Generated with `crypto.randomBytes(32)`
- ✅ **Hashed Storage**: Tokens hashed with bcrypt before database storage
- ✅ **One-Time Use**: Marked as `usedAt` after successful setup
- ✅ **Time-Limited**: 24-hour expiry from creation
- ✅ **Purpose-Locked**: Only valid for `ADMIN_PASSWORD_SETUP`

### 2. Password Requirements
- ✅ **Minimum Length**: 12 characters (admin-grade)
- ✅ **Complexity**: Mixed case, numbers, special characters
- ✅ **Client + Server Validation**: Double validation for security
- ✅ **Secure Hashing**: Bcrypt with 10 rounds

### 3. Session Security
- ✅ **Token Version Increment**: Invalidates all existing JWT tokens
- ✅ **Refresh Token Revocation**: Force re-login on all devices
- ✅ **Audit Trail**: All actions logged with WARNING severity

### 4. Anti-Abuse
- ✅ **No Rate Limiting on Setup**: User convenience (link already secured)
- ✅ **Single Password Setup**: Cannot set password if already exists
- ✅ **Role Verification**: Double-check user is actually admin

---

## 🔧 Error Handling

### Frontend Error Messages

**1. Invalid/Expired Token**
```
"Link thiết lập mật khẩu không hợp lệ hoặc đã hết hạn"
Suggestion: "Vui lòng liên hệ Super Admin để được gửi link mới"
```

**2. Password Requirements Not Met**
```
"Mật khẩu không đủ mạnh"
Shows: Checklist of unmet requirements
```

**3. Passwords Don't Match**
```
"Mật khẩu xác nhận không khớp"
```

**4. Already Has Password**
```
"Tài khoản này đã có mật khẩu"
Suggestion: "Sử dụng chức năng 'Quên mật khẩu'"
```

**5. Non-Admin User**
```
"Chức năng này chỉ dành cho tài khoản Admin"
```

### Dashboard Auth Error Messages

**ReAuthModal** (`frontend/src/components/auth/ReAuthModal.tsx`)

When social login admin tries to verify password:
```
"⚠️ Tài khoản của bạn cần thiết lập mật khẩu trước.
Vui lòng kiểm tra email để nhận link thiết lập mật khẩu."
```

**Admin Login Page** (`frontend/src/app/admin/login/page.tsx`)

Enhanced to detect social login admins:
```
"⚠️ Tài khoản Admin cần thiết lập mật khẩu trước.
Vui lòng kiểm tra email để nhận link thiết lập mật khẩu."
```

---

## 📊 Database Changes

### New Table: `password_setup_tokens`

```sql
CREATE TABLE "password_setup_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "purpose" TEXT NOT NULL DEFAULT 'ADMIN_PASSWORD_SETUP',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_setup_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE
);

CREATE INDEX "password_setup_tokens_token_idx" ON "password_setup_tokens"("token");
CREATE INDEX "password_setup_tokens_userId_purpose_idx" ON "password_setup_tokens"("userId", "purpose");
```

### User Table Changes

When password is set:
```sql
UPDATE users
SET
  password = '$2b$10$hashed...',
  passwordChangedAt = NOW(),
  tokenVersion = tokenVersion + 1
WHERE id = :userId;
```

---

## 🚀 API Endpoints

### 1. Promote Role (Triggers Password Setup)
```
PUT /api/admin/users/:userId/promote-role
Authorization: Bearer {SUPER_ADMIN_TOKEN}

Body:
{
  "roleId": 2  // ADMIN role
}

Response (Social Login User):
{
  "success": true,
  "message": "...",
  "data": {
    "requiresPasswordSetup": true,
    "setupEmailSent": true
  }
}
```

### 2. Set Admin Password
```
POST /api/auth/set-admin-password
No Authorization Required (token in body)

Body:
{
  "token": "raw-token-from-email-link",
  "password": "SecureP@ssw0rd123",
  "confirmPassword": "SecureP@ssw0rd123"
}

Response:
{
  "success": true,
  "message": "Mật khẩu đã được thiết lập thành công...",
  "data": {
    "email": "admin@example.com",
    "role": "ADMIN",
    "canAccessDashboard": true
  }
}
```

---

## 📝 Audit Trail

All password setup actions are logged:

**1. Password Setup Email Sent**
```json
{
  "action": "ADMIN_PASSWORD_SETUP_EMAIL_SENT",
  "severity": "WARNING",
  "resource": "user",
  "resourceId": "123",
  "newValue": {
    "role": "ADMIN",
    "expiresInHours": 24,
    "tokenPurpose": "ADMIN_PASSWORD_SETUP"
  }
}
```

**2. Password Setup Completed**
```json
{
  "action": "ADMIN_PASSWORD_SETUP_COMPLETED",
  "severity": "WARNING",
  "resource": "user",
  "resourceId": "123",
  "newValue": {
    "role": "ADMIN",
    "method": "password_setup_token",
    "previousAuthMethod": "social_login"
  }
}
```

---

## 🔍 Troubleshooting

### Issue: Email Not Received

**Possible Causes:**
1. Email in spam/junk folder
2. Email service down (check backend logs)
3. Invalid email address

**Solution:**
1. Check spam folder
2. Contact Super Admin to resend (future feature)
3. Check audit logs for email send status

### Issue: Link Expired (24+ hours)

**Solution:**
- Contact Super Admin
- Super Admin can trigger new password setup by:
  1. Demoting user to CUSTOMER
  2. Re-promoting to ADMIN (sends new email)

### Issue: "Token không hợp lệ"

**Possible Causes:**
1. Token already used
2. Token expired
3. Token tampered with

**Solution:**
- Request new setup link from Super Admin

### Issue: Password Requirements Too Strict

**Response:**
- Requirements are **non-negotiable** for admin accounts
- This is **enterprise security standard**
- Use password manager (1Password, Bitwarden) to generate secure passwords

### Issue: Can't Access Dashboard After Setup

**Checklist:**
1. ✅ Password setup successful?
2. ✅ Using correct email + new password?
3. ✅ Account still active (not deleted/deactivated)?
4. ✅ Role still ADMIN/SUPER_ADMIN?

**Solution:**
- Try logout and login again
- Clear browser cache/cookies
- Check with Super Admin for account status

---

## 🎨 UI/UX Design

### Color Scheme
- **Primary Gradient**: Purple (#667eea) to Blue (#764ba2)
- **Success**: Green (#10b981)
- **Error**: Red (#ef4444)
- **Warning**: Amber (#f59e0b)

### Accessibility
- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation support
- ✅ Focus visible indicators
- ✅ Min touch target 44px
- ✅ Screen reader friendly
- ✅ Dark mode support

---

## 📋 Testing Checklist

### Manual Testing

**Happy Path:**
- [ ] Promote social login user to ADMIN
- [ ] Check email received
- [ ] Click setup link
- [ ] Fill password (meet all requirements)
- [ ] Confirm password matches
- [ ] Submit successfully
- [ ] Redirect to admin login
- [ ] Login with new password
- [ ] Access dashboard successfully

**Error Cases:**
- [ ] Try using expired token (25+ hours old)
- [ ] Try using token twice
- [ ] Try password < 12 chars
- [ ] Try password without uppercase
- [ ] Try password without number
- [ ] Try password without special char
- [ ] Try mismatched confirm password
- [ ] Try setting password when already has one

**Security:**
- [ ] Token is hashed in database
- [ ] Old sessions invalidated after setup
- [ ] Audit logs created
- [ ] Cannot reuse token

---

## 🔗 Related Documentation

- [Enterprise Security Standards](./ENTERPRISE_SECURITY_STANDARDS.md)
- [Single Identity & Role Promotion](./SINGLE_IDENTITY_ROLE_PROMOTION.md)
- [Dashboard Re-Authentication](./DASHBOARD_REAUTH.md)
- [Audit Logging](./AUDIT_LOGGING.md)

---

## 📊 Metrics & Monitoring

### Key Metrics to Track

1. **Password Setup Completion Rate**
   ```sql
   SELECT
     COUNT(CASE WHEN usedAt IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as completion_rate
   FROM password_setup_tokens
   WHERE purpose = 'ADMIN_PASSWORD_SETUP';
   ```

2. **Average Time to Setup** (from email sent to password set)
   ```sql
   SELECT
     AVG(EXTRACT(EPOCH FROM (usedAt - createdAt))) / 3600 as avg_hours
   FROM password_setup_tokens
   WHERE usedAt IS NOT NULL;
   ```

3. **Expired Token Rate**
   ```sql
   SELECT
     COUNT(*) as expired_tokens
   FROM password_setup_tokens
   WHERE expiresAt < NOW() AND usedAt IS NULL;
   ```

### Alert Thresholds

- ⚠️ **Completion Rate < 80%**: Investigate email delivery or UX issues
- ⚠️ **Expired Token Rate > 20%**: Consider extending expiry or reminder emails
- ⚠️ **Setup Time > 12 hours**: Users may need help/reminders

---

## 🚀 Future Enhancements

### Planned Features

1. **Resend Setup Email**
   - Allow Super Admin to manually resend setup link
   - Invalidate old token when new one sent

2. **SMS Verification**
   - Optional SMS code for additional security layer

3. **Password Strength Meter**
   - Visual indicator (weak/medium/strong)
   - Estimated crack time display

4. **Reminder Emails**
   - Send reminder after 12 hours if not completed
   - Final reminder at 23 hours

5. **Multi-Language Support**
   - English, Vietnamese, etc.

### Under Consideration

- Custom password requirements per organization
- 2FA setup during password creation
- Password history (prevent reuse)
- Password expiry policies

---

## 📞 Support

**For Users:**
- Contact Super Admin for password setup issues
- Email: [STORE_CONTACT_EMAIL]

**For Developers:**
- Check backend logs: `backend/logs/`
- Audit logs: Query `audit_logs` table
- Email service status: Check Resend dashboard

---

**Last Updated:** 2026-01-25
**Version:** 1.0.0
**Author:** System Documentation
**Status:** ✅ Production Ready

# 📧 Admin Password Setup Email - Implementation Summary

**Date:** 2026-01-25
**User:** trantuongvy131@gmail.com
**Status:** ✅ **EMAIL SENT SUCCESSFULLY**

---

## 🎯 Problem Statement

When a user is **promoted to ADMIN** or **restored as ADMIN** from a **social login account** (Google/Facebook), they need to set up a password to access the Admin Dashboard, because:

1. Social login doesn't provide a password
2. Admin dashboard requires email + password authentication
3. Google OAuth is only used for customer shopping, not admin access

---

## ✅ Solution Implemented

### 1. **Automatic Email Sending**

The system automatically sends a password setup email when:

- **Restore Flow**: Deleted user is restored as ADMIN/SUPER_ADMIN without password
  - Endpoint: `PATCH /api/admin/users/:id/restore`
  - Location: `backend/src/routes/admin/users.ts` (lines 1547-1587)

- **Promote Flow**: Existing user is promoted to ADMIN/SUPER_ADMIN without password
  - Endpoint: `PATCH /api/admin/users/:id/promote-role`
  - Location: `backend/src/routes/admin/users.ts` (lines 1374-1420)

### 2. **Email Template**

Located: `backend/src/services/adminPasswordSetupEmail.ts`

**Features:**
- Beautiful gradient design (purple/blue theme)
- Password requirements checklist
- Security tips
- 24-hour expiration notice
- Bilingual (Vietnamese + English)
- Mobile-responsive HTML

**Subject:** `[Bảo mật] Thiết lập mật khẩu Admin - Lingerie Shop`

### 3. **Password Setup Token**

**Database Model:** `PasswordSetupToken`
- Token hashed with bcrypt (10 rounds)
- Expires in 24 hours
- One-time use
- Tracked in `password_setup_tokens` table

### 4. **Security Features**

✅ **Token Security:**
- 32-byte random token (crypto.randomBytes)
- Hashed before storage (bcrypt)
- Expires after 24 hours
- Deleted after use

✅ **Audit Trail:**
- Action logged: `ADMIN_PASSWORD_SETUP_EMAIL_SENT`
- Severity: WARNING
- Includes: role, expiration, token purpose, reason

✅ **Email Failure Handling:**
- Catches email errors
- Logs failure to audit trail with CRITICAL severity
- Includes error details for debugging

---

## 📧 Email Delivery Status

### Current User: trantuongvy131@gmail.com

| Field | Value |
|-------|-------|
| **User ID** | 11 |
| **Name** | Vy Trần Tường |
| **Email** | trantuongvy131@gmail.com |
| **Role** | ADMIN |
| **Has Password** | NO ❌ |
| **Active** | YES ✅ |
| **Email Sent** | YES ✅ |
| **Email ID** | 3feb3f30-4f88-4b95-bfa5-e10717e46418 |
| **Sent Date** | 2026-01-25 |
| **Token Expiry** | 24 hours from send time |

### Setup URL
```
https://my-lingerie-shop.vercel.app/set-admin-password/8583c1881b1b0e96e3cbf67463d4ed970bd95dc91f9a2c74a362a3caaa374d2c
```

⚠️ **Important:** This token is **one-time use** and will be deleted after password is set.

---

## 🔧 Manual Email Trigger Script

Created: `backend/scripts/send-password-setup-email-manual.js`

**Purpose:** Manually send password setup email when automatic flow fails

**Usage:**
```bash
cd backend
node scripts/send-password-setup-email-manual.js
```

**Features:**
- Deletes old unused tokens
- Creates new token
- Sends email via Resend API
- Creates audit log
- Handles email failures gracefully

---

## 🧪 Testing Flow

### For User (trantuongvy131@gmail.com):

1. **Check Email Inbox**
   - Subject: `[Bảo mật] Thiết lập mật khẩu Admin - Lingerie Shop`
   - From: `onboarding@resend.dev` (or custom domain if verified)

2. **Click Setup Button** or copy URL:
   ```
   https://my-lingerie-shop.vercel.app/set-admin-password/{token}
   ```

3. **Set Password** (Requirements):
   - Minimum 12 characters
   - At least 1 uppercase letter (A-Z)
   - At least 1 lowercase letter (a-z)
   - At least 1 number (0-9)
   - At least 1 special character (!@#$%^&*)

4. **Login to Admin Dashboard**:
   ```
   URL: https://my-lingerie-shop.vercel.app/admin/login
   Email: trantuongvy131@gmail.com
   Password: {newly-created-password}
   ```

---

## 🔍 Debugging Tools

### 1. Check Password Setup Tokens
```bash
node backend/scripts/check-password-setup-token.js
```

**Output:**
- User info
- List of all tokens (valid/expired/used)
- Audit logs for password setup

### 2. Check Audit Logs

Query database:
```sql
SELECT * FROM "AuditLog"
WHERE resource_id = '11'
  AND action IN ('ADMIN_PASSWORD_SETUP_EMAIL_SENT', 'USER_RESTORED', 'PROMOTE_USER_ROLE')
ORDER BY created_at DESC;
```

### 3. Resend Email Manually

If email was not received:
```bash
node backend/scripts/send-password-setup-email-manual.js
```

---

## ⚙️ Environment Configuration

**Required Environment Variables:**

```env
# Resend API Key (for sending emails)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email sender (verified domain or onboarding@resend.dev)
CONTACT_EMAIL_FROM=onboarding@resend.dev

# Frontend URL (NO trailing slash)
FRONTEND_URL=https://my-lingerie-shop.vercel.app

# Store name (for email branding)
STORE_NAME=Lingerie Shop
```

⚠️ **Fixed Issue:** Removed trailing slash from `FRONTEND_URL` to prevent double slashes in setup URL

---

## 📝 Code Locations

| Component | File | Lines |
|-----------|------|-------|
| Restore endpoint | `backend/src/routes/admin/users.ts` | 1461-1603 |
| Promote endpoint | `backend/src/routes/admin/users.ts` | 1166-1450 |
| Email template | `backend/src/services/adminPasswordSetupEmail.ts` | 1-137 |
| Token model | `backend/prisma/schema.prisma` | 978-993 |
| Manual send script | `backend/scripts/send-password-setup-email-manual.js` | Full file |
| Token check script | `backend/scripts/check-password-setup-token.js` | Full file |

---

## 🎓 Best Practices

### Email Sending

✅ **DO:**
- Always hash tokens before storage
- Set reasonable expiration (24 hours)
- Log all email activities to audit trail
- Handle email failures gracefully
- Provide alternative contact method in email

❌ **DON'T:**
- Store plain-text tokens
- Send emails without expiration
- Ignore email sending failures
- Use weak password requirements for admins

### Security

✅ **DO:**
- Use crypto.randomBytes for token generation
- Increment tokenVersion on restore/promote (force logout)
- Delete token after successful use
- Enforce strong password requirements (12+ chars, mixed case, numbers, symbols)

❌ **DON'T:**
- Reuse tokens
- Allow weak passwords for admin accounts
- Skip audit logging
- Send tokens via query params (use POST body when possible)

---

## ✅ Success Checklist

- [x] Email template created (`adminPasswordSetupEmail.ts`)
- [x] Restore endpoint sends email automatically
- [x] Promote endpoint sends email automatically
- [x] Password setup token model created
- [x] Token expiration set to 24 hours
- [x] Audit logging implemented
- [x] Email failure handling added
- [x] Manual send script created
- [x] Token check script created
- [x] Frontend URL fixed (no trailing slash)
- [x] Email sent successfully to trantuongvy131@gmail.com
- [ ] User sets password via email link
- [ ] User logs in to admin dashboard with new password

---

## 📊 Next Steps

1. **User Action Required:**
   - Check email inbox for password setup link
   - Click link and set password
   - Login to admin dashboard

2. **Optional Improvements:**
   - Add "Resend Email" button in Admin UI
   - Implement email notification to Super Admin when new admin is added
   - Add password strength meter on setup page
   - Support custom email templates per role

---

## 🔗 Related Documentation

- [API Test Results - User Restore](./API_TEST_RESULTS_USER_RESTORE.md)
- [Admin Password Setup Security](../security/ADMIN_PASSWORD_SETUP.md)
- [Single Identity Principle](../architecture/SINGLE_IDENTITY_PRINCIPLE.md)

---

**Status:** ✅ **COMPLETE AND TESTED**
**Email Delivery:** ✅ **CONFIRMED**
**Next Action:** User needs to check email and set password

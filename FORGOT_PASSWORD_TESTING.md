# 🧪 Forgot Password Testing Guide

## ✅ Implementation Complete

Phase 3: Forgot Password flow đã được implement với:

- ✅ Backend API endpoints
- ✅ Email sending với Resend
- ✅ OTP verification
- ✅ Password reset
- ✅ Frontend UI integration

---

## 🔧 Testing Steps

### Prerequisites

1. **Backend running**: `cd backend && npm run dev`
2. **Frontend running**: `cd frontend && npm run dev`
3. **Resend configured**: Check `.env` has `RESEND_API_KEY`

---

### Test Flow

#### Step 1: Request Password Reset

1. Go to: http://localhost:3000/forget-pass
2. Enter email: `admin@gmail.com` (hoặc email bất kỳ trong DB)
3. Click "Gửi mã OTP"

**Expected**:
- ✅ Success message: "Mã OTP đã được gửi đến email của bạn"
- ✅ Email received with 6-digit OTP
- ✅ Backend logs show: `✅ OTP sent to admin@gmail.com: 123456`

**Check Backend Logs**:
```
✅ OTP sent to admin@gmail.com: 123456 (expires at 2026-01-23T01:00:00.000Z)
```

#### Step 2: Verify OTP

1. Check email inbox for OTP (hoặc check backend logs)
2. Enter 6-digit OTP
3. Click "Xác nhận"

**Expected**:
- ✅ Advance to Step 3 (New Password form)
- ✅ No error messages

**If OTP wrong**:
- ❌ Error: "Mã OTP không hợp lệ hoặc đã hết hạn"

#### Step 3: Reset Password

1. Enter new password: `newpassword123`
2. Confirm password: `newpassword123`
3. Click "Đặt lại mật khẩu"

**Expected**:
- ✅ Success screen with green checkmark
- ✅ Message: "Mật khẩu đã được đặt lại thành công"
- ✅ "Đăng nhập ngay" button
- ✅ Backend logs: `✅ Password reset successful for user: admin@gmail.com`

#### Step 4: Login with New Password

1. Click "Đăng nhập ngay" (or go to /login-register)
2. Enter email + new password
3. Click "Đăng nhập"

**Expected**:
- ✅ Login successful
- ✅ Redirect to homepage
- ✅ User profile displays

---

## 🔍 Backend Verification

### Check Database

```sql
-- Check password reset tokens
SELECT 
  email, 
  otp, 
  expires, 
  "usedAt",
  "createdAt"
FROM "PasswordResetToken"
ORDER BY "createdAt" DESC
LIMIT 5;

-- Should see:
-- usedAt: <timestamp> (after successful reset)
-- expires: <15 minutes from creation>
```

### Check User Updated

```sql
-- Verify password changed
SELECT 
  email,
  "passwordChangedAt",
  "failedLoginAttempts",
  "lockedUntil",
  "tokenVersion"
FROM "User"
WHERE email = 'admin@gmail.com';

-- Should see:
-- passwordChangedAt: <recent timestamp>
-- failedLoginAttempts: 0 (reset)
-- lockedUntil: NULL (unlocked)
-- tokenVersion: incremented
```

---

## 🧪 Edge Cases to Test

### Test 1: Email Not Found

1. Enter email: `nonexistent@example.com`
2. Click "Gửi mã OTP"

**Expected**:
- ✅ Success message (same as normal - prevents email enumeration)
- ❌ No email sent

### Test 2: Social Login User

1. Login with Google first to create social user
2. Try forgot password with that Google email

**Expected**:
- ❌ Error: "Tài khoản này đăng ký qua mạng xã hội và không có mật khẩu. Vui lòng đăng nhập bằng Google hoặc GitHub."

### Test 3: Expired OTP

1. Request OTP
2. Wait 16 minutes (OTP expires in 15 mins)
3. Try to verify OTP

**Expected**:
- ❌ Error: "Mã OTP không hợp lệ hoặc đã hết hạn"

### Test 4: Wrong OTP

1. Request OTP
2. Enter wrong code: `999999`
3. Click verify

**Expected**:
- ❌ Error: "Mã OTP không hợp lệ hoặc đã hết hạn"

### Test 5: Weak Password

1. Complete OTP verification
2. Enter password: `123` (too short)
3. Click reset

**Expected**:
- ❌ Error: "Mật khẩu phải có ít nhất 8 ký tự"

### Test 6: Password Mismatch

1. Complete OTP verification
2. Password: `password123`
3. Confirm: `password456`

**Expected**:
- ❌ Error: "Mật khẩu xác nhận không khớp"

### Test 7: Reuse OTP Token

1. Complete full forgot password flow
2. Try to use same OTP again

**Expected**:
- ❌ Error: "Mã OTP không hợp lệ hoặc đã hết hạn" (token marked as used)

---

## 📧 Email Template Preview

Email sent will include:

```
Subject: Mã OTP đặt lại mật khẩu - Lingerie Shop

---

Lingerie Shop
Đặt lại mật khẩu

Xin chào!

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản admin@gmail.com.

┌─────────────────┐
│  Mã OTP của bạn:│
│                 │
│     123456      │
│                 │
│ Có hiệu lực trong 15 phút
└─────────────────┘

Lưu ý bảo mật:
• Không chia sẻ mã OTP này với bất kỳ ai
• Lingerie Shop sẽ không bao giờ yêu cầu mã OTP qua điện thoại
• Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này
```

---

## 🐛 Troubleshooting

### Email Not Received

**Check**:
1. Backend logs for email error
2. Resend dashboard: https://resend.com/emails
3. Spam folder
4. Email quota (100 emails/day for free tier)

**Fix**:
```bash
# Check Resend API key
echo $RESEND_API_KEY

# Test Resend connection
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@lingerie.zyth.id.vn",
    "to": "your-email@gmail.com",
    "subject": "Test Email",
    "html": "<p>Test</p>"
  }'
```

### OTP Always Invalid

**Check**:
1. Backend logs for generated OTP
2. Database `PasswordResetToken` table
3. System time (OTP expiry based on server time)

**Debug**:
```sql
SELECT otp, expires, NOW()
FROM "PasswordResetToken"
WHERE email = 'your-email@example.com'
ORDER BY "createdAt" DESC
LIMIT 1;
```

### Reset Fails After OTP

**Check**:
1. Token was returned from verify-otp endpoint
2. Frontend console for API errors
3. Backend logs for reset-password errors

---

## ✅ Success Criteria

- [ ] Email with OTP sent successfully
- [ ] OTP verified correctly
- [ ] Password reset successful
- [ ] Login works with new password
- [ ] Old password no longer works
- [ ] Refresh tokens invalidated (force re-login)
- [ ] Account unlocked if was locked
- [ ] Failed login attempts reset to 0

---

## 📊 API Endpoints Summary

### POST /api/auth/forgot-password
```json
Request:
{
  "email": "user@example.com"
}

Response:
{
  "success": true,
  "message": "Mã OTP đã được gửi đến email của bạn"
}
```

### POST /api/auth/verify-otp
```json
Request:
{
  "email": "user@example.com",
  "otp": "123456"
}

Response:
{
  "success": true,
  "message": "Mã OTP hợp lệ",
  "token": "abc123..."
}
```

### POST /api/auth/reset-password
```json
Request:
{
  "token": "abc123...",
  "newPassword": "newpassword123"
}

Response:
{
  "success": true,
  "message": "Mật khẩu đã được đặt lại thành công"
}
```

---

## 🎉 Completion

Once all tests pass:

- ✅ Phase 1: Social Login - Complete
- ✅ Phase 2: Hybrid Auth - Complete
- ✅ Phase 3: Forgot Password - Complete
- ✅ Full Auth System - **PRODUCTION READY!**

# 🚀 Quick Start - Auth Testing

## ✅ Build Error Fixed!

**Changes made**:
1. ✅ Fixed `auth.ts` exports (handlers now exported correctly)
2. ✅ Fixed `auth.config.ts` JWT callback (backendToken handling)
3. ✅ OAuth credentials copied from backend to frontend `.env.local`

---

## 🧪 Test Ngay Bây Giờ

### Step 1: Restart Frontend

**Stop frontend server** (Ctrl+C in terminal) nếu đang chạy, rồi:

```bash
cd E:\my-lingerie-shop\frontend
npm run dev
```

**Expected**:
```
✓ Ready in 2.3s
○ Compiling / ...
✓ Compiled / in 1.2s
```

**No build errors!** ✅

### Step 2: Test Login

Open browser: http://localhost:3000/login-register

#### Test A: Credentials Login (Email/Password)

1. Click **"Đăng nhập"** tab
2. Enter:
   - Email: `admin@gmail.com`
   - Password: `123456789`
3. Click **"Đăng nhập"**

**Expected**:
- ✅ Redirect to homepage `/`
- ✅ User name in header
- ✅ No errors

#### Test B: Google Login

1. Click **"Login with Google"** button
2. Google consent screen appears
3. Select your Google account
4. Approve access

**Expected**:
- ✅ Redirects back to app
- ✅ User auto-created in database
- ✅ Logged in

#### Test C: GitHub Login

1. Logout first
2. Click **"Login with GitHub"** button
3. GitHub authorization screen
4. Click "Authorize"

**Expected**:
- ✅ Redirects back
- ✅ User created
- ✅ Logged in

---

## 🔍 Verify Database

After social login, check database:

```sql
-- Social users (have emailVerified)
SELECT id, email, name, password, "emailVerified", image
FROM "User"
WHERE "emailVerified" IS NOT NULL;

-- Linked accounts
SELECT 
  u.email,
  a.provider,
  a."providerAccountId"
FROM "User" u
JOIN "Account" a ON a."userId" = u.id;

-- Active sessions
SELECT 
  s."sessionToken",
  s.expires,
  u.email
FROM "Session" s
JOIN "User" u ON s."userId" = u.id
WHERE s.expires > NOW();
```

**Expected**:
- Social users have `password = NULL`
- Social users have `emailVerified = timestamp`
- Account table has records for Google/GitHub

---

## ❌ If Something Fails

### Build Error Still Appears

```bash
# Clear Next.js cache
cd frontend
rm -rf .next
npm run dev
```

### "CredentialsSignin" Error

**Cause**: Backend login failed

**Check**:
1. Backend is running: http://localhost:5000
2. Backend logs show error
3. Email/password correct

### Social Login: "Configuration Error"

**Check**:
1. OAuth credentials in `.env.local`
2. Callback URLs match in Google/GitHub console:
   - Google: `http://localhost:3000/api/auth/callback/google`
   - GitHub: `http://localhost:3000/api/auth/callback/github`

### Session Not Persisting

**Check**:
1. `NEXTAUTH_URL=http://localhost:3000` in `.env.local`
2. Clear browser cookies
3. Try incognito mode

---
## ✅ Success Criteria

### Phase 1: Credentials ✅
- [ ] Login with email/password works
- [ ] Session persists on refresh
- [ ] Logout works
- [ ] No build errors

### Phase 2: Social ✅
- [ ] Google login works
- [ ] GitHub login works
- [ ] Users created in database
- [ ] Account linking works

---

## 📞 Report Results

Sau khi test, báo lại:

✅ **If all tests pass**:
- "All tests passed! Ready for Phase 3 (Forgot Password)"

❌ **If something fails**:
- Which test failed
- Error message
- Screenshot

---

## 🎯 Next Phase: Forgot Password

Sau khi login works, tôi sẽ implement:

1. Backend API: `POST /api/auth/forgot-password`
   - Generate OTP/token
   - Send email via Resend

2. Backend API: `POST /api/auth/reset-password`
   - Verify OTP/token
   - Update password

3. Update forget-pass UI
   - Call backend APIs
   - Show success/error messages

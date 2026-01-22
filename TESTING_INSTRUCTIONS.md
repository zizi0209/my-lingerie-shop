# 🧪 Testing Instructions - Auth Hybrid System

## ✅ Pre-Test Status

- ✅ Database migration applied
- ✅ AUTH_SECRET generated
- ✅ AuthContext updated to use NextAuth
- ✅ SessionProvider added to app
- ✅ SocialLoginButtons component created
- ⚠️ **OAuth credentials needed** (for social login only)

---

## 📋 Step-by-Step Testing

### Step 1: Stop Both Servers

Press `Ctrl+C` in both terminal windows to stop:
- Backend (port 5000)
- Frontend (port 3000)

### Step 2: Generate Prisma Client

```bash
cd E:\my-lingerie-shop\backend
npx prisma generate
```

**Expected output**:
```
✔ Generated Prisma Client
```

### Step 3: Start Backend

```bash
cd E:\my-lingerie-shop\backend
npm run dev
```

**Expected output**:
```
Server running on http://localhost:5000
```

### Step 4: Start Frontend

Open **new terminal**:

```bash
cd E:\my-lingerie-shop\frontend
npm run dev
```

**Expected output**:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

---

## 🧪 Test Phase 1: Credentials Login (Email/Password)

### Test 1.1: Login with Existing Account

1. Open browser: http://localhost:3000/login-register

2. **Đăng nhập** tab should be active

3. Enter credentials:
   - Email: `admin@gmail.com`
   - Password: `123456789`

4. Click **"Đăng nhập"**

**Expected Behavior**:
- ✅ Page redirects to homepage `/`
- ✅ User name appears in header
- ✅ No console errors
- ✅ Browser DevTools → Application → Cookies shows `next-auth.session-token`

**If fails**, check:
- Backend logs for `/api/auth/login` request
- Frontend console for NextAuth errors
- Backend is running on port 5000

### Test 1.2: Verify Session Persists

1. After login, **refresh page** (F5)

**Expected Behavior**:
- ✅ User still logged in
- ✅ No redirect to login page
- ✅ User data still in header

### Test 1.3: Check Session API

1. Open new tab: http://localhost:3000/api/auth/session

**Expected Output** (JSON):
```json
{
  "user": {
    "id": "1",
    "email": "admin@gmail.com",
    "name": "Admin User",
    "role": "ADMIN",
    "image": null
  },
  "backendToken": "eyJhbGciOiJIUzI1NiIs...",
  "expires": "2026-01-29T..."
}
```

### Test 1.4: Logout

1. Click **Logout** button in header

**Expected Behavior**:
- ✅ Redirects to homepage
- ✅ User data disappears from header
- ✅ Session API returns `{}`
- ✅ Cookie `next-auth.session-token` deleted

### Test 1.5: Register New User

1. Go to: http://localhost:3000/login-register

2. Click **"Đăng ký"** tab

3. Fill form:
   - Họ: `Test`
   - Tên: `User`
   - Email: `testuser@example.com`
   - Password: `password123`
   - Confirm: `password123`
   - ✅ Check "Tôi đồng ý..."

4. Click **"Đăng ký"**

**Expected Behavior**:
- ✅ Account created in database
- ✅ Auto-login after registration
- ✅ Redirects to homepage
- ✅ User logged in

---

## 🎯 Test Phase 2: Social Login (Optional - Needs OAuth Setup)

### Prerequisites

**If you want to test social login**, setup OAuth credentials first:

1. Follow: `docs/OAUTH_SETUP.md`

2. Add credentials to `frontend/.env.local`:
   ```env
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxx
   GITHUB_CLIENT_ID=xxx
   GITHUB_CLIENT_SECRET=xxx
   ```

3. Restart frontend:
   ```bash
   # Stop frontend (Ctrl+C)
   npm run dev
   ```

### Test 2.1: Google Login

1. Go to: http://localhost:3000/login-register

2. Click **"Login with Google"** button

**Expected Behavior**:
- ✅ Redirects to Google consent screen
- ✅ After approval, redirects back to app
- ✅ User auto-created in database
- ✅ User logged in

### Test 2.2: GitHub Login

1. Logout first

2. Click **"Login with GitHub"** button

**Expected Behavior**:
- ✅ Redirects to GitHub authorization
- ✅ After approval, redirects back
- ✅ User auto-created
- ✅ User logged in

### Test 2.3: Account Linking

**Scenario**: User has email account, then logs in with Google (same email)

1. Register with: `linking@test.com` + password

2. Logout

3. Click "Login with Google" using `linking@test.com`

**Expected Behavior**:
- ✅ No duplicate user created
- ✅ Google account linked to existing user
- ✅ User can login with both methods

### Test 2.4: Verify Database

Run query in database:

```sql
-- Check social user
SELECT id, email, name, password, "emailVerified", image
FROM "User"
WHERE "emailVerified" IS NOT NULL
LIMIT 5;

-- Check linked accounts
SELECT 
  u.email, 
  a.provider, 
  a."providerAccountId"
FROM "User" u
JOIN "Account" a ON a."userId" = u.id;
```

**Expected**:
- Social users have `password = NULL`
- Social users have `emailVerified = timestamp`
- Account table has records for social logins

---

## ❌ Troubleshooting

### Error: "Cannot read properties of undefined"

**Cause**: Prisma Client not generated

**Fix**:
```bash
cd backend
# Stop server first
npx prisma generate
npm run dev
```

### Error: "CredentialsSignin"

**Cause**: Backend login failed

**Fix**:
- Check backend logs
- Verify email/password correct
- Check `/api/auth/login` endpoint works

### Social Login: "Configuration error"

**Cause**: OAuth credentials not set or invalid

**Fix**:
- Check `.env.local` has correct credentials
- Verify callback URLs in OAuth apps:
  - Google: `http://localhost:3000/api/auth/callback/google`
  - GitHub: `http://localhost:3000/api/auth/callback/github`

### Session not persisting

**Cause**: Cookie not set

**Fix**:
- Check `NEXTAUTH_URL=http://localhost:3000` in `.env.local`
- Clear browser cookies
- Try incognito mode

---

## ✅ Success Criteria

### Phase 1 (Credentials) - Must Pass ✅
- [ ] Existing users can login with email/password
- [ ] New users can register
- [ ] Session persists on page refresh
- [ ] Logout works correctly
- [ ] Session API returns user data
- [ ] No console errors

### Phase 2 (Social) - Optional ✅
- [ ] Google login creates new user
- [ ] GitHub login creates new user
- [ ] Account linking works (no duplicates)
- [ ] Social users have `password: null`
- [ ] Multiple login methods work for same account

---

## 📞 Report Issues

If any test fails, please provide:

1. **Which test failed**: (e.g., "Test 1.1: Login with Existing Account")
2. **Error message**: (from console or screen)
3. **Backend logs**: (if relevant)
4. **Screenshots**: (if UI issue)

---

## 🎉 When All Tests Pass

Proceed to **Phase 3: Forgot Password**:
- Backend API for sending reset emails
- Integration with Resend
- Update forget-pass page UI

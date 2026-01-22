# 🎯 Final Fix Steps - Configuration Error

## Summary of Changes

### ✅ What Was Fixed

1. **Removed Prisma Adapter** - Switched to pure JWT strategy
2. **Added social-login backend endpoint** - `/api/auth/social-login`
3. **Updated auth callbacks** - Call backend when social login
4. **Fixed redirect** - Should go to `/` after login

### 🔧 Required Actions

## Step 1: Restart Backend (CRITICAL!)

Backend code đã update với endpoint mới, **phải restart**:

```bash
cd E:\my-lingerie-shop\backend

# Stop server (Ctrl+C trong terminal đang chạy backend)

# Start lại
npm run dev
```

**Verify backend started**:
```
✓ Server is running on port 5000
```

## Step 2: Verify OAuth Callback URLs

### Google Cloud Console

https://console.cloud.google.com/apis/credentials

1. Click vào OAuth Client ID của bạn
2. **Authorized redirect URIs** phải có:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
3. Click **Save** nếu thêm mới

### GitHub OAuth Settings

https://github.com/settings/developers

1. Click vào OAuth App của bạn
2. **Authorization callback URL** phải là:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
3. Click **Update application** nếu sửa

## Step 3: Restart Frontend

```bash
cd E:\my-lingerie-shop\frontend

# Stop (Ctrl+C)

# Clear cache
rm -rf .next

# Start
npm run dev
```

## Step 4: Clear Browser State

**Option A: Incognito Mode** (Recommended)
- Open incognito window
- Go to http://localhost:3000/login-register

**Option B: Clear Cookies**
- F12 → Application tab
- Clear all cookies for `localhost:3000`
- Clear Local Storage
- Refresh page

## Step 5: Test Login Flows

### Test A: Credentials Login (Should work already)

1. Email: `admin@gmail.com`
2. Password: `123456789`
3. Click "Đăng nhập"

**Expected**:
- ✅ Redirect to `/`
- ✅ Profile shows "Admin User" (or correct name)
- ✅ No errors

### Test B: Google Login

1. **Open DevTools Console** (F12) để xem logs
2. Click "Login with Google"
3. Select Google account
4. Approve permissions

**Expected**:
- ✅ Redirect to `/`
- ✅ Profile shows your Google name
- ✅ Console shows: `✅ Social user created/updated`

**If fails**:
- Check console for errors
- Check backend logs
- See `DEBUG_CONFIG_ERROR.md`

### Test C: GitHub Login

1. Logout first
2. Click "Login with GitHub"
3. Authorize app

**Expected**:
- ✅ Same as Google login

---

## Debugging

### Check Backend Logs

Backend console should show:
```
POST /api/auth/social-login 200 - 123ms
✅ New social user created: user@gmail.com via google
```

### Check Frontend Console

With `debug: true` enabled, you'll see:
```
[next-auth][debug] Callback received
[next-auth][debug] Calling /auth/social-login
✅ Social user created/updated: {...}
```

### Common Errors

**Error: "Configuration"**
- ❌ Callback URL not matching
- ❌ Backend endpoint not responding
- ❌ CORS issue

**Error: "Failed to fetch"**
- ❌ Backend not running
- ❌ Wrong API URL

**Error: "AccessDenied"**
- ❌ User cancelled OAuth
- ❌ OAuth app not approved

---

## Verify Database After Social Login

```sql
-- Check if user created
SELECT id, email, name, password, "emailVerified", image
FROM "User"
WHERE email = 'your-google-email@gmail.com';

-- Should see:
-- password: NULL
-- emailVerified: <timestamp>
-- image: <google avatar URL>

-- Check Account table
SELECT 
  u.email,
  a.provider,
  a."providerAccountId",
  a.type
FROM "Account" a
JOIN "User" u ON u.id = a."userId"
WHERE u.email = 'your-google-email@gmail.com';

-- Should see provider: "google" or "github"
```

---

## Success Criteria

- [ ] Backend restarted with new endpoint
- [ ] OAuth callback URLs verified in Google/GitHub console
- [ ] Frontend restarted
- [ ] Browser cache cleared
- [ ] Credentials login works → redirects to `/` → shows profile
- [ ] Google login works → creates user in DB → shows profile
- [ ] GitHub login works → creates user in DB → shows profile
- [ ] No `?error=Configuration` in URL
- [ ] Profile name matches logged-in account

---

## If Still Fails

**Provide this info**:

1. **Backend console output** (last 20 lines)
2. **Frontend console errors** (screenshot)
3. **Network tab** showing failed request (F12 → Network)
4. **URL after OAuth callback** (full URL with error param)

Then I can debug further!

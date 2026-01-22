# 🔧 Debug Configuration Error

## Error: `?error=Configuration`

### Possible Causes:

1. **Callback URL mismatch** in OAuth app settings
2. **Backend API not responding** for social login
3. **Session/JWT strategy conflict**
4. **CORS issues** between frontend/backend

---

## Quick Fix Steps

### Step 1: Restart Backend (IMPORTANT!)

Backend code đã update với endpoint `/api/auth/social-login` mới.

```bash
cd E:\my-lingerie-shop\backend
# Stop server (Ctrl+C)
npm run dev
```

**Check backend started**:
```
Server running on http://localhost:5000
```

### Step 2: Verify OAuth Callback URLs

#### Google Console
https://console.cloud.google.com/ → Your Project → Credentials

**Authorized redirect URIs** must include:
```
http://localhost:3000/api/auth/callback/google
```

#### GitHub Settings
https://github.com/settings/developers → Your OAuth App

**Authorization callback URL** must be:
```
http://localhost:3000/api/auth/callback/github
```

### Step 3: Clear Browser State

```bash
# Open DevTools → Application tab
# Clear:
- Cookies (all from localhost:3000)
- Local Storage
- Session Storage
```

Or use **Incognito mode** để test.

### Step 4: Test Flow

1. **Open**: http://localhost:3000/login-register
2. **Open DevTools Console** (F12)
3. **Click**: "Login with Google" hoặc "Login with GitHub"
4. **Watch console** for errors

---

## Expected Console Output

### Success Flow ✅

```
[next-auth][debug] Redirect to provider
[next-auth][debug] Callback received
[next-auth][debug] Calling backend API: /auth/social-login
✅ Social user created/updated: { user: {...}, isNew: true }
[next-auth][debug] Session created
→ Redirect to: /
```

### Error Flow ❌

```
[next-auth][error] Configuration
Details: {...}
```

**If you see this**, check:
- Backend logs for `/auth/social-login` request
- CORS error in console
- Network tab for failed requests

---

## Debug: Check Backend API

Test backend endpoint manually:

```bash
curl -X POST http://localhost:5000/api/auth/social-login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "providerAccountId": "test123",
    "email": "test@example.com",
    "name": "Test User",
    "image": "https://example.com/avatar.jpg"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "data": {
    "user": {...},
    "isNew": true
  }
}
```

---

## Debug: Enable NextAuth Debug Mode

Already enabled in `auth.config.ts`:
```ts
debug: true
```

Check **frontend console** for detailed logs.

---
## Common Issues

### Issue 1: "Failed to fetch"
**Cause**: Backend not running
**Fix**: Start backend server

### Issue 2: CORS error
**Cause**: Backend CORS not allowing frontend
**Fix**: Check `backend/src/server.ts` has:
```ts
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Issue 3: "User already exists"
**Cause**: Email conflict
**Fix**: Check database for existing user with same email

### Issue 4: Stuck on login page after OAuth
**Cause**: Session not created
**Fix**: 
- Check backend `/auth/social-login` returned success
- Check NextAuth session callback executed
- Verify AuthContext synced session to state

---

## Testing Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] OAuth callback URLs match in Google/GitHub console
- [ ] Browser cookies/storage cleared
- [ ] DevTools console open to see logs
- [ ] Backend logs visible

---

## After Successful Login

### Expected Behavior:

1. ✅ Redirect to homepage `/`
2. ✅ User profile in header shows correct name
3. ✅ User created in database
4. ✅ Account table has OAuth record

### Verify Database:

```sql
-- Check social user
SELECT id, email, name, password, "emailVerified"
FROM "User"
WHERE email = 'your-google-email@gmail.com';

-- Should have: password = NULL, emailVerified = timestamp

-- Check linked account
SELECT * FROM "Account"
WHERE "providerAccountId" = 'your-google-id';
```

---

## Still Not Working?

**Provide**:
1. Backend console output
2. Frontend console errors
3. Network tab screenshot showing failed request
4. OAuth callback URL from Google/GitHub console

# 🧪 Auth Testing Plan

## Phase 1: Credentials Login (No OAuth needed)

### Prerequisites
- ✅ Database migration applied
- ✅ AUTH_SECRET generated
- ✅ Backend running on port 5000
- ✅ Frontend running on port 3000

### Test Steps

1. **Stop both servers** (to apply Prisma generate):
   ```bash
   # Stop backend & frontend
   ```

2. **Generate Prisma Client**:
   ```bash
   cd backend
   npx prisma generate
   ```

3. **Restart servers**:
   ```bash
   # Terminal 1
   cd backend
   npm run dev

   # Terminal 2
   cd frontend
   npm run dev
   ```

4. **Test Credentials Login**:
   - Go to: http://localhost:3000/login-register
   - Try existing account: `admin@gmail.com` / `123456789`
   - Expected: Should login via NextAuth credentials provider
   - Check browser console for any errors

5. **Verify Session**:
   - After login, check: http://localhost:3000/api/auth/session
   - Should see JSON with user data

6. **Test Logout**:
   - Click logout
   - Verify session cleared

### Expected Behavior

✅ **Success Indicators**:
- Login redirects to homepage
- User data displays in header
- Session persists on page refresh
- Backend receives JWT token from session

❌ **Common Issues**:

**Error: "Cannot read properties of undefined (reading 'PrismaAdapter')"**
- **Fix**: Prisma Client not generated. Stop backend → run `npx prisma generate` → restart

**Error: "CredentialsSignin"**
- **Fix**: Backend login API failed. Check backend logs for actual error

**Error: "NEXTAUTH_URL environment variable is not set"**
- **Fix**: Ensure `NEXTAUTH_URL=http://localhost:3000` in `.env.local`

---

## Phase 2: Social Login (Requires OAuth Setup)

### Prerequisites
- ✅ Phase 1 tests passed
- ✅ Google OAuth credentials in `.env.local`
- ✅ GitHub OAuth credentials in `.env.local`

### Test Steps

1. **Test Google Login**:
   - Click "Login with Google" button
   - Should redirect to Google consent screen
   - After approval, redirects back to app
   - User auto-created in database

2. **Verify Database**:
   ```sql
   -- Check social user
   SELECT id, email, name, password, "emailVerified" 
   FROM "User" 
   WHERE "emailVerified" IS NOT NULL;

   -- Check linked account
   SELECT u.email, a.provider, a."providerAccountId"
   FROM "User" u
   JOIN "Account" a ON a."userId" = u.id;
   ```

3. **Test Account Linking**:
   - Register with: `test@gmail.com` + password
   - Logout
   - Click "Login with Google" using `test@gmail.com`
   - Should link accounts (no duplicate user)

4. **Test Multiple Login Methods**:
   - User should be able to login via:
     - ✅ Email/password
     - ✅ Google
     - ✅ (Both for same account)

### Expected Database State

After social login:

```sql
-- User table
{
  "id": 123,
  "email": "john@gmail.com",
  "password": null,  -- ← NULL for social users
  "emailVerified": "2026-01-22T10:30:00Z",  -- ← Set by OAuth
  "image": "https://lh3.googleusercontent.com/..."
}

-- Account table
{
  "id": "acc_xyz",
  "userId": 123,
  "provider": "google",
  "providerAccountId": "108234567890"
}

-- Session table
{
  "sessionToken": "abc123...",
  "userId": 123,
  "expires": "2026-01-29T10:30:00Z"
}
```

---

## Phase 3: Forgot Password (Backend API)

Will be implemented after social login is working.

---

## Debugging Tips

### Check NextAuth Logs

Enable debug mode in `auth.config.ts`:
```ts
export default {
  debug: true,  // Add this
  providers: [...],
  // ...
}
```

### Check Backend Logs

Backend should log when credentials provider calls `/api/auth/login`:
```
POST /api/auth/login 200 - 123ms
```

### Check Browser Console

Look for NextAuth errors:
- `[next-auth][error]` - Configuration issues
- `CredentialsSignin` - Backend auth failed
- `OAuthCallback` - OAuth provider issues

### Manual Session Check

```bash
# Check if session exists
curl http://localhost:3000/api/auth/session

# Should return:
# Logged in: {"user": {...}, "expires": "..."}
# Not logged in: {}
```

---

## Success Criteria

### Phase 1 ✅
- [ ] Existing users can login with email/password via NextAuth
- [ ] Session persists across page refresh
- [ ] useAuth() hook returns correct user data
- [ ] Logout clears session

### Phase 2 ✅
- [ ] New users can register via Google OAuth
- [ ] New users can register via GitHub OAuth
- [ ] Account linking works (email user + Google same email)
- [ ] Social users have `password: null` and `emailVerified: timestamp`
- [ ] Multiple login methods work for same user

---

## Current Status

- ✅ Database migration applied
- ✅ AUTH_SECRET generated
- ⏳ Waiting for servers restart
- ⏳ Waiting for OAuth credentials (optional for Phase 1)

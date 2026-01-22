# Auth Migration Guide: Hybrid Auth System

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Google      │  │   GitHub     │  │ Credentials  │     │
│  │  OAuth       │  │   OAuth      │  │  (Email/Pass)│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │             │
│         └─────────────────┴──────────────────┘             │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │   Auth.js v5    │                       │
│                  │  (NextAuth)     │                       │
│                  └────────┬────────┘                       │
│                           │                                │
│                  ┌────────▼────────┐                       │
│                  │ Prisma Adapter  │                       │
│                  └────────┬────────┘                       │
│                           │                                │
└───────────────────────────┼─────────────────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │  PostgreSQL DB    │
                  │  (Shared)         │
                  └─────────┬─────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                  Backend (Express)                          │
├───────────────────────────┼─────────────────────────────────┤
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  Prisma Client  │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
│          ┌────────────────┼────────────────┐               │
│          │                │                │               │
│    ┌─────▼─────┐   ┌─────▼──────┐  ┌─────▼──────┐        │
│    │  Login    │   │  Forgot    │  │  Business  │        │
│    │  (JWT)    │   │  Password  │  │  Logic     │        │
│    └───────────┘   └────────────┘  └────────────┘        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## 📋 Migration Steps

### Step 1: Database Migration

```bash
cd E:\my-lingerie-shop\backend

# Apply migration
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

**Changes:**
- User.password: `String` → `String?` (nullable for social users)
- User: Added `emailVerified`, `image` fields
- New tables: `Account`, `Session`, `VerificationToken`, `PasswordResetToken`

### Step 2: Setup Environment Variables

#### Frontend (.env.local)
```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Add to .env.local
AUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=<same-as-backend>

# Setup OAuth credentials (see OAUTH_SETUP.md)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

### Step 3: Test Social Login

1. Start backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Test flows:
   - ✅ Google Login → Should create user in DB
   - ✅ GitHub Login → Should create user in DB
   - ✅ Account Linking → Login with email, then Google with same email

### Step 4: Verify Database

```sql
-- Check social users
SELECT id, email, name, "emailVerified", password IS NULL as is_social
FROM "User"
WHERE "emailVerified" IS NOT NULL;

-- Check linked accounts
SELECT 
  u.email, 
  a.provider, 
  a."providerAccountId"
FROM "User" u
JOIN "Account" a ON a."userId" = u.id;

-- Check sessions
SELECT * FROM "Session" WHERE expires > NOW();
```

## 🔄 How It Works

### Social Login Flow (Google/GitHub)

1. User clicks "Login with Google"
2. NextAuth redirects to Google OAuth
3. Google authenticates → Returns to `/api/auth/callback/google`
4. NextAuth processes:
   - Checks if user exists (by email)
   - If yes: Links account (creates `Account` record)
   - If no: Creates new user + account
5. Creates session → Redirects to homepage

### Credentials Login Flow (Email/Password)

1. User submits email/password
2. NextAuth `CredentialsProvider.authorize()` is called
3. Makes `fetch()` to Express backend: `POST /api/auth/login`
4. Backend validates credentials:
   - Checks password with bcrypt
   - Returns user data + JWT token
5. NextAuth receives response:
   - Creates session with user data
   - Stores backend JWT in session for API calls
6. Frontend can use `useSession()` to access user + backend token

### Account Linking Example

**Scenario:**
```
Day 1: User registers with admin@gmail.com + password
Day 2: User clicks "Login with Google" (same email)
```

**Result:**
```sql
User table:
  id: 1
  email: admin@gmail.com
  password: $2a$12$... (hashed)
  emailVerified: 2026-01-22 (set by Google)

Account table:
  id: acc_123
  userId: 1
  provider: google
  providerAccountId: 108234567890
```

**User can now login via:**
- ✅ Email + Password
- ✅ Google OAuth

## 🛡️ Security Features

### Backend (Express)
- Rate limiting on login endpoint
- Bcrypt password hashing
- JWT token expiry
- Audit logging
- Account lockout after failed attempts

### Frontend (Auth.js)
- CSRF protection (built-in)
- Secure HTTP-only cookies for sessions
- OAuth state validation
- Account linking with email verification

## 🧪 Testing Checklist

- [ ] Google login creates new user
- [ ] GitHub login creates new user
- [ ] Email/password login works via credentials provider
- [ ] Account linking: Email user can link Google
- [ ] Session persists across page refresh
- [ ] Logout clears session
- [ ] Multiple social accounts can link to one user
- [ ] Backend JWT token stored in session
- [ ] API calls use backend token for authorization

## 📝 Notes

### Why Hybrid Approach?

1. **Keep existing backend logic**: Audit logs, rate limiting, business logic intact
2. **Add social login easily**: NextAuth handles OAuth complexity
3. **Unified session**: One `useSession()` hook for all auth types
4. **Account linking**: Users can use multiple login methods

### Future Enhancements

- [ ] Email verification for credentials signup
- [ ] Two-factor authentication (2FA)
- [ ] Social account unlinking
- [ ] Admin dashboard to view linked accounts
- [ ] Analytics: Track login method distribution

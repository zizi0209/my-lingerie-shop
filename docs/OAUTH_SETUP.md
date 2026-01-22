# OAuth Setup Guide

## 🔑 Setup OAuth Providers

### 1. Google OAuth

#### Bước 1: Tạo Project trên Google Cloud Console
1. Truy cập: https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Đặt tên: `Lingerie Shop` → Create

#### Bước 2: Enable Google+ API
1. Menu → APIs & Services → Library
2. Tìm "Google+ API" → Enable

#### Bước 3: Tạo OAuth Credentials
1. Menu → APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Name: `Lingerie Shop Web Client`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://yourdomain.com (production)
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```
7. Click **Create**
8. Copy **Client ID** và **Client Secret** → Paste vào `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

#### Bước 4: Configure OAuth Consent Screen
1. Menu → OAuth consent screen
2. User Type: **External** → Create
3. Fill in:
   - App name: `Lingerie Shop`
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
4. Scopes: Chỉ cần `email` và `profile` (default)
5. Test users: Thêm email của bạn để test
6. Save and Continue

---

### 2. GitHub OAuth

#### Bước 1: Tạo OAuth App
1. Truy cập: https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - Application name: `Lingerie Shop`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**

#### Bước 2: Generate Client Secret
1. Click "Generate a new client secret"
2. Copy **Client ID** và **Client Secret** → Paste vào `.env.local`:
   ```bash
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

---

### 3. Generate AUTH_SECRET

Run command:
```bash
openssl rand -base64 32
```

Hoặc dùng Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copy output → Paste vào `.env.local`:
```bash
AUTH_SECRET=your-generated-secret-key
```

---

## 🧪 Testing

1. Restart frontend:
   ```bash
   npm run dev
   ```

2. Truy cập: http://localhost:3000/login-register

3. Click nút "Login with Google" hoặc "Login with GitHub"

4. Kiểm tra database:
   ```sql
   SELECT * FROM "User" WHERE "emailVerified" IS NOT NULL;
   SELECT * FROM "Account";
   ```

---

## 🔗 Account Linking

**Scenario**: User đã đăng ký email `admin@gmail.com`, sau đó login bằng Google với cùng email.

**Behavior**: 
- Auth.js tự động nhận diện email trùng khớp
- Tạo record trong bảng `Account` link với user hiện tại
- User có thể login bằng cả 2 cách

**Configuration**: Đã enable trong `auth.config.ts`:
```ts
allowDangerousEmailAccountLinking: true
```

---

## 📌 Production Deployment

### Update Redirect URIs
1. Google Console → Add production URL
2. GitHub OAuth App → Add production callback
3. Update `.env`:
   ```bash
   NEXTAUTH_URL=https://yourdomain.com
   ```

### Publish OAuth Consent Screen (Google)
1. Google Console → OAuth consent screen
2. Click "Publish App"
3. Submit for verification (chỉ cần nếu yêu cầu sensitive scopes)

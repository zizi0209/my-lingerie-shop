# Railway Deployment Troubleshooting Guide

## ✅ Đã sửa

### 1. Nixpacks Build Config
- ✅ Added `npx prisma generate` to build phase
- ✅ Build sequence: `npm install` → `prisma generate` → `npm run build`

### 2. Railway Config
- ✅ Updated health check timeout to 300s
- ✅ Added retry policy (max 10 retries)
- ✅ Health check endpoint: `/api/health`

### 3. Express Server Config
- ✅ Added `app.set('trust proxy', 1)` for Railway proxy
- ✅ Fixes rate limiter X-Forwarded-For errors

### 4. Git Push
- ✅ Committed changes to `nixpacks.toml`, `railway.json`, `server.ts`
- ✅ Pushed to master branch

---

## 🔍 Kiểm tra Deployment

### Bước 1: Check Railway Dashboard
1. Truy cập: https://railway.app/project/{your-project-id}
2. Click vào **Backend Service**
3. Vào tab **Deployments**
4. Xem deployment mới nhất (commit: "fix(railway): add Prisma generate...")

### Bước 2: Check Build Logs
Trong Deployments tab, click vào deployment đang chạy và xem logs:

**Mong đợi thấy:**
```
==> Installing dependencies
==> Running: npm install
==> Running: npx prisma generate
✔ Generated Prisma Client
==> Running: npm run build
✔ Build successful

==> Starting server
==> Running: npm run start
Server is running on port 5000
```

**Nếu thấy lỗi:**
- ❌ `Cannot find module @prisma/client` → Prisma generate failed
- ❌ `Port 5000 already in use` → ENV variable PORT issue
- ❌ `Database connection failed` → DATABASE_URL missing

### Bước 3: Check Environment Variables
Vào **Variables** tab và đảm bảo có:

```bash
DATABASE_URL=postgresql://...  # Railway PostgreSQL connection string
NODE_ENV=production
PORT=5000

# Optional
JWT_SECRET=your-secret
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Bước 4: Check Database
1. Vào **Database** service trong Railway
2. Click **Connect**
3. Copy **DATABASE_URL**
4. Paste vào Backend service Variables
5. **Redeploy** backend service

### Bước 5: Test Deployment
Sau khi deployment thành công (status: Active), test:

```bash
# Health check
curl https://my-lingerie-shop-production-6286.up.railway.app/api/health

# Expected: {"status":"OK","timestamp":"..."}

# Public config
curl https://my-lingerie-shop-production-6286.up.railway.app/api/public/config

# Expected: {"success":true,"data":{...}}
```

---

## ⚠️ Common Issues

### Issue 1: "Application failed to respond"
**Nguyên nhân:**
- Build failed (TypeScript errors)
- Server không start được (module missing)
- Port binding failed

**Cách fix:**
1. Check Build Logs cho errors
2. Verify `npm run build` works locally
3. Ensure PORT variable is set correctly
4. Check if Prisma Client is generated

### Issue 2: Database connection timeout
**Nguyên nhân:**
- DATABASE_URL không đúng
- Database service chưa ready
- Network connectivity issues

**Cách fix:**
1. Copy DATABASE_URL từ Railway Database service
2. Update Backend Variables
3. Redeploy backend
4. Wait 30-60s for database to warm up

### Issue 3: Build timeout
**Nguyên nhân:**
- Dependencies quá lớn
- Sharp binary download lâu
- Prisma schema quá phức tạp

**Cách fix:**
1. Add `.npmrc` với:
   ```
   sharp_binary_host=https://github.com/lovell/sharp-libvips/releases/download
   sharp_libvips_binary_host=https://github.com/lovell/sharp-libvips/releases/download
   ```
2. Use `npm ci` thay vì `npm install`
3. Add `--legacy-peer-deps` nếu cần

### Issue 4: Prisma generate failed
**Nguyên nhân:**
- Schema có lỗi syntax
- Prisma engine không tải được
- Out of memory

**Cách fix:**
1. Test local: `npx prisma generate`
2. Validate schema: `npx prisma validate`
3. Check memory limits trong Railway settings
4. Simplify schema nếu quá phức tạp

---

## 📝 Next Steps

### 1. Run Database Migrations
Sau khi deployment thành công:

```bash
# SSH into Railway container (via Railway CLI)
railway run bash

# Or run migration via Railway UI
npx prisma migrate deploy
```

### 2. Seed Initial Data
```bash
# Create seed script
node seed-system-config.js
```

### 3. Setup Custom Domain
1. Vào Railway Settings > Networking
2. Add custom domain (e.g., api.lingerie.shop)
3. Update frontend NEXT_PUBLIC_API_URL

### 4. Monitor Logs
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Tail logs
railway logs
```

---

## 🚀 Deployment Checklist

- [x] Build config updated (nixpacks.toml)
- [x] Railway config updated (railway.json)
- [x] Trust proxy added (server.ts)
- [x] Changes committed and pushed
- [ ] Deployment triggered in Railway Dashboard
- [ ] Build logs show success
- [ ] Health check returns 200 OK
- [ ] Database connected successfully
- [ ] API endpoints working
- [ ] Frontend can fetch theme config
- [ ] Custom domain configured (optional)

---

## 📞 Support

**Railway Discord**: https://discord.gg/railway
**Railway Docs**: https://docs.railway.app
**Railway Status**: https://status.railway.app

**Common commands:**
```bash
# Check deployment status
railway status

# View logs
railway logs

# Run commands in container
railway run <command>

# Restart service
railway restart
```

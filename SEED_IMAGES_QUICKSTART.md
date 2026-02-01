# Local Seed Images - Quick Start

## ✅ What's Done

1. **Directory structure created:**
   ```
   frontend/public/images/seed/
   ├── bra/
   ├── panty/
   ├── set/
   ├── sleepwear/
   ├── shapewear/
   └── accessory/
   ```

2. **Seeding script updated:**
   - `backend/prisma/seed-products.ts` now uses local images
   - Falls back to picsum.photos if no local images found

3. **Verification script created:**
   - `verify-seed-images.js` in project root

---

## 🚀 Quick Workflow (TL;DR)

### 1. Get Images (15 phút)

Download 3-8 ảnh cho mỗi category từ:
- https://unsplash.com (search: "lingerie product")
- https://pexels.com
- Pinterest

### 2. Convert to WebP (5 phút)

Dùng: https://cloudconvert.com/jpg-to-webp

### 3. Rename Files

Pattern: `{category}-{number}.webp`

Example:
```
bra-1.webp, bra-2.webp, bra-3.webp
panty-1.webp, panty-2.webp
sleepwear-1.webp, sleepwear-2.webp
```

### 4. Copy to Folders

```
frontend/public/images/seed/bra/bra-1.webp
frontend/public/images/seed/panty/panty-1.webp
...
```

### 5. Verify

```bash
node verify-seed-images.js
```

Should show:
```
✅ BRA: 5 images
✅ PANTY: 3 images
...
Total: 25 images
```

### 6. Run Seeding

```bash
cd backend
npx ts-node prisma/seed-products.ts
```

Done! 🎉

---

## 📝 Commands Reference

```bash
# Verify images
node verify-seed-images.js

# Seed with local images (default)
cd backend && npx ts-node prisma/seed-products.ts

# Seed with online fallback
cd backend && USE_LOCAL_SEED_IMAGES=false npx ts-node prisma/seed-products.ts
```

---

## 📚 Full Documentation

See: `LOCAL_SEED_IMAGES_GUIDE.md` for detailed instructions.

---

## 🔥 Pro Tips

1. **WebP Quality:** 80-85% là đủ (nhẹ + đẹp)
2. **Image Size:** 800-1200px width
3. **Minimum:** 3 ảnh/category = 18 ảnh total
4. **Optimal:** 8 ảnh/category = 48 ảnh total
5. **Nền trắng/sáng** → professional hơn

---

**Happy Seeding! 🌱✨**

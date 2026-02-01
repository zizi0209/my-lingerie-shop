# Hướng dẫn Setup Local Seed Images

## 🎯 Mục đích

Thay vì dùng ảnh random từ `picsum.photos` (online, không liên quan đến sản phẩm), bạn sẽ:
- Chuẩn bị **bộ ảnh sản phẩm đẹp** (nội y, đồ ngủ, phụ kiện)
- Lưu local vào `/frontend/public/images/seed/`
- Script seeding sẽ dùng ảnh của bạn → **Demo chuyên nghiệp hơn 100%**

---

## 📁 Cấu trúc thư mục đã tạo sẵn

```
frontend/public/images/seed/
├── bra/          # Áo lót (Bras)
├── panty/        # Quần lót (Panties)
├── set/          # Set đồ lót
├── sleepwear/    # Đồ ngủ
├── shapewear/    # Đồ định hình
└── accessory/    # Phụ kiện
```

---

## 🎨 Quy ước đặt tên file

**Pattern:** `{category}-{number}.webp`

**Ví dụ:**
```
bra/
├── bra-1.webp
├── bra-2.webp
├── bra-3.webp
├── bra-4.webp
└── bra-5.webp

panty/
├── panty-1.webp
├── panty-2.webp
└── panty-3.webp

sleepwear/
├── sleepwear-1.webp
├── sleepwear-2.webp
└── sleepwear-3.webp
```

⚠️ **Lưu ý:** 
- File phải có đuôi `.webp` (không phải .jpg hay .png)
- Đánh số bắt đầu từ **1** (không phải 0)
- Tên category phải **lowercase** (bra, không phải BRA hay Bra)

---

## 📸 Bước 1: Tải ảnh về

### Nguồn ảnh gợi ý (Free):

1. **Unsplash** (https://unsplash.com)
   - Search: "lingerie product", "bra product photography", "sleepwear"
   - Chọn ảnh sản phẩm (không có người mẫu quá rõ mặt)

2. **Pexels** (https://pexels.com)
   - Search: "lingerie", "underwear", "sleepwear"
   
3. **Pinterest**
   - Search: "lingerie product photography white background"
   - Tải ảnh có background đơn giản

4. **Shopee/Lazada** (Screenshot)
   - Vào shop nội y cao cấp
   - Screenshot ảnh sản phẩm (chỉ phần sản phẩm, crop bỏ UI)

### Tiêu chí chọn ảnh:

✅ **NÊN:**
- Ảnh sản phẩm rõ nét, HD
- Nền trắng hoặc nền sáng đơn giản
- Góc chụp đẹp, thẩm mỹ
- Chất lượng professional

❌ **TRÁNH:**
- Ảnh có watermark/logo shop khác
- Ảnh mờ, chất lượng thấp
- Ảnh có chữ quảng cáo to
- Ảnh có nhiều người mẫu (tránh vấn đề bản quyền)

---

## 🔄 Bước 2: Convert sang WebP

### Cách 1: Online (Nhanh nhất - Khuyến nghị)

1. Vào https://cloudconvert.com/jpg-to-webp
2. Upload ảnh (.jpg hoặc .png)
3. Chọn **Quality: 80-90%**
4. Click "Convert" → Download file `.webp`

### Cách 2: Dùng Squoosh (Google Tool)

1. Vào https://squoosh.app
2. Drag & drop ảnh vào
3. Chọn format **WebP**
4. Adjust quality slider (80-90%)
5. Download

### Cách 3: Batch Convert (Nhiều ảnh cùng lúc)

**Dùng XnConvert** (Windows/Mac - Free GUI)
1. Download: https://www.xnview.com/en/xnconvert/
2. Add files → Choose output format: WebP
3. Convert all

**Dùng npm package (Developer):**
```bash
npm install -g webp-converter-cli
webp-converter input.jpg -o output.webp -q 85
```

---

## 📝 Bước 3: Đổi tên & Copy vào thư mục

### Ví dụ workflow:

1. **Download/Convert** 5 ảnh áo lót
2. **Đổi tên:**
   ```
   image1.webp → bra-1.webp
   image2.webp → bra-2.webp
   image3.webp → bra-3.webp
   image4.webp → bra-4.webp
   image5.webp → bra-5.webp
   ```
3. **Copy vào:**
   ```
   E:\my-lingerie-shop\frontend\public\images\seed\bra\
   ```

4. **Lặp lại** cho các category khác (panty, set, sleepwear...)

---

## 📊 Số lượng ảnh khuyến nghị

| Category    | Minimum | Recommended | Optimal |
|-------------|---------|-------------|---------|
| bra         | 3       | 5-8         | 10+     |
| panty       | 3       | 5-8         | 10+     |
| set         | 3       | 5-8         | 10+     |
| sleepwear   | 3       | 5-8         | 10+     |
| shapewear   | 3       | 5-8         | 10+     |
| accessory   | 3       | 5-8         | 10+     |

**Tổng:** 18 ảnh (minimum) → 60+ ảnh (optimal cho demo pro)

---

## 🎯 Kích thước ảnh khuyến nghị

- **Chiều rộng:** 800-1200px
- **Chiều cao:** 1000-1500px 
- **Tỷ lệ:** 2:3 hoặc 4:5 (portrait/dọc)
- **Dung lượng:** < 200KB/ảnh (WebP optimize)

**Tại sao WebP?**
- Nhẹ hơn JPEG 30-50% → Trang load nhanh hơn
- Chất lượng tốt hơn PNG ở cùng dung lượng
- Hỗ trợ tốt bởi tất cả browser hiện đại

---

## ⚙️ Bước 4: Verify & Test

### 4.1. Kiểm tra cấu trúc:

```bash
# Check xem ảnh đã đúng chưa
dir frontend\public\images\seed\bra
dir frontend\public\images\seed\panty
# ... (check tất cả categories)
```

### 4.2. (Optional) Chạy verification script:

```bash
node backend/scripts/verify-seed-images.js
```

**Expected output:**
```
✅ bra: 5 images
✅ panty: 5 images
✅ set: 3 images
✅ sleepwear: 5 images
✅ shapewear: 3 images
✅ accessory: 4 images
Total: 25 images
```

---

## 🌱 Bước 5: Chạy Seeding với Local Images

### Đảm bảo sử dụng local images (default):

```bash
# Backend terminal
cd backend

# Seeding sẽ tự động dùng local images
npx ts-node prisma/seed-products.ts
```

### Nếu muốn dùng lại picsum.photos (fallback):

```bash
# Set env variable
USE_LOCAL_SEED_IMAGES=false npx ts-node prisma/seed-products.ts
```

---

## 🔍 Cách hoạt động của script seeding

**Logic mới trong `seed-products.ts`:**

```typescript
// Trước (Old):
getProductImages(productId, count)
  → https://picsum.photos/seed/123/800/1000

// Sau (New):
getProductImages(productType, productIndex, count)
  → /images/seed/bra/bra-1.webp
  → /images/seed/bra/bra-2.webp
  → /images/seed/panty/panty-1.webp
```

**Rotation logic:**
- Script sẽ rotate qua 8 ảnh mỗi category
- Nếu bạn có 5 ảnh bra, nó sẽ dùng: bra-1 → bra-5 → bra-1 (lặp lại)
- Nếu bạn có 10 ảnh, nó dùng hết 10 rồi mới lặp lại

---

## 🚨 Troubleshooting

### Vấn đề 1: Ảnh không hiện (404)

**Nguyên nhân:** Tên file không khớp pattern

**Fix:**
```bash
# Check tên file:
dir frontend\public\images\seed\bra

# Phải thấy: bra-1.webp, bra-2.webp, ...
# KHÔNG phải: Bra-1.webp, bra_1.webp, bra1.webp
```

### Vấn đề 2: Seeding vẫn dùng picsum.photos

**Nguyên nhân:** Env variable bị set sai

**Fix:**
```bash
# Xóa env variable (nếu có)
# Hoặc set lại:
set USE_LOCAL_SEED_IMAGES=true

# Rồi chạy lại:
npx ts-node prisma/seed-products.ts
```

### Vấn đề 3: Convert ảnh bị lỗi

**Nguyên nhân:** File input bị corrupt hoặc format không hỗ trợ

**Fix:**
- Mở ảnh bằng Paint/Photoshop → Save as PNG
- Convert PNG → WebP

---

## 💡 Tips & Best Practices

### 1. Dùng AI Generation (Nếu không tìm được ảnh)

Dùng **Midjourney** hoặc **DALL-E** để generate:

**Prompt ví dụ:**
```
"professional product photography of a black lace bra, 
white background, studio lighting, high resolution, 
e-commerce style"
```

### 2. Tối ưu performance

- Compress WebP quality = 80-85% (đủ đẹp, nhẹ hơn)
- Resize về 1200px width trước khi convert
- Dùng CDN nếu deploy production

### 3. Organize theo Brand/Collection

Nếu bạn có nhiều brands/collections, có thể tạo subfolder:

```
seed/
├── bra/
│   ├── brand-a/
│   │   ├── bra-1.webp
│   │   └── bra-2.webp
│   └── brand-b/
│       ├── bra-1.webp
│       └── bra-2.webp
```

(Cần modify script seeding để support)

---

## ✅ Checklist hoàn thành

- [ ] Tải đủ ảnh cho 6 categories (tối thiểu 3 ảnh/category)
- [ ] Convert tất cả sang WebP format
- [ ] Đổi tên theo pattern: `{category}-{number}.webp`
- [ ] Copy vào đúng thư mục trong `public/images/seed/`
- [ ] Verify bằng `dir` command hoặc verification script
- [ ] Chạy seeding: `npx ts-node prisma/seed-products.ts`
- [ ] Kiểm tra frontend xem ảnh hiện đúng chưa

---

## 🎉 Kết quả

Sau khi hoàn thành, bạn sẽ có:

✅ Database với **ảnh sản phẩm thực tế** thay vì ảnh random
✅ Demo **professional**, dễ present cho khách hàng
✅ Load time **nhanh hơn** (WebP + local)
✅ **Không phụ thuộc** vào internet khi dev

---

## 📚 Tài liệu tham khảo

- WebP Converter: https://cloudconvert.com/jpg-to-webp
- Squoosh (Google): https://squoosh.app
- Free Stock Photos: https://unsplash.com, https://pexels.com
- XnConvert: https://www.xnview.com/en/xnconvert/

---

**Happy Seeding! 🌱✨**

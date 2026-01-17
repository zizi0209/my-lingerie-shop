# WebP Auto-Conversion Feature

## Tổng quan

Hệ thống tự động chuyển đổi **TẤT CẢ** ảnh upload sang định dạng **WebP** để tối ưu hiệu suất và dung lượng.

## Lợi ích của WebP

### 1. Dung lượng nhẹ hơn
- **25-35% nhẹ hơn** so với JPG/PNG cùng chất lượng
- Giảm thời gian tải trang
- Tiết kiệm băng thông và storage

### 2. Chất lượng tốt
- Giữ nguyên chất lượng hình ảnh
- Hỗ trợ cả lossy và lossless compression
- Hỗ trợ transparency (như PNG)
- Hỗ trợ animation (như GIF)

### 3. Tương thích
- Tất cả trình duyệt hiện đại hỗ trợ WebP
- Chrome, Firefox, Edge, Safari, Opera
- Mobile browsers (iOS 14+, Android 4+)

## Cách hoạt động

### Upload Flow

```
User uploads JPG/PNG/GIF/BMP
       ↓
Backend nhận file (Multer)
       ↓
Upload lên Cloudinary với format: 'webp'
       ↓
Cloudinary tự động convert sang WebP
       ↓
Lưu vào database với mimeType: 'image/webp'
       ↓
Trả về URL với extension .webp
```

### Các định dạng được hỗ trợ

**Input formats (upload):**
- JPG / JPEG
- PNG
- GIF
- BMP
- TIFF
- WebP (giữ nguyên)

**Output format:**
- **WebP** (luôn luôn)

## Implementation Details

### 1. Backend Code

**File:** `backend/src/controllers/mediaController.ts`

```typescript
// Single upload
cloudinary.uploader.upload_stream({
  resource_type: 'image',
  folder: folder,
  format: 'webp', // 👈 Tự động convert sang WebP
  transformation: [
    { width: 1200, height: 1200, crop: 'limit' },
    { quality: 'auto' },
  ],
})

// Database
mimeType: 'image/webp', // 👈 Luôn là WebP
```

### 2. Cloudinary Configuration

**Transformations được áp dụng:**
1. `format: 'webp'` - Convert sang WebP
2. `width: 1200, height: 1200, crop: 'limit'` - Resize tối đa
3. `quality: 'auto'` - Tối ưu chất lượng tự động

### 3. Database Schema

```prisma
model Media {
  id           Int      @id @default(autoincrement())
  filename     String
  originalName String
  mimeType     String   // Luôn là "image/webp"
  size         Int
  url          String   // URL có extension .webp
  publicId     String   @unique
  folder       String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## API Response Examples

### Upload JPG file

**Request:**
```http
POST /api/media/upload
Content-Type: multipart/form-data

file: product-image.jpg (JPG file)
folder: products
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "filename": "products/abc123xyz",
    "originalName": "product-image.jpg",
    "mimeType": "image/webp",  // ✅ WebP
    "size": 180000,  // Nhẹ hơn so với JPG gốc
    "url": "https://res.cloudinary.com/.../products/abc123xyz.webp",  // ✅ .webp
    "publicId": "products/abc123xyz",
    "folder": "products"
  }
}
```

### Upload PNG file

**Request:**
```http
POST /api/media/upload

file: logo.png (PNG file with transparency)
folder: logos
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mimeType": "image/webp",  // ✅ WebP (giữ transparency)
    "url": "https://res.cloudinary.com/.../logos/logo123.webp"
  }
}
```

## Frontend Usage

### 1. Hiển thị ảnh

```tsx
// Đơn giản - chỉ cần dùng URL
<img src={media.url} alt="Product" />

// Next.js Image component
<Image 
  src={media.url} 
  alt="Product"
  width={500}
  height={500}
/>
```

### 2. Fallback cho trình duyệt cũ

```tsx
<picture>
  <source srcSet={media.url} type="image/webp" />
  <img src={jpegFallbackUrl} alt="Product" />
</picture>
```

**Lưu ý:** Không cần thiết vì > 95% trình duyệt đã hỗ trợ WebP

## Performance Comparison

### Ví dụ thực tế

**File gốc:** `product.jpg` - 500KB
**Sau convert:** `product.webp` - 350KB (giảm 30%)

**Load time trên 3G:**
- JPG: ~2.5 giây
- WebP: ~1.7 giây (nhanh hơn 32%)

### Tính toán tiết kiệm

**Scenario:** 1000 ảnh sản phẩm

| Format | Avg Size | Total | Bandwidth/month |
|--------|----------|-------|-----------------|
| JPG | 500KB | 500MB | ~50GB (10k views) |
| WebP | 350KB | 350MB | ~35GB (10k views) |
| **Tiết kiệm** | **30%** | **150MB** | **15GB/month** |

## Testing

### Manual Test với Postman

```http
POST http://localhost:5000/api/media/upload

Body (form-data):
- file: [Select any JPG/PNG file]
- folder: test
```

**Expected Result:**
- Response có `mimeType: "image/webp"`
- `url` kết thúc bằng `.webp`
- File size nhỏ hơn file gốc

### Verify trên Cloudinary

1. Login vào [Cloudinary Console](https://cloudinary.com/console/media_library)
2. Navigate đến folder `test`
3. Check file properties:
   - Format: WebP
   - Size: nhỏ hơn file gốc

## Troubleshooting

### ❓ Ảnh bị mờ sau khi convert?

**Nguyên nhân:** Quality setting quá thấp

**Giải pháp:** Đã set `quality: 'auto'` - Cloudinary tự động chọn quality tốt nhất

### ❓ File size vẫn lớn?

**Nguyên nhân:** Ảnh gốc có resolution quá cao

**Giải pháp:** Đã limit `1200x1200px` - đủ cho web

### ❓ Transparency bị mất?

**Nguyên nhân:** WebP hỗ trợ transparency

**Giải pháp:** Không có vấn đề, WebP giữ nguyên alpha channel

### ❓ Animation GIF không chạy?

**Nguyên nhân:** Cần config riêng cho animated WebP

**Giải pháp:** Nếu cần giữ animation, có thể thêm option:
```typescript
{
  format: 'webp',
  flags: 'animated'  // Giữ animation
}
```

## Best Practices

### ✅ DO

- Upload ảnh quality cao, để Cloudinary tối ưu
- Sử dụng `<img>` tag bình thường, không cần special handling
- Dùng `next/image` cho Next.js apps
- Monitor Cloudinary usage dashboard

### ❌ DON'T

- Không pre-compress ảnh trước khi upload (để Cloudinary làm)
- Không convert sang WebP ở client side
- Không lo lắng về browser compatibility (>95% support)
- Không lưu nhiều versions của cùng 1 ảnh

## Future Enhancements

### Option 1: Conditional WebP

Cho phép upload giữ nguyên format gốc (nếu cần):

```typescript
const format = req.body.keepOriginalFormat ? undefined : 'webp';
```

### Option 2: AVIF Support

Format mới hơn WebP (nhẹ hơn ~20%):

```typescript
format: 'avif'  // Hoặc auto-detect browser support
```

### Option 3: Responsive Images

Generate multiple sizes:

```typescript
transformation: [
  { width: 400 },
  { width: 800 },
  { width: 1200 },
]
```

## Conclusion

WebP auto-conversion giúp:
- ⚡ Website load nhanh hơn 25-35%
- 💾 Tiết kiệm storage & bandwidth
- 🎨 Giữ nguyên chất lượng ảnh
- 🔄 Transparent cho developers & users
- ✅ Zero configuration needed

**Chỉ cần upload ảnh như bình thường, system tự động optimize!**

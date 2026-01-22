# WebP Auto-Delivery Feature

## Tổng quan

Hệ thống tự động **tạo WebP URL** cho mọi ảnh upload để tối ưu hiệu suất và dung lượng.

**Cách hoạt động:**
- Upload ảnh gốc (JPG/PNG/GIF) lên Cloudinary
- Cloudinary lưu file gốc
- API trả về **2 URLs**: original + WebP
- Frontend dùng WebP URL → Cloudinary tự động convert on-the-fly

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

### Upload & Delivery Flow

```
User uploads JPG/PNG/GIF
       ↓
Backend nhận file (Multer)
       ↓
Upload file gốc lên Cloudinary
       ↓
Lưu vào database với URL gốc
       ↓
Generate WebP URL (thêm f_webp transformation)
       ↓
Trả về response với cả 2 URLs:
  - url: original (JPG/PNG)
  - webpUrl: WebP version
       ↓
Frontend dùng webpUrl
       ↓
Cloudinary auto-convert sang WebP khi serve
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
// Helper function
const getWebPUrl = (url: string): string => {
  return url.replace('/upload/', '/upload/f_webp,q_auto/');
};

// Upload flow
cloudinary.uploader.upload_stream({
  resource_type: 'image',
  folder: folder,
  transformation: [
    { width: 1200, height: 1200, crop: 'limit' },
    { quality: 'auto' },
  ],
})

// Response
res.json({
  success: true,
  data: {
    ...media,
    webpUrl: getWebPUrl(media.url), // 👈 WebP URL
  },
});
```

### 2. Cloudinary URL Transformation

**WebP URL được tạo bằng cách:**
1. Thêm `f_webp` vào URL path
2. Thêm `q_auto` để tối ưu quality

**Example:**
- Original: `https://res.cloudinary.com/demo/image/upload/v123/sample.jpg`
- WebP: `https://res.cloudinary.com/demo/image/upload/f_webp,q_auto/v123/sample.jpg`

**Cloudinary sẽ:**
- Auto-convert JPG/PNG → WebP khi browser request
- Cache WebP version cho requests sau
- Serve original format nếu browser không support WebP

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
    "mimeType": "image/jpeg",
    "size": 245000,
    "url": "https://res.cloudinary.com/.../products/abc123xyz.jpg",
    "webpUrl": "https://res.cloudinary.com/.../f_webp,q_auto/products/abc123xyz.jpg",  // ✅ WebP URL
    "publicId": "products/abc123xyz",
    "folder": "products"
  }
}
```

**Lưu ý:**
- `url`: Original file (JPG/PNG)
- `webpUrl`: **Dùng URL này** để có ảnh WebP optimized
- Khi browser request `webpUrl`, Cloudinary tự động convert sang WebP

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

### 1. Hiển thị ảnh với WebP

```tsx
// Dùng webpUrl để có ảnh optimized
<img src={media.webpUrl} alt="Product" />

// Next.js Image component
<Image 
  src={media.webpUrl}  // 👈 Dùng WebP URL
  alt="Product"
  width={500}
  height={500}
/>

// Hoặc nếu cần fallback
<picture>
  <source srcSet={media.webpUrl} type="image/webp" />
  <img src={media.url} alt="Product" />
</picture>
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
- Response có field `webpUrl`
- `webpUrl` chứa transformation `f_webp,q_auto`
- Khi mở `webpUrl` trong browser → nhận được WebP image

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

- **Luôn dùng `webpUrl`** thay vì `url` trong frontend
- Upload ảnh quality cao, để Cloudinary tối ưu
- Dùng `<picture>` tag nếu cần hỗ trợ browsers cũ
- Monitor Cloudinary transformation usage

### ❌ DON'T

- Không pre-compress ảnh trước khi upload
- Không dùng `url` (original) khi có `webpUrl`
- Không upload WebP file (upload JPG/PNG, let Cloudinary optimize)
- Không lo lắng về browser compatibility (>95% support)

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

WebP auto-delivery giúp:
- ⚡ Website load nhanh hơn 25-35% (dùng `webpUrl`)
- 💾 Tiết kiệm bandwidth (~30% mỗi request)
- 🎨 Giữ nguyên chất lượng ảnh
- 🔄 On-the-fly conversion (không tốn storage)
- ✅ Backward compatible (giữ file gốc)

**Workflow:**
1. Upload ảnh gốc (JPG/PNG)
2. Nhận cả `url` và `webpUrl` trong response
3. Frontend dùng `webpUrl` → auto WebP!

**No configuration needed - just use `webpUrl` in your frontend!**

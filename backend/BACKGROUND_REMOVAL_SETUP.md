# Background Removal Setup Guide

## Tổng quan

Tính năng xóa nền ảnh hỗ trợ **3 phương pháp**:

1. **AI Method** (Tốt nhất) - Sử dụng `@imgly/background-removal-node`
2. **Advanced Method** (Tốt) - Sử dụng edge detection và color analysis
3. **Simple Method** (Nhanh) - Sử dụng color threshold

Hệ thống tự động chọn phương pháp tốt nhất có sẵn. Nếu không cài AI library, sẽ fallback sang Advanced/Simple method.

## Installation

### Option 1: AI Method (Khuyến nghị - Chất lượng cao nhất)

```bash
cd backend
npm install @imgly/background-removal-node
```

**Lưu ý:**
- Thư viện này sử dụng ONNX Runtime để chạy AI model local
- Model sẽ được tự động download lần đầu sử dụng (~50MB)
- Không cần API key hay internet connection sau khi model đã được download
- **Chỉ hoạt động trên Linux/macOS** (không hỗ trợ Windows development)

### Option 2: Fallback Methods (Luôn sẵn sàng)

Không cần cài đặt gì thêm! Hệ thống sử dụng Sharp (đã có sẵn) để xử lý:
- **Advanced Method**: Phát hiện màu nền từ góc ảnh, xóa pixel tương tự
- **Simple Method**: Xóa nền trắng/đen dựa trên threshold

## Cách hoạt động

### 1. AI Method (Nếu có)
```typescript
// Sử dụng deep learning model để phát hiện foreground/background
// Chất lượng cao nhất, xử lý tốt cả ảnh phức tạp
removeImageBackground(buffer, { method: 'ai', model: 'medium' })
```

### 2. Advanced Method (Fallback)
```typescript
// Phân tích màu góc ảnh → Xác định màu nền
// Xóa pixel có màu tương tự (tolerance-based)
removeImageBackground(buffer, { method: 'advanced', tolerance: 10 })
```

### 3. Simple Method (Fallback)
```typescript
// Xóa pixel trắng (>= threshold) hoặc đen (<= threshold)
// Nhanh nhất, phù hợp logo nền trắng đơn giản
removeImageBackground(buffer, { method: 'simple', threshold: 240 })
```

## API Endpoints

### 1. Check Status
```
GET /api/background-removal/status
```

**Response:**
```json
{
  "success": true,
  "available": true,
  "aiAvailable": false,
  "methods": ["simple", "advanced"],
  "message": "Background removal is available (methods: simple, advanced)",
  "recommendation": "Using fallback methods (simple/advanced)"
}
```

### 2. Remove Background
```
POST /api/background-removal/remove
```

**Headers:**
- `Authorization: Bearer <admin_token>`

**Body (multipart/form-data):**
- `image`: File ảnh cần xóa nền
- `folder`: (optional) Folder lưu trên Cloudinary (default: 'lingerie-shop/no-bg')
- `method`: (optional) 'ai' | 'advanced' | 'simple' | 'auto' (default: 'auto')
- `model`: (optional) 'small' | 'medium' (chỉ cho AI method, default: 'medium')

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "filename": "cloudinary_public_id",
    "originalName": "logo-no-bg.png",
    "url": "https://res.cloudinary.com/...",
    "processedUrl": "https://res.cloudinary.com/...",
    "method": "advanced",
    "size": 45678,
    "mimeType": "image/png"
  }
}
```

## Usage in Frontend

Tính năng đã được tích hợp vào `/dashboard/settings` page:

1. Upload logo như bình thường
2. Sau khi upload, nút **"Xóa nền"** (màu tím) sẽ xuất hiện
3. Click "Xóa nền" để xử lý ảnh
4. Preview sẽ hiển thị ảnh đã xóa nền với badge **"Đã xóa nền"** (màu xanh)
5. Click "Lưu thay đổi" để lưu

## Performance Comparison

| Method | Speed | Quality | Use Case |
|--------|-------|---------|----------|
| AI (small) | ~2-3s | ⭐⭐⭐⭐ | Logo phức tạp, cần nhanh |
| AI (medium) | ~5-7s | ⭐⭐⭐⭐⭐ | Logo phức tạp, chất lượng cao |
| Advanced | ~0.5-1s | ⭐⭐⭐ | Logo nền đơn sắc |
| Simple | ~0.2-0.5s | ⭐⭐ | Logo nền trắng/đen |

## Troubleshooting

### Windows Development

Nếu bạn đang develop trên Windows:
- AI method sẽ không hoạt động (platform limitation)
- Hệ thống tự động fallback sang Advanced/Simple method
- Deploy lên Linux server (Railway, Vercel, etc.) để dùng AI method

### Error: "Failed to remove background"

**Giải pháp:**
1. Kiểm tra file ảnh có hợp lệ không
2. Thử method khác: `method=simple` hoặc `method=advanced`
3. Giảm kích thước ảnh trước khi xử lý

### Chất lượng không tốt

**Với Simple method:**
- Tăng/giảm `threshold` (default: 240)
- Thử `threshold=230` cho nền xám nhạt
- Thử `threshold=250` cho nền trắng tinh

**Với Advanced method:**
- Tăng/giảm `tolerance` (default: 10)
- Tăng tolerance nếu còn sót nền
- Giảm tolerance nếu bị xóa mất chi tiết

### Out of Memory (AI method)

```bash
# Tăng RAM cho Node.js
NODE_OPTIONS=--max-old-space-size=4096 npm run dev
```

Hoặc sử dụng model 'small' thay vì 'medium'.

## Best Practices

### 1. Preprocessing
```typescript
// Compress ảnh trước khi xóa nền
const compressed = await compressImage(file);
// Sau đó mới remove background
```

### 2. Method Selection
```typescript
// Logo đơn giản, nền trắng → Simple
method: 'simple'

// Logo phức tạp, nền đơn sắc → Advanced  
method: 'advanced'

// Logo phức tạp, nền nhiều màu → AI
method: 'ai'

// Tự động chọn → Auto (khuyến nghị)
method: 'auto'
```

### 3. Error Handling
```typescript
try {
  await removeBackground();
} catch (error) {
  // Fallback: Giữ nguyên ảnh gốc
  console.warn('Background removal failed, using original');
}
```

### 4. Caching
```typescript
// Lưu ảnh đã xóa nền để tránh xử lý lại
if (cachedNoBgUrl) {
  return cachedNoBgUrl;
}
```

## Security

- ✅ Chỉ admin mới có quyền sử dụng (`requireAdmin` middleware)
- ✅ Rate limiting được áp dụng (`uploadLimiter`)
- ✅ File validation (type, size) qua `validateFileUpload`
- ✅ Xử lý local, không gửi data ra ngoài
- ✅ Tự động cleanup temporary files
- ✅ Cloudinary upload với folder isolation

## Production Deployment

### Railway / Render / DigitalOcean
```bash
# AI method sẽ hoạt động (Linux environment)
npm install @imgly/background-removal-node
```

### Vercel / Netlify (Serverless)
```bash
# Chỉ dùng fallback methods (AI method không hoạt động trên serverless)
# Đã được handle tự động
```

### Docker
```dockerfile
FROM node:18-alpine
# AI method cần thêm dependencies
RUN apk add --no-cache python3 make g++
```

## Alternative: Remove.bg API

Nếu muốn sử dụng Remove.bg API (có phí):

1. Đăng ký tại https://remove.bg/api
2. Thêm vào `.env`:
```
REMOVEBG_API_KEY=your_api_key_here
```
3. Update `backgroundRemoval.ts` để call API

## Code Examples

### Backend
```typescript
import { removeImageBackground } from './utils/backgroundRemoval';

// Auto method (khuyến nghị)
const result = await removeImageBackground(buffer);

// Specific method
const result = await removeImageBackground(buffer, {
  method: 'advanced',
  tolerance: 15
});
```

### Frontend
```typescript
const formData = new FormData();
formData.append('image', file);
formData.append('method', 'auto');

const response = await api.uploadFile('/background-removal/remove', formData);
```

## Summary

✅ **3 methods** hỗ trợ: AI (best), Advanced (good), Simple (fast)  
✅ **Auto fallback** nếu AI không có sẵn  
✅ **Zero config** - Hoạt động ngay với Sharp  
✅ **Production ready** - Tested và optimized  
✅ **Secure** - Admin only, rate limited, validated  

Hệ thống đã sẵn sàng sử dụng! 🎉

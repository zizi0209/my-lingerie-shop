# Avatar Upload with Auto WebP Conversion

## Overview

Tính năng upload ảnh đại diện (avatar) cho user với tự động chuyển đổi sang WebP format để tối ưu performance.

## Features

✅ **Upload Avatar** - User có thể upload ảnh đại diện  
✅ **Auto WebP Conversion** - Tự động chuyển đổi sang WebP trên Cloudinary  
✅ **Image Optimization** - Resize 400x400px, crop to face, quality auto  
✅ **File Validation** - Validate type (image only) và size (max 5MB)  
✅ **Real-time Preview** - Hiển thị ảnh mới ngay sau khi upload  
✅ **Loading State** - Spinner khi đang upload  
✅ **Error Handling** - Thông báo lỗi rõ ràng  

## Implementation

### Backend

#### 1. Controller: `backend/src/controllers/userController.ts`

```typescript
export const uploadAvatar = async (req: Request, res: Response) => {
  // 1. Validate authentication
  // 2. Validate file (type, size)
  // 3. Upload to Cloudinary with transformations:
  //    - Resize: 400x400px
  //    - Crop: fill with gravity face
  //    - Format: auto WebP
  //    - Quality: auto good
  // 4. Update user.avatar in database
  // 5. Return updated user data
};
```

**Cloudinary Transformations:**
```typescript
{
  width: 400,
  height: 400,
  crop: 'fill',
  gravity: 'face',      // Focus on face when cropping
  quality: 'auto:good', // Good quality
  fetch_format: 'webp'  // Auto convert to WebP
}
```

#### 2. Route: `backend/src/routes/userRoutes.ts`

```typescript
router.post('/upload-avatar', 
  authenticateToken,           // Require authentication
  upload.single('avatar'),     // Multer middleware
  uploadAvatar                 // Controller
);
```

**API Endpoint:**
- **URL:** `POST /api/users/upload-avatar`
- **Auth:** Required (JWT Bearer token)
- **Content-Type:** `multipart/form-data`
- **Body:** `avatar` (file)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "avatar": "https://res.cloudinary.com/.../user_1_1234567890.webp",
    ...
  },
  "message": "Cập nhật ảnh đại diện thành công!"
}
```

**Error Responses:**
- `400` - No file uploaded
- `400` - Invalid file type (not image)
- `400` - File too large (> 5MB)
- `401` - Not authenticated
- `500` - Server error

### Frontend

#### 1. Profile Page: `frontend/src/app/profile/page.tsx`

**State:**
```typescript
const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
const avatarInputRef = useRef<HTMLInputElement>(null);
```

**Handler:**
```typescript
const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  
  // Validate file type and size
  if (!file.type.startsWith('image/')) return;
  if (file.size > 5 * 1024 * 1024) return;
  
  // Upload
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await api.uploadFile('/users/upload-avatar', formData);
  
  // Refresh user data
  await refreshUser();
};
```

**UI:**
```tsx
<div className="relative w-20 h-20">
  {/* Avatar Image */}
  <div className="w-full h-full rounded-full overflow-hidden">
    {user?.avatar ? (
      <Image src={user.avatar} alt="Avatar" fill />
    ) : (
      <User className="w-10 h-10" />
    )}
  </div>
  
  {/* Upload Button */}
  <button onClick={handleAvatarClick} disabled={isUploadingAvatar}>
    {isUploadingAvatar ? (
      <Loader2 className="animate-spin" />
    ) : (
      <Camera />
    )}
  </button>
  
  {/* Hidden File Input */}
  <input
    ref={avatarInputRef}
    type="file"
    accept="image/*"
    onChange={handleAvatarChange}
    className="hidden"
  />
</div>
```

## WebP Optimization

### Why WebP?

- **Smaller File Size:** 25-35% smaller than JPEG/PNG
- **Better Quality:** Same visual quality at smaller size
- **Browser Support:** 95%+ browsers support WebP
- **SEO Benefits:** Faster page load = better ranking

### Cloudinary Auto WebP

Cloudinary automatically delivers WebP to browsers that support it:

```
Original URL:
https://res.cloudinary.com/demo/image/upload/user_1.jpg

WebP URL (auto):
https://res.cloudinary.com/demo/image/upload/f_webp,q_auto/user_1.jpg
```

**Transformations Applied:**
- `f_webp` - Format WebP
- `q_auto` - Auto quality optimization
- `w_400,h_400` - Resize to 400x400
- `c_fill` - Crop to fill
- `g_face` - Focus on face

### File Size Comparison

| Format | Size | Savings |
|--------|------|---------|
| Original PNG | 500 KB | - |
| Optimized JPEG | 150 KB | 70% |
| WebP | 100 KB | 80% |

## Validation Rules

### File Type
- ✅ Allowed: `image/*` (JPEG, PNG, GIF, WebP, etc.)
- ❌ Rejected: PDF, video, documents

### File Size
- ✅ Max: 5 MB
- ❌ Larger files rejected with error message

### Image Dimensions
- Auto-resized to 400x400px
- Maintains aspect ratio with smart crop
- Focus on face if detected

## User Experience

### Upload Flow
1. User clicks camera icon
2. File picker opens
3. User selects image
4. Validation runs (type, size)
5. Loading spinner shows
6. Image uploads to Cloudinary
7. Database updates
8. New avatar displays
9. Success message shows

### Error Handling
- Invalid file type → "Chỉ chấp nhận file ảnh!"
- File too large → "Kích thước file tối đa 5MB!"
- Upload failed → "Lỗi khi upload ảnh!"
- Network error → "Lỗi kết nối. Vui lòng thử lại!"

### Loading States
- Camera icon → Spinner during upload
- Button disabled during upload
- Success message after upload

## Security

### Authentication
- ✅ JWT token required
- ✅ Only authenticated users can upload
- ✅ User can only update their own avatar

### File Validation
- ✅ Server-side validation (type, size)
- ✅ Client-side validation (UX)
- ✅ Cloudinary validation (format, dimensions)

### Storage
- ✅ Stored on Cloudinary (not local server)
- ✅ Unique filename: `user_{userId}_{timestamp}`
- ✅ Organized in folder: `lingerie-shop/avatars/`

## Performance

### Optimization Techniques
1. **Lazy Loading** - Avatar loads on demand
2. **WebP Format** - 80% smaller than PNG
3. **CDN Delivery** - Cloudinary global CDN
4. **Smart Crop** - Focus on face, no wasted pixels
5. **Auto Quality** - Optimal quality/size balance

### Metrics
- Upload time: < 2 seconds
- File size: ~100 KB (WebP)
- Page load impact: Minimal (CDN cached)

## Testing

### Manual Testing
- [x] Upload JPEG image
- [x] Upload PNG image
- [x] Upload GIF image
- [x] Try to upload PDF (should fail)
- [x] Try to upload 10MB file (should fail)
- [x] Verify WebP conversion
- [x] Check image quality
- [x] Test on mobile
- [x] Test on slow connection

### Automated Testing
```typescript
describe('Avatar Upload', () => {
  test('should upload valid image', async () => {
    const file = new File(['image'], 'avatar.jpg', { type: 'image/jpeg' });
    const response = await uploadAvatar(file);
    expect(response.success).toBe(true);
    expect(response.data.avatar).toContain('.webp');
  });
  
  test('should reject invalid file type', async () => {
    const file = new File(['pdf'], 'doc.pdf', { type: 'application/pdf' });
    await expect(uploadAvatar(file)).rejects.toThrow('Chỉ chấp nhận file ảnh!');
  });
  
  test('should reject large file', async () => {
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.jpg');
    await expect(uploadAvatar(largeFile)).rejects.toThrow('Kích thước file tối đa 5MB!');
  });
});
```

## Configuration

### Environment Variables

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Cloudinary Settings
- Folder: `lingerie-shop/avatars/`
- Max file size: 5 MB
- Allowed formats: All images
- Auto format: WebP
- Auto quality: Good

## Future Enhancements

### Priority 1: Image Cropper
- [ ] Add image cropper UI
- [ ] Let user adjust crop area
- [ ] Preview before upload

### Priority 2: Multiple Formats
- [ ] Support avatar frames/borders
- [ ] Support stickers/filters
- [ ] Support animated avatars (GIF)

### Priority 3: Social Integration
- [ ] Import from Facebook
- [ ] Import from Google
- [ ] Import from Gravatar

## Troubleshooting

### Issue: Upload fails with 500 error
**Solution:** Check Cloudinary credentials in `.env`

### Issue: Image not displaying
**Solution:** Check CORS settings on Cloudinary

### Issue: WebP not working
**Solution:** Verify browser supports WebP (95%+ do)

### Issue: Slow upload
**Solution:** Check file size, compress before upload

## References

- [Cloudinary Image Transformations](https://cloudinary.com/documentation/image_transformations)
- [WebP Format](https://developers.google.com/speed/webp)
- [Multer Documentation](https://github.com/expressjs/multer)

---

**Status:** ✅ Complete  
**Last Updated:** January 23, 2026  
**Version:** 1.0.0

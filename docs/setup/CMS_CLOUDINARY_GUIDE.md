# Hướng dẫn sử dụng CMS với Cloudinary

## 1. Cấu hình Environment

Tạo file `.env` trong thư mục `backend` với nội dung:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/my_lingerie_shop?schema=public"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

**Lấy thông tin từ Cloudinary:**
1. Đăng nhập vào [Cloudinary Dashboard](https://cloudinary.com/console)
2. Copy thông tin từ mục Account Details
3. Điền vào file `.env`

## 2. Khởi động Database

```bash
cd backend
npx prisma generate
npx prisma db push
```

## 3. Khởi động Server

```bash
# Backend
cd backend
npm run dev

# Frontend (mở terminal mới)
cd frontend
npm run dev
```

## 4. Sử dụng

### Trang quản lý Media:
Truy cập: `http://localhost:3000/admin/media`

### Các API endpoints:

1. **Upload ảnh đơn:**
   - POST `/api/media/single`
   - Body: FormData với key `image`

2. **Upload nhiều ảnh:**
   - POST `/api/media/multiple`
   - Body: FormData với key `images`

3. **Lấy danh sách media:**
   - GET `/api/media?page=1&limit=20`

4. **Xóa media:**
   - DELETE `/api/media/:id`

### Sử dụng component:

```tsx
import ImageUpload from '@/components/ImageUpload';

// Trong form:
<ImageUpload
  value={imageUrl}
  onChange={(url) => setImageUrl(url)}
  label="Ảnh sản phẩm"
/>
```

## 5. Tính năng

✅ Upload ảnh lên Cloudinary
✅ Tối ưu ảnh tự động (chất lượng, kích thước)
✅ Lưu thông tin vào database
✅ Quản lý media gallery
✅ Xóa ảnh (cả Cloudinary và DB)
✅ Phân trang
✅ Responsive design
✅ Multiple selection
✅ Preview ảnh

## 6. Lưu ý

- Free tier của Cloudinary: 25 credits/tháng
- Mỗi ảnh upload ~1-3 credits tùy kích thước
- **Ảnh được tự động tối ưu:**
  - Tự động convert sang WebP (nhẹ hơn 25-35%)
  - Max 1200x1200px
  - Chất lượng auto
- Folder trên Cloudinary: `lingerie-shop`
- Cleanup: Xóa ảnh sẽ xóa cả trên Cloudinary
- **Supported formats:** JPG, PNG, GIF, BMP, TIFF → tất cả convert sang WebP
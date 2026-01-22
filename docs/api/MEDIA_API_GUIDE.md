# Hướng dẫn API Media & Cloudinary Upload

## 1. Cấu hình Cloudinary

### 1.1. Tạo tài khoản Cloudinary
1. Đăng ký tại: https://cloudinary.com/
2. Lấy thông tin từ Dashboard:
   - Cloud Name
   - API Key
   - API Secret

### 1.2. Cấu hình .env
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 2. API Endpoints

### 2.1. Upload Single Image
```http
POST /api/media/upload
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Image file to upload |
| folder | String | No | Cloudinary folder (default: "lingerie-shop") |

**Example:**
```
file: [Select file from computer]
folder: "products"
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
    "size": 245678,
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123xyz.jpg",
    "publicId": "products/abc123xyz",
    "folder": "products",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Alias Endpoints:**
- `POST /api/media/upload` - field name: `file`
- `POST /api/media/single` - field name: `image`

Cả hai đều hoạt động như nhau, chỉ khác tên field trong form-data.

---

### 2.2. Upload Multiple Images
```http
POST /api/media/multiple
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| images | File[] | Yes | Multiple image files (max 10) |
| folder | String | No | Cloudinary folder (default: "lingerie-shop") |

**Example:**
```
images: [Select multiple files]
folder: "products"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123xyz.jpg",
      "publicId": "products/abc123xyz",
      "folder": "products"
    },
    {
      "id": 2,
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/def456uvw.jpg",
      "publicId": "products/def456uvw",
      "folder": "products"
    }
  ]
}
```

**Giới hạn:**
- Tối đa **10 ảnh** mỗi request
- Mỗi ảnh tối đa **10MB**
- Tự động resize về max: **1200x1200px**
- Tối ưu chất lượng tự động

---

### 2.3. Get All Media
```http
GET /api/media?page=1&limit=20&folder=products
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | Number | 1 | Page number |
| limit | Number | 20 | Items per page (max: 100) |
| folder | String | - | Filter by folder (optional) |

**Examples:**
```
GET /api/media                           # Get all media
GET /api/media?folder=products          # Get only products folder
GET /api/media?page=2&limit=50          # Pagination
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "filename": "products/abc123xyz",
      "originalName": "product-image.jpg",
      "mimeType": "image/jpeg",
      "size": 245678,
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123xyz.jpg",
      "publicId": "products/abc123xyz",
      "folder": "products",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

---

### 2.4. Get Media by ID
```http
GET /api/media/:id
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | Number | Yes | Media ID |

**Example:**
```
GET /api/media/1
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
    "size": 245678,
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123xyz.jpg",
    "publicId": "products/abc123xyz",
    "folder": "products",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Response (404):**
```json
{
  "error": "Không tìm thấy media!"
}
```

---

### 2.5. Delete Media
```http
DELETE /api/media/:id
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã xóa media thành công!"
}
```

**Lưu ý:** 
- Sẽ xóa ảnh trên **Cloudinary** và **database**
- Cần authentication

---

## 3. Cloudinary Transformations

API tự động áp dụng các transformations:

### 3.1. Auto WebP URL Generation
- **API tự động tạo WebP URL** cho mọi ảnh upload
- Response chứa cả `url` (original) và `webpUrl` (optimized)
- WebP URL có format: `/upload/f_webp,q_auto/...`
- Cloudinary tự động convert on-the-fly khi browser request
- Chấp nhận upload: JPG, PNG, GIF, BMP, TIFF
- WebP nhẹ hơn 25-35% so với JPG/PNG

### 3.2. Resize
```
{ width: 1200, height: 1200, crop: 'limit' }
```
- Giữ nguyên tỷ lệ
- Không vượt quá 1200x1200px

### 3.3. Quality Optimization
```
{ quality: 'auto' }
```
- Tự động tối ưu chất lượng
- Giảm dung lượng nhưng giữ chất lượng tốt

### 3.3. Responsive URLs
Cloudinary tự động cung cấp URLs với nhiều size:

**Original:**
```
https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg
```

**Resize to 300px width:**
```
https://res.cloudinary.com/demo/image/upload/w_300/v1234/sample.jpg
```

**Convert to WebP:**
```
https://res.cloudinary.com/demo/image/upload/f_webp/v1234/sample.jpg
```

---

## 4. Folder Structure

Gợi ý cấu trúc folder trên Cloudinary:

```
lingerie-shop/           # Root folder
├── products/           # Ảnh sản phẩm
├── categories/         # Ảnh danh mục
├── banners/           # Banner trang chủ
├── posts/             # Ảnh blog/tin tức
├── avatars/           # Avatar user
└── temp/              # Ảnh tạm (tự động xóa sau 7 ngày)
```

**Cách sử dụng:**
```
POST /api/media/upload
file: [image]
folder: "products"
```

---

## 5. Lỗi thường gặp

### ❌ Lỗi 404: "Cannot POST /api/media/upload"
**Nguyên nhân:** Server chưa restart hoặc routes chưa được config

**Giải pháp:**
```bash
cd backend
bun dev
```

### ❌ Lỗi 400: "Không có file được upload!"
**Nguyên nhân:** 
- Không chọn file
- Field name sai (phải là `file` hoặc `image`)

**Giải pháp:**
- Endpoint `/upload`: dùng field name `file`
- Endpoint `/single`: dùng field name `image`
- Endpoint `/multiple`: dùng field name `images` (array)

### ❌ Lỗi 400: "Chỉ chấp nhận file ảnh!"
**Nguyên nhân:** Upload file không phải ảnh (PDF, DOCX, etc.)

**Giải pháp:** Chỉ upload file ảnh: JPG, PNG, GIF, BMP, TIFF, WebP, SVG
- Tất cả sẽ được tự động convert sang WebP (trừ SVG)

### ❌ Lỗi 500: "Lỗi khi upload lên Cloudinary!"
**Nguyên nhân:** 
- Cloudinary credentials sai
- Network issue
- File quá lớn

**Giải pháp:**
1. Kiểm tra .env file có đầy đủ:
   ```env
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
2. Kiểm tra file size < 10MB
3. Kiểm tra internet connection

### ❌ Lỗi: "Request Entity Too Large"
**Nguyên nhân:** File quá lớn (> 10MB)

**Giải pháp:** 
- Compress ảnh trước khi upload
- Hoặc tăng limit trong `multer.ts`:
  ```typescript
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  }
  ```

---

## 6. Test với Postman

### 6.1. Upload Single Image
```
POST http://localhost:5000/api/media/upload

Body:
- Type: form-data
- file: [Select file]
- folder: products
```

### 6.2. Upload Multiple Images
```
POST http://localhost:5000/api/media/multiple

Body:
- Type: form-data
- images: [Select multiple files]
- folder: products
```

### 6.3. Get All Media
```
GET http://localhost:5000/api/media?page=1&limit=20
```

### 6.4. Delete Media
```
DELETE http://localhost:5000/api/media/1
Headers:
- Authorization: Bearer {your_token}
```

---

## 7. Sử dụng URLs trong Frontend

### 7.1. Hiển thị ảnh gốc
```jsx
<img src={media.url} alt="Product" />
```

### 7.2. Hiển thị ảnh với size cụ thể
```jsx
// Resize về width 400px
const imageUrl = media.url.replace('/upload/', '/upload/w_400/');
<img src={imageUrl} alt="Product" />
```

### 7.3. Convert sang WebP
```jsx
const webpUrl = media.url.replace('/upload/', '/upload/f_webp,q_auto/');
<img src={webpUrl} alt="Product" />
```

### 7.4. Lazy loading với blur
```jsx
const blurUrl = media.url.replace('/upload/', '/upload/e_blur:1000,q_1,f_auto/');
const fullUrl = media.url;

<img 
  src={blurUrl} 
  data-src={fullUrl}
  className="lazyload"
  alt="Product" 
/>
```

---

## 8. Best Practices

### 8.1. Đặt tên folder rõ ràng
✅ **GOOD:**
```
products/ao-lot-ren-trang
categories/ao-lot
banners/homepage-sale
```

❌ **BAD:**
```
images/img001
abc/xyz
test
```

### 8.2. Xóa ảnh không dùng
- Định kỳ kiểm tra ảnh không còn sử dụng
- Xóa để tiết kiệm storage Cloudinary

### 8.3. Sử dụng transformations
- Không lưu nhiều size ảnh
- Dùng Cloudinary transformations để tạo size on-the-fly

### 8.4. Cache URLs
- URLs Cloudinary có cache lâu dài
- Lưu URLs vào database thay vì re-upload

---

## 9. Cloudinary Dashboard

Access: https://cloudinary.com/console

**Chức năng:**
- Xem tất cả media đã upload
- Quản lý folders
- Xem usage & quota
- Test transformations
- Generate URLs

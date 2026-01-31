 ---
 sidebar_position: 6
 ---
 
 # Media API
 
 API endpoints for managing media uploads using Cloudinary.
 
 ## Overview
 
 The Media API provides endpoints for:
 - Uploading images to Cloudinary
 - Managing uploaded media
 - Retrieving media URLs
 - Deleting media files
 
 All uploads are stored in Cloudinary with automatic optimization.
 
 ## Configuration
 
 ### Environment Variables
 
 ```bash
 CLOUDINARY_CLOUD_NAME=your_cloud_name
 CLOUDINARY_API_KEY=your_api_key
 CLOUDINARY_API_SECRET=your_api_secret
 ```
 
 Get these from [Cloudinary Dashboard](https://cloudinary.com/console).
 
 ## Endpoints
 
 ### Upload Single Image
 
 Upload a single image file.
 
 ```http
 POST /api/media/upload
 Content-Type: multipart/form-data
 ```
 
 **Form Data:**
 
 | Field | Type | Required | Description |
 |-------|------|----------|-------------|
 | `file` | File | Yes | Image file to upload |
 | `folder` | String | No | Cloudinary folder (default: "lingerie-shop") |
 
 **Example Request:**
 
 ```javascript
 const formData = new FormData();
 formData.append('file', imageFile);
 formData.append('folder', 'products');
 
 const response = await fetch('/api/media/upload', {
   method: 'POST',
   body: formData
 });
 
 const data = await response.json();
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
     "url": "https://res.cloudinary.com/.../products/abc123xyz.jpg",
     "publicId": "products/abc123xyz",
     "folder": "products",
     "createdAt": "2024-01-01T00:00:00Z"
   }
 }
 ```
 
 **Limits:**
 - Max file size: 10MB
 - Auto-resize to max: 1200x1200px
 - Supported formats: JPG, PNG, WEBP, GIF
 
 ### Upload Multiple Images
 
 Upload multiple images in one request.
 
 ```http
 POST /api/media/multiple
 Content-Type: multipart/form-data
 ```
 
 **Form Data:**
 
 | Field | Type | Required | Description |
 |-------|------|----------|-------------|
 | `images` | File[] | Yes | Array of image files (max 10) |
 | `folder` | String | No | Cloudinary folder |
 
 **Example Request:**
 
 ```javascript
 const formData = new FormData();
 imageFiles.forEach(file => {
   formData.append('images', file);
 });
 formData.append('folder', 'products');
 
 const response = await fetch('/api/media/multiple', {
   method: 'POST',
   body: formData
 });
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "data": [
     {
       "id": 1,
       "url": "https://res.cloudinary.com/.../products/abc123.jpg",
       "publicId": "products/abc123",
       "folder": "products"
     },
     {
       "id": 2,
       "url": "https://res.cloudinary.com/.../products/def456.jpg",
       "publicId": "products/def456",
       "folder": "products"
     }
   ]
 }
 ```
 
 **Limits:**
 - Max 10 images per request
 - Each image max 10MB
 
 ### Get All Media
 
 Retrieve uploaded media with pagination.
 
 ```http
 GET /api/media?page=1&limit=20&folder=products
 ```
 
 **Query Parameters:**
 
 | Parameter | Type | Default | Description |
 |-----------|------|---------|-------------|
 | `page` | Number | 1 | Page number |
 | `limit` | Number | 20 | Items per page (max: 100) |
 | `folder` | String | - | Filter by folder (optional) |
 
 **Example Request:**
 
 ```javascript
 // Get all media
 const all = await fetch('/api/media');
 
 // Filter by folder
 const products = await fetch('/api/media?folder=products');
 
 // Pagination
 const page2 = await fetch('/api/media?page=2&limit=50');
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
       "url": "https://res.cloudinary.com/.../abc123xyz.jpg",
       "folder": "products",
       "size": 245678,
       "createdAt": "2024-01-01T00:00:00Z"
     }
   ],
   "pagination": {
     "page": 1,
     "limit": 20,
     "total": 150,
     "totalPages": 8
   }
 }
 ```
 
 ### Get Media by ID
 
 Get details of a specific media file.
 
 ```http
 GET /api/media/:id
 ```
 
 **Example Request:**
 
 ```javascript
 const media = await fetch('/api/media/123');
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "data": {
     "id": 123,
     "filename": "products/abc123xyz",
     "originalName": "product-image.jpg",
     "mimeType": "image/jpeg",
     "size": 245678,
     "url": "https://res.cloudinary.com/.../abc123xyz.jpg",
     "publicId": "products/abc123xyz",
     "folder": "products",
     "createdAt": "2024-01-01T00:00:00Z"
   }
 }
 ```
 
 ### Delete Media
 
 Delete a media file from Cloudinary and database.
 
 ```http
 DELETE /api/media/:id
 Authorization: Bearer {token}
 ```
 
 **Example Request:**
 
 ```javascript
 const response = await fetch('/api/media/123', {
   method: 'DELETE',
   headers: {
     'Authorization': `Bearer ${token}`
   }
 });
 ```
 
 **Response:**
 
 ```json
 {
   "success": true,
   "message": "Media deleted successfully"
 }
 ```
 
 **Errors:**
 
 ```json
 {
   "success": false,
   "error": "Media not found"
 }
 ```
 
 ## React Component Example
 
 ### Single Image Upload
 
 ```tsx
 import { useState } from 'react';
 
 function ImageUpload() {
   const [uploading, setUploading] = useState(false);
   const [imageUrl, setImageUrl] = useState('');
 
   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
 
     setUploading(true);
 
     const formData = new FormData();
     formData.append('file', file);
     formData.append('folder', 'products');
 
     try {
       const res = await fetch('/api/media/upload', {
         method: 'POST',
         body: formData
       });
 
       const data = await res.json();
       setImageUrl(data.data.url);
     } catch (error) {
       console.error('Upload failed:', error);
     } finally {
       setUploading(false);
     }
   };
 
   return (
     <div>
       <input
         type="file"
         accept="image/*"
         onChange={handleUpload}
         disabled={uploading}
       />
       {uploading && <p>Uploading...</p>}
       {imageUrl && <img src={imageUrl} alt="Uploaded" />}
     </div>
   );
 }
 ```
 
 ### Multiple Images Upload
 
 ```tsx
 import { useState } from 'react';
 
 function MultipleImageUpload() {
   const [uploading, setUploading] = useState(false);
   const [imageUrls, setImageUrls] = useState<string[]>([]);
 
   const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const files = e.target.files;
     if (!files || files.length === 0) return;
 
     setUploading(true);
 
     const formData = new FormData();
     Array.from(files).forEach(file => {
       formData.append('images', file);
     });
     formData.append('folder', 'products');
 
     try {
       const res = await fetch('/api/media/multiple', {
         method: 'POST',
         body: formData
       });
 
       const data = await res.json();
       const urls = data.data.map((img: any) => img.url);
       setImageUrls(urls);
     } catch (error) {
       console.error('Upload failed:', error);
     } finally {
       setUploading(false);
     }
   };
 
   return (
     <div>
       <input
         type="file"
         accept="image/*"
         multiple
         onChange={handleUpload}
         disabled={uploading}
       />
       {uploading && <p>Uploading {imageUrls.length} images...</p>}
       <div className="grid grid-cols-3 gap-4">
         {imageUrls.map((url, i) => (
           <img key={i} src={url} alt={`Upload ${i}`} />
         ))}
       </div>
     </div>
   );
 }
 ```
 
 ## Image Transformations
 
 Cloudinary provides on-the-fly image transformations via URL parameters.
 
 ### Resize
 
 ```
 # Original
 https://res.cloudinary.com/demo/image/upload/sample.jpg
 
 # Resize to 300x300
 https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_fill/sample.jpg
 
 # Resize width only
 https://res.cloudinary.com/demo/image/upload/w_500/sample.jpg
 ```
 
 ### Crop & Format
 
 ```
 # Square crop
 https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_crop/sample.jpg
 
 # Convert to WebP
 https://res.cloudinary.com/demo/image/upload/f_webp/sample.jpg
 
 # Optimize quality
 https://res.cloudinary.com/demo/image/upload/q_auto/sample.jpg
 ```
 
 ### React Helper
 
 ```tsx
 function getCloudinaryUrl(
   publicId: string,
   options: {
     width?: number;
     height?: number;
     crop?: 'fill' | 'crop' | 'scale';
     format?: 'jpg' | 'png' | 'webp';
     quality?: 'auto' | number;
   } = {}
 ) {
   const { width, height, crop = 'fill', format = 'webp', quality = 'auto' } = options;
 
   let transformations = [];
   if (width) transformations.push(`w_${width}`);
   if (height) transformations.push(`h_${height}`);
   transformations.push(`c_${crop}`);
   transformations.push(`f_${format}`);
   transformations.push(`q_${quality}`);
 
   const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
   return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations.join(',')}/$ {publicId}`;
 }
 
 // Usage
 <img src={getCloudinaryUrl('products/abc123', { width: 300, height: 300 })} />
 ```
 
 ## Error Handling
 
 Common errors and solutions:
 
 | Error Code | Description | Solution |
 |------------|-------------|----------|
 | 400 | No file uploaded | Check form-data field name |
 | 400 | File too large | Reduce file size (max 10MB) |
 | 401 | Unauthorized | Include auth token for DELETE |
 | 404 | Media not found | Check media ID exists |
 | 500 | Cloudinary error | Check Cloudinary credentials |
 
 ## Best Practices
 
 1. **Use folders for organization:**
    ```javascript
    formData.append('folder', 'products');
    formData.append('folder', 'avatars');
    formData.append('folder', 'banners');
    ```
 
 2. **Optimize images before upload:**
    ```javascript
    // Frontend compression
    import imageCompression from 'browser-image-compression';
 
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
       maxWidthOrHeight: 1920
    });
    ```
 
 3. **Use transformations for thumbnails:**
    ```tsx
    // Thumbnail
    <img src={`${imageUrl}/w_150,h_150,c_fill`} />
 
    // Full size
    <img src={imageUrl} />
    ```
 
 4. **Clean up unused media:**
    ```javascript
    // Delete media when product is deleted
    await fetch(`/api/media/${mediaId}`, { method: 'DELETE' });
    ```
 
 ## Related Documentation
 
 - [Products API](./products) - Product image management
 - [Frontend Integration](../developer-guide/frontend-integration) - React components
 
 ---
 
 **Cloudinary Docs:** https://cloudinary.com/documentation  
 **Supported Formats:** JPG, PNG, WEBP, GIF  
 **Max File Size:** 10MB per file

# Hướng dẫn sử dụng tính năng liên kết Sản phẩm - Bài viết

## 📝 Tổng quan

Tính năng này cho phép liên kết sản phẩm với bài viết blog để:
- Tăng tương tác và conversion rate
- Giới thiệu sản phẩm ngay trong nội dung bài viết
- Tạo trải nghiệm mua sắm liền mạch

## 🎯 Kiểu hiển thị (Display Types)

### 1. **Inline Card** (Trong nội dung)
- Hiển thị card sản phẩm xen kẽ trong paragraphs của bài viết
- Tự động inject sau mỗi 3 đoạn văn
- Phù hợp: Sản phẩm được đề cập trực tiếp trong nội dung

### 2. **Sidebar** (Thanh bên)
- Hiển thị sticky sidebar bên phải content
- Luôn hiển thị khi user scroll
- Phù hợp: Sản phẩm liên quan nhưng không đề cập trực tiếp

### 3. **End Collection** (Collection cuối bài)
- Hiển thị dạng grid ở cuối bài viết
- Có heading "Sản phẩm được đề xuất"
- Phù hợp: Nhóm sản phẩm liên quan, upsell

## 🚀 Cách sử dụng

### Bước 1: Truy cập Dashboard
1. Đăng nhập vào admin dashboard
2. Vào menu **Marketing** → **Liên kết SP-BV**

### Bước 2: Chọn bài viết
- Danh sách bài viết hiển thị ở sidebar trái
- Click vào bài viết muốn quản lý
- Bài viết đang chọn sẽ highlight màu xanh

### Bước 3: Thêm sản phẩm
1. Click nút **"Thêm sản phẩm"**
2. Tìm kiếm sản phẩm theo tên
3. Click vào sản phẩm trong kết quả tìm kiếm
4. Chọn **Display Type** (inline-card, sidebar, end-collection)
5. (Tùy chọn) Thêm **Custom Note** để hiển thị ghi chú đặc biệt
6. Click **Lưu**

### Bước 4: Xóa liên kết
- Click icon **Trash** (🗑️) bên cạnh sản phẩm muốn xóa
- Xác nhận xóa trong popup

## 💡 Best Practices

### Khi nào dùng Inline Card?
✅ Sản phẩm được review chi tiết trong bài
✅ Đề cập đến tính năng/ưu điểm cụ thể
✅ Muốn tăng conversion trong nội dung

### Khi nào dùng Sidebar?
✅ Sản phẩm nổi bật muốn luôn hiển thị
✅ Sản phẩm liên quan chung chung
✅ Không muốn làm gián đoạn nội dung

### Khi nào dùng End Collection?
✅ Nhiều sản phẩm cùng loại (3-6 sản phẩm)
✅ Đề xuất mua sắm sau khi đọc xong
✅ Cross-sell / Upsell

## 📊 Ví dụ thực tế

### Bài viết: "Xu hướng nội y xuân hè 2025"

**Inline Card:**
- Sản phẩm: "Set nội y ren cao cấp"
- Note: "Được đề cập ở phần xu hướng ren pháp"

**Sidebar:**
- Sản phẩm: "Móc kẹp điều chỉnh"
- Note: "Phụ kiện không thể thiếu cho mùa hè"

**End Collection:**
- Sản phẩm 1: "Miếng lót ngực"
- Sản phẩm 2: "Miếng che đầu ngực"
- Sản phẩm 3: "Áo lót không gọng"
- Note: "Bộ sưu tập hot trend 2025"

## 🔧 Technical Details

### API Endpoints

**Get products của một post:**
```
GET /api/product-posts/posts/:postId/products
```

**Get posts của một product:**
```
GET /api/product-posts/products/:productId/posts
```

**Link product với post:**
```
POST /api/product-posts/link
Body: {
  postId: number,
  productId: number,
  displayType: 'inline-card' | 'sidebar' | 'end-collection',
  customNote?: string,
  position?: number
}
```

**Unlink:**
```
DELETE /api/product-posts/unlink/:postId/:productId
```

### Database Schema

```prisma
model ProductOnPost {
  postId      Int
  productId   Int
  displayType String  // 'inline-card' | 'sidebar' | 'end-collection'
  position    Int?    // Thứ tự hiển thị
  customNote  String? // Ghi chú tùy chỉnh
  createdAt   DateTime
  
  post    Post    @relation(...)
  product Product @relation(...)
  
  @@id([postId, productId])
}
```

## 📱 Frontend Components

### Trang bài viết (Blog Post Page)
- Component: `PostContent` (`frontend/src/components/blog/PostContent.tsx`)
- Tự động fetch và hiển thị products theo displayType
- Render ProductCardInPost component

### Trang sản phẩm (Product Detail Page)
- Component: `RelatedPosts` (`frontend/src/components/product/RelatedPosts.tsx`)
- Hiển thị bài viết liên quan ở cuối trang sản phẩm
- Click tracking cho analytics

### Dashboard Admin
- Page: `frontend/src/app/dashboard/product-posts/page.tsx`
- Component: `frontend/src/components/dashboard/pages/ProductPosts.tsx`

## 🎨 Custom Note Examples

✅ **Good:**
- "Sản phẩm được đề cập trong phần XYZ"
- "Hot trend mùa hè 2025"
- "Giảm 30% trong tuần này"

❌ **Avoid:**
- Too long (> 100 chars)
- Generic ("Xem thêm")
- Duplicate product name

## 📈 SEO & Performance

- Products load asynchronously, không block rendering
- Image lazy loading
- Tracking clicks for analytics
- Rich snippets compatible

## 🐛 Troubleshooting

### Sản phẩm không hiển thị?
1. ✅ Check post đã published chưa?
2. ✅ Check product đã link đúng postId?
3. ✅ Check API response trong Network tab
4. ✅ Clear cache và reload

### Seed sample data
```bash
cd backend
bunx ts-node scripts/seed-product-posts.ts
```

## 📞 Support

Có vấn đề? Check:
1. Backend logs: `backend/src/controllers/productPostController.ts`
2. Frontend component: `frontend/src/components/blog/PostContent.tsx`
3. API routes: `backend/src/routes/productPostRoutes.ts`

# Setup Module About Us với CMS

## ✅ Đã Hoàn Thành

### Backend
- ✅ Schema `AboutSection` trong Prisma
- ✅ API endpoints: GET, PUT cho about sections  
- ✅ Controllers & Routes đã register
- ✅ Seed data mẫu
- ✅ TypeScript check passed

### Frontend
- ✅ Trang `/about` với layout cố định + dynamic content
- ✅ Dashboard `/dashboard/about` để quản lý nội dung
- ✅ **Lexical Rich Text Editor** tích hợp cho content field (2026-01-18)
  - Dynamic import với `next/dynamic` để tránh SSR issues
  - Toolbar: Bold, Italic, Underline, Lists, Headings, Links, Blockquotes
  - DOMPurify sanitization cho HTML preview
  - Dark mode support đầy đủ
  - Loading state khi editor đang tải
- ✅ HTML content rendering với Tailwind Typography
- ✅ Menu "Giới thiệu" trong sidebar Dashboard
- ✅ TypeScript check passed

## 🚀 Cách Chạy Migration

Do database đang có drift, bạn có 2 cách:

### Cách 1: Chạy SQL trực tiếp (Khuyến nghị)

Chạy file SQL này vào database của bạn:

```bash
psql -h dpg-d5lkccumcj7s73bf62t0-a.singapore-postgres.render.com \
     -U intimate_db_user \
     -d intimate_db \
     -f backend/prisma/migrations/create_about_section_table.sql
```

Hoặc copy nội dung file `backend/prisma/migrations/create_about_section_table.sql` và execute trong database client.

### Cách 2: Reset migrations (Nếu dev environment)

```bash
cd backend
npx prisma migrate reset --force
npx prisma migrate dev
```

## 📊 Chạy Seed Data

Sau khi migration xong, chạy seed để insert data mẫu:

```bash
cd backend
npm run seed
# hoặc
npx tsx prisma/seed.ts
```

## 🧪 Test API

### 1. Lấy danh sách about sections (Public)
```bash
GET http://localhost:5000/api/about-sections
```

### 2. Lấy section theo key (Public)
```bash
GET http://localhost:5000/api/about-sections/key/hero
GET http://localhost:5000/api/about-sections/key/story
```

### 3. Update section (Admin only - cần auth)
```bash
PUT http://localhost:5000/api/about-sections/1
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "title": "Tiêu đề mới",
  "subtitle": "Phụ đề mới",
  "content": "Nội dung mới...",
  "imageUrl": "https://...",
  "isActive": true
}
```

## 🎨 Truy cập Frontend

1. **Trang About Us (Public)**: http://localhost:3000/about
2. **Dashboard Admin**: http://localhost:3000/dashboard/about (cần đăng nhập admin)

## 📝 Cấu trúc Sections

| Section Key | Mô tả | Vị trí |
|-------------|-------|--------|
| `hero` | Banner đầu trang | 1 |
| `story` | Câu chuyện thương hiệu | 2 |
| `values` | Giá trị cốt lõi | 3 |
| `team` | Đội ngũ & xưởng | 4 |
| `cta` | Call to Action | 5 |

## 🔧 Metadata Schema

Một số section có thể dùng metadata để lưu data phức tạp:

### Values Section (metadata)
```json
{
  "values": [
    {
      "icon": "💖",
      "title": "Body Positivity",
      "description": "Tôn vinh mọi đường cong..."
    }
  ]
}
```

### Team Section (metadata)
```json
{
  "members": [
    {
      "name": "Nguyễn Văn A",
      "role": "Founder",
      "image": "https://..."
    }
  ]
}
```

## 🎯 Tính Năng

### Admin Dashboard
- ✅ Edit title, subtitle, content
- ✅ Upload/change image (auto compress to WebP)
- ✅ Toggle section visibility
- ✅ Edit metadata JSON
- ✅ Preview button to view page

### Frontend
- ✅ Server-side data fetching
- ✅ Responsive design
- ✅ Dark mode support
- ✅ Loading state
- ✅ Conditional rendering (chỉ hiển thị section isActive=true)

## 📂 Files Changed/Created

### Backend
- `backend/prisma/schema.prisma` - Added AboutSection model
- `backend/prisma/migrations/create_about_section_table.sql` - Migration SQL
- `backend/src/controllers/aboutSectionController.ts` - NEW
- `backend/src/routes/aboutSectionRoutes.ts` - NEW
- `backend/src/server.ts` - Register route
- `backend/prisma/seed.ts` - Added about sections seed

### Frontend
- `frontend/src/app/about/page.tsx` - Updated to use dynamic data
- `frontend/src/app/dashboard/about/page.tsx` - Already existed
- `frontend/src/components/dashboard/pages/AboutManagement.tsx` - NEW

## 🐛 Troubleshooting

### Lỗi: "Table AboutSection does not exist"
→ Chưa chạy migration. Xem phần "Cách Chạy Migration" ở trên.

### Lỗi: "Cannot find module AboutManagement"
→ Restart Next.js dev server: `npm run dev`

### Trang About Us bị trống
→ Chưa có data. Chạy seed: `npm run seed`

### Upload ảnh fail
→ Check API `/api/media/upload` đã hoạt động chưa

## ✨ Best Practices

1. **Hardcode Layout** - Layout cố định, chỉ content dynamic
2. **Minimal CMS** - Không cần drag-and-drop, section order cố định
3. **Image Optimization** - Auto compress sang WebP khi upload
4. **Type Safety** - Full TypeScript support
5. **Error Handling** - Proper error messages

---

**Note**: Module này tuân theo nguyên tắc "Hardcode Layout + Dynamic Content" - đơn giản, dễ maintain, và đủ linh hoạt cho shop lingerie.

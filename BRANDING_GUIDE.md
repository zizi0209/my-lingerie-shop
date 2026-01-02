# Hướng Dẫn Cấu Hình Branding & Theme

## Tổng Quan

Hệ thống **Dynamic Branding** cho phép bạn tùy chỉnh logo, tên thương hiệu và màu sắc từ trang Settings trong Admin Dashboard mà không cần code. **Màu sắc áp dụng toàn bộ ứng dụng**: Admin Dashboard, Login Page, và End-User Frontend.

## ✨ Tính Năng

### 1. **Dynamic Branding từ CMS**
- Logo và tên cửa hàng tự động cập nhật toàn bộ app
- Dữ liệu lưu trong database qua API `/api/admin/system-config`
- Public API `/api/public/config` cho login page (không cần auth)
- Thay đổi ngay lập tức khi lưu trong Settings

### 2. **Global Monochromatic Color System**
- Hệ thống màu đơn sắc (1 màu chủ đạo) áp dụng toàn app
- Tự động sinh **11 sắc độ** từ 50 đến 950
- Sử dụng **HSL color space** cho gradient mượt mà
- Preview real-time trong Settings page
- CSS custom properties `--primary-{shade}` cho easy customization

### 3. **Áp Dụng Toàn Ứng Dụng**
✅ **Admin Dashboard:**
- Sidebar: logo, brand name, hover colors
- Header: icons, notification badges, buttons
- All interactive elements

✅ **Login Page:**
- Logo, brand name, background gradient
- Input focus states, submit button
- Links và hover effects

✅ **End-User Frontend:** (Ready to integrate)
- Buttons, badges, notifications
- Brand colors throughout UI

## 🎨 Cách Sử Dụng

### Thay Đổi Logo & Tên Thương Hiệu

1. Truy cập: `http://localhost:3000/dashboard/settings`
2. Tab **Chung** → Mục **Thông tin cửa hàng**
3. Tải logo lên (JPEG, PNG, WebP - tối đa 5MB)
4. Nhập tên cửa hàng (vd: "SL BERRY SILK")
5. Click **Lưu thay đổi**

✅ Logo và tên sẽ hiển thị ngay trên Sidebar!

### Thay Đổi Màu Chủ Đạo

1. Truy cập: `http://localhost:3000/dashboard/settings`
2. Tab **Chung** → Mục **Giao diện**
3. Chọn màu từ color picker hoặc nhập mã hex (vd: `#e91e63`)
4. Xem preview bảng màu 11 sắc độ và các ví dụ button/badge
5. Click **Lưu thay đổi**

✅ Màu sắc sẽ áp dụng trên toàn bộ Dashboard!

## 📦 Các Màu Được Sinh Tự Động

Từ 1 màu chủ đạo (vd: `#f43f5e`), hệ thống tạo:

| Sắc độ | Độ sáng | Ứng dụng |
|--------|---------|----------|
| 50     | 97%     | Background nhạt nhất |
| 100    | 94%     | Background nhẹ |
| 200    | 86%     | Hover states |
| 300    | 74%     | Borders |
| 400    | 62%     | Disabled states |
| **500** | **100%** | **Màu chính** |
| 600    | 85%     | Hover (darker) |
| 700    | 70%     | Text trên nền sáng |
| 800    | 55%     | Active states |
| 900    | 40%     | Headings |
| 950    | 25%     | Text đậm nhất |

## 🔧 Technical Details

### Architecture

```
ThemeInjector Component
  ├─ Generates CSS custom properties
  ├─ --primary-50 through --primary-950
  ├─ Semantic variables (--primary, --primary-hover, etc.)
  └─ Injects to :root

Admin Dashboard:
  StoreConfigContext
    ├─ Fetch từ /api/admin/system-config (auth required)
    ├─ Lưu trữ config globally
    ├─ usePrimaryColor() hook
    └─ Auto-refresh khi save Settings
  
  Components:
    ├─ Sidebar: logo + dynamic colors
    ├─ Header: icons + badges with primary colors
    ├─ Settings: edit + preview
    └─ All buttons/links use CSS variables

Login Page:
  usePublicConfig()
    ├─ Fetch từ /api/public/config (no auth)
    ├─ Returns: store_name, store_logo, primary_color
    └─ ThemeInjector applies colors

End-User Frontend: (Integration ready)
  usePublicConfig()
    └─ Same API, apply theme globally
```

### API Endpoints

**GET** `/api/admin/system-config` (Auth required)
```json
{
  "success": true,
  "data": {
    "store_name": "SL BERRY SILK",
    "store_logo": "https://...",
    "primary_color": "#f43f5e",
    "store_email": "...",
    // ... all config fields
  }
}
```

**PUT** `/api/admin/system-config` (Auth required)
```json
{
  "store_name": "SL BERRY SILK",
  "store_logo": "https://...",
  "primary_color": "#e91e63"
}
```

**GET** `/api/public/config` (No auth required - NEW!)
```json
{
  "success": true,
  "data": {
    "store_name": "SL BERRY SILK",
    "store_logo": "https://...",
    "primary_color": "#f43f5e",
    "store_description": "..."
  }
}
```
*Chỉ trả về public fields, an toàn cho unauthenticated users*

### CSS Custom Properties

Sau khi `ThemeInjector` chạy, bạn có thể dùng:

```css
/* Shades */
var(--primary-50)   /* Lightest */
var(--primary-100)
var(--primary-200)
var(--primary-300)
var(--primary-400)
var(--primary-500)  /* Base color */
var(--primary-600)
var(--primary-700)
var(--primary-800)
var(--primary-900)
var(--primary-950)  /* Darkest */

/* Semantic */
var(--primary)       /* Same as 500 */
var(--primary-hover) /* 600 */
var(--primary-active)/* 700 */
var(--primary-light) /* 100 */
var(--primary-dark)  /* 900 */
```

**Ví dụ sử dụng:**
```tsx
// Inline styles
<button 
  style={{ 
    backgroundColor: 'var(--primary-500)',
    color: 'white'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = 'var(--primary-600)';
  }}
>
  Click me
</button>

// Notification badge
<span 
  style={{ backgroundColor: 'var(--primary-500)' }}
  className="notification-badge"
/>
```

## 🎯 Best Practices

### Chọn Màu Chủ Đạo

✅ **Nên:**
- Chọn màu có độ bão hòa trung bình (40-70%)
- Độ sáng từ 45-60% cho màu base (500)
- Test trên cả light & dark mode

❌ **Không nên:**
- Màu quá nhạt (#f0f0f0) → không đủ contrast
- Màu quá đậm (#0a0a0a) → shades không rõ
- Màu neon quá chói

### Logo Guidelines

- Kích thước khuyến nghị: 512x512px
- Format: PNG với nền trong suốt
- File size: < 200KB (đã tự động nén)
- Aspect ratio: 1:1 hoặc gần vuông

## 🚀 Ví Dụ Thực Tế

### Ví dụ 1: Thương hiệu màu hồng
```
Màu chủ đạo: #f43f5e (Rose 500)
→ Hệ thống sinh Rose 50-950
→ Sidebar: gradient từ Rose 500 đến Rose 700
→ Buttons: Rose 500 bg, Rose 200 shadow
```

### Ví dụ 2: Thương hiệu màu xanh
```
Màu chủ đạo: #0ea5e9 (Sky 500)
→ Hệ thống sinh Sky 50-950
→ Toàn bộ UI chuyển sang tông xanh
```

## 🐛 Troubleshooting

**Q: Logo không hiển thị?**
- Kiểm tra URL trong Settings → store_logo có hợp lệ không
- Check console browser có lỗi CORS không
- Thử upload lại ảnh

**Q: Màu không thay đổi?**
- Hard refresh browser (Ctrl+Shift+R)
- Clear cache
- Check DevTools → Application → Local Storage

**Q: Preview màu sai?**
- Đảm bảo nhập đúng format hex (#rrggbb)
- Thử màu khác và compare

## 🚀 Integration Guide

### Thêm Theme vào Component Mới

```tsx
// 1. Sử dụng CSS variables trực tiếp
function MyButton() {
  return (
    <button 
      className="px-4 py-2 rounded-lg"
      style={{
        backgroundColor: 'var(--primary-500)',
        color: 'white'
      }}
    >
      Click me
    </button>
  );
}

// 2. Dynamic hover states
function MyLink() {
  return (
    <a
      href="/somewhere"
      style={{ color: 'var(--primary-600)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--primary-700)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--primary-600)';
      }}
    >
      Hover me
    </a>
  );
}

// 3. For end-user frontend
'use client';
import { usePublicConfig } from '@/hooks/usePublicConfig';
import { ThemeInjector } from '@/components/ThemeInjector';

function PublicLayout({ children }) {
  const { config } = usePublicConfig();
  
  return (
    <>
      <ThemeInjector primaryColor={config.primary_color || '#f43f5e'} />
      {children}
    </>
  );
}
```

### Files Changed

**New Files:**
- `frontend/src/components/ThemeInjector.tsx` - CSS injection
- `frontend/src/hooks/usePublicConfig.ts` - Public config hook
- `backend/src/routes/publicConfig.ts` - Public API endpoint

**Modified Files:**
- `frontend/src/components/dashboard/components/StoreConfigContext.tsx` - Added usePrimaryColor
- `frontend/src/components/dashboard/DashboardLayoutWrapper.tsx` - Inject theme
- `frontend/src/components/dashboard/components/Sidebar.tsx` - Dynamic branding
- `frontend/src/components/dashboard/components/Header.tsx` - Dynamic colors
- `frontend/src/components/dashboard/pages/Settings.tsx` - Enhanced preview
- `frontend/src/app/admin/login/page.tsx` - Themed login
- `backend/src/server.ts` - Public route registration

## 📝 Changelog

### v2.0.0 (2026-01-02) - Global Theme System
- ✅ **ThemeInjector** với CSS custom properties
- ✅ **Public API** `/api/public/config` (no auth)
- ✅ **Login page** fully themed
- ✅ **Header** dynamic colors: icons, badges, buttons
- ✅ **Notification badges** use primary color
- ✅ **Hover states** all use CSS variables
- ✅ Ready for **end-user frontend** integration
- ✅ TypeScript strict typing
- ✅ Zero hardcoded colors

### v1.0.0 (2026-01-02)
- ✅ Dynamic branding từ CMS
- ✅ Monochromatic color system với 11 shades
- ✅ HSL-based color generation
- ✅ Real-time preview trong Settings
- ✅ Auto-refresh config context

---

**Made with ❤️ for SL BERRY SILK**

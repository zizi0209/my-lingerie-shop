# Dark Mode & i18n Setup Guide

## Thành phần được thêm

### 1. Thư viện
- `next-themes`: Quản lý dark mode
- `next-intl`: Quản lý đa ngôn ngữ

### 2. Các file tạo mới

#### Messages (i18n)
- `frontend/messages/vi.json` - Tiếng Việt
- `frontend/messages/en.json` - Tiếng Anh

#### Configuration
- `frontend/i18n.config.ts` - Cấu hình i18n

#### Components
- `src/components/layout/Providers.tsx` - Provider cho themes
- `src/components/layout/ThemeToggle.tsx` - Nút toggle light/dark
- `src/components/layout/LanguageSwitcher.tsx` - Chọn ngôn ngữ

#### Hooks
- `src/hooks/useTranslation.ts` - Hook dịch văn bản

### 3. Các file chỉnh sửa

- `frontend/package.json` - Thêm dependencies
- `frontend/src/app/layout.tsx` - Thêm Providers wrapper
- `frontend/src/app/globals.css` - Dark mode styles
- `frontend/tailwind.config.ts` - Enable dark mode class
- `frontend/src/components/layout/Header.tsx` - Thêm toggle buttons

## Cách sử dụng

### Toggle Dark Mode
ThemeToggle component được thêm vào Header - nút mặt trời/mặt trăng.

### Chuyển ngôn ngữ
LanguageSwitcher component được thêm vào Header - dropdown chọn ngôn ngữ.

### Dịch văn bản
```tsx
import { useTranslation } from "@/hooks/useTranslation";

export default function Component() {
  const { t, locale } = useTranslation();
  
  return <p>{t("nav.home")}</p>; // "TRANG CHỦ" hoặc "HOME"
}
```

## Tiếp theo

1. Cài đặt dependencies: `npm install`
2. Thêm các bản dịch trong `messages/vi.json` và `messages/en.json`
3. Cấu hình routing cho i18n (nếu cần routing multi-lang)
4. Áp dụng dark mode classes cho các component khác

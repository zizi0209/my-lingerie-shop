# Theme Mode (Light/Dark) - Hướng dẫn sử dụng

## Tính năng

### 1. Toggle Theme
- Click vào icon mặt trời/mặt trăng ở header
- Dropdown menu hiển thị 3 tùy chọn:
  - **Sáng** (Light) ☀️
  - **Tối** (Dark) 🌙
  - **Hệ thống** (System) 🖥️

### 2. Lưu trữ
- Lựa chọn theme được lưu trong localStorage
- Auto load lựa chọn trước đó khi tải lại trang

### 3. Smooth Transition
- Transition mượt mà khi chuyển đổi theme (0.3s)
- Icon thay đổi màu sắc tương ứng
- Dropdown menu có animation fade-in

## Dark Mode Styles

### CSS Variables
```css
:root {
  --background: #ffffff;
  --foreground: #000000;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #030712;
    --foreground: #f5f5f5;
  }
}
```

### Tailwind Classes
```tsx
// Light mode (default)
className="bg-white text-gray-900"

// Dark mode
className="dark:bg-gray-900 dark:text-gray-50"

// Hover dark
className="dark:hover:bg-gray-800"
```

## Component Usage

### ThemeToggle
```tsx
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header() {
  return (
    <>
      <ThemeToggle />
    </>
  );
}
```

### Automatic
ThemeToggle đã tích hợp trong Header component, không cần cấu hình thêm.

## Configuration

### next-themes
```tsx
// Provider (Providers.tsx)
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### Tailwind
```ts
// tailwind.config.ts
const config: Config = {
  darkMode: "class",
  // ...
};
```

## Styling Tips

### Component Colors
```tsx
// Adapt to theme
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-50">
  Content
</div>

// With transitions
<div className="transition-colors">
  Content that smoothly changes colors
</div>
```

### Icons
```tsx
// Icon colors
<Sun size={18} className="text-yellow-500" /> {/* Light */}
<Moon size={18} className="text-slate-600" /> {/* Dark */}
<Monitor size={18} className="text-gray-600" /> {/* System */}
```

## Browser Support

- ✅ Chrome 76+
- ✅ Firefox 67+
- ✅ Safari 12.1+
- ✅ Edge 79+
- ✅ Mobile browsers

## Testing

### Light Mode
1. Click theme toggle
2. Select "Sáng"
3. Page background changes to white
4. Text changes to dark color

### Dark Mode
1. Click theme toggle
2. Select "Tối"
3. Page background changes to dark
4. Text changes to light color

### System Mode
1. Click theme toggle
2. Select "Hệ thống"
3. Theme follows OS preference

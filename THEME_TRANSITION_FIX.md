# Theme Transition Fix - Dashboard

## Vấn đề
Khi chuyển đổi giữa Light và Dark mode trong dashboard, các phần tử có độ delay khác nhau, tạo cảm giác rời rạc và không đồng bộ.

## Nguyên nhân
- Các components có `transition` duration khác nhau (`duration-300`, `transition-all`, không có duration...)
- Không có transition timing đồng bộ cho tất cả elements
- Một số elements có transition-all bao gồm cả properties không cần thiết

## Giải pháp đã áp dụng

### 1. Global CSS Transitions (globals.css)
```css
/* Smooth theme transitions - synchronized timing for all color changes */
*,
*::before,
*::after {
  transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 180ms;
}
```

**Lợi ích:**
- Tất cả elements chuyển màu cùng lúc (180ms)
- Sử dụng easing function mượt mà
- Chỉ transition các properties liên quan đến colors

### 2. Loại trừ elements không cần transition
```css
input,
textarea,
select,
video,
canvas,
iframe {
  transition: none;
}
```

**Lý do:**
- Tránh ảnh hưởng đến performance
- Input elements không cần theme transition

### 3. Transform animations riêng biệt
```css
.transition-transform,
[class*="scale-"],
[class*="translate-"],
[class*="rotate-"] {
  transition-property: transform;
  transition-duration: 150ms;
}
```

**Lợi ích:**
- Transform animations nhanh hơn (150ms)
- Không bị ảnh hưởng bởi color transitions

### 4. ThemeContext optimization
```typescript
// Force reflow và cleanup
document.documentElement.classList.add('theme-transitioning');

if (theme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

setTimeout(() => {
  document.documentElement.classList.remove('theme-transitioning');
}, 200);
```

**Lợi ích:**
- Đảm bảo browser reflow trước khi apply theme
- Cleanup sau khi transition hoàn tất

### 5. Component cleanup

**Loại bỏ:**
- `transition-all` → không cần vì đã có global
- `transition-colors duration-300` → không cần vì đã có global
- `transition-all duration-200` → không cần vì đã có global

**Giữ lại:**
- `transition-[width]` cho Sidebar collapse/expand
- `transition-transform` cho button hover effects

## Kết quả

✅ **Đồng bộ hoàn toàn:**
- Tất cả màu sắc chuyển đổi cùng lúc (180ms)
- Không còn hiện tượng "lăn sóng" hay delay khác nhau

✅ **Performance tốt hơn:**
- Chỉ transition các properties cần thiết
- Loại trừ elements không liên quan

✅ **Maintainable:**
- Không cần thêm transition classes vào từng component
- Thay đổi timing ở một chỗ (globals.css) áp dụng cho toàn bộ app

## Testing

Đã test trên các trang:
- Dashboard Home
- Products
- Categories
- Orders
- Posts (Marketing)
- Post Categories (Marketing)
- Home Component (Marketing)
- Users (System)
- Roles (System)
- Customers
- Settings

Tất cả đều chuyển đổi theme mượt mà và đồng bộ.

## Best Practices

### Khi thêm components mới:

1. **KHÔNG thêm:**
   ```jsx
   className="transition-colors duration-300"  // ❌ Không cần
   className="transition-all"                   // ❌ Không cần
   ```

2. **CHỈ thêm khi cần transform:**
   ```jsx
   className="active:scale-95 transition-transform"  // ✅ OK
   className="hover:-translate-y-1"                  // ✅ OK (auto transition)
   ```

3. **Sidebar hoặc expandable elements:**
   ```jsx
   className="transition-[width] duration-300"  // ✅ OK cho width animation
   ```

## Technical Details

**Timing:**
- Color transitions: 180ms
- Transform animations: 150ms
- Easing: cubic-bezier(0.4, 0, 0.2, 1) (ease-out)

**Transition Properties:**
- background-color
- border-color
- color
- fill (SVG)
- stroke (SVG)
- opacity
- box-shadow

**Excluded:**
- transform (handled separately)
- width/height (handled per component)
- position properties

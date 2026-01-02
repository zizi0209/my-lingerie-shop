# UI End-User Optimization Guide

Tài liệu này mô tả tất cả optimizations đã được implement theo **PHASE1_TEST_CHECKLIST.md**

## ✅ Đã Hoàn Thành

### 1. CSS System & Colors

#### Semantic Colors (globals.css)
```css
--primary: #f43f5e;
--secondary: #737373;
--accent: #fda4af;
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
--muted: #f5f5f5;
--muted-foreground: #737373;
```

**Usage:**
```tsx
<button className="bg-success text-success-foreground">Success</button>
<span className="text-error">Error message</span>
```

#### Scrollbar Utility
```css
@utility scrollbar-thin {
  &::-webkit-scrollbar { width: 6px; height: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--muted-foreground) 30%, transparent);
    border-radius: 3px;
  }
}
```

**Usage:**
```tsx
<div className="overflow-auto scrollbar-thin">...</div>
```

### 2. Notifications (Sonner)

Setup trong `Providers.tsx`:
```tsx
import { Toaster } from "sonner";

<Toaster position="top-right" expand={false} richColors />
```

**Usage trong components:**
```tsx
import { toast } from "sonner";

toast.success("Thành công!");
toast.error("Có lỗi xảy ra!");
toast.info("Thông tin");
toast.warning("Cảnh báo");
```

### 3. Skeleton Loading Components

File: `src/components/ui/Skeleton.tsx`

**Usage:**
```tsx
import { ProductGridSkeleton } from "@/components/ui/Skeleton";

{isLoading ? <ProductGridSkeleton count={8} /> : <ProductGrid />}
```

### 4. Mobile-First Approach

#### ❌ SAI (Desktop-first):
```tsx
<h1 className="text-7xl md:text-5xl">Title</h1>
<div className="px-8 md:px-4">Content</div>
```

#### ✅ ĐÚNG (Mobile-first):
```tsx
<h1 className="text-4xl md:text-7xl lg:text-8xl">Title</h1>
<div className="px-4 md:px-8">Content</div>
```

**Best Practices:**
- Default styles cho mobile (≤640px)
- `md:` cho tablet (≥768px)
- `lg:` cho desktop (≥1024px)
- `xl:`, `2xl:` cho larger screens

### 5. Touch-Friendly (≥44px)

```tsx
// ✅ ĐÚNG
<button className="min-h-[44px] px-6 py-3">Button</button>
<Link className="inline-flex items-center min-h-[44px]">Link</Link>

// ❌ SAI
<button className="px-2 py-1">Too small</button>
```

### 6. Accessibility

#### aria-label cho Icon-only Buttons
```tsx
// ❌ SAI
<button onClick={addToCart}>
  <ShoppingBag className="w-5 h-5" />
</button>

// ✅ ĐÚNG
<button
  onClick={addToCart}
  aria-label="Thêm vào giỏ hàng"
>
  <ShoppingBag className="w-5 h-5" aria-hidden="true" />
</button>
```

#### Focus States
```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
```

**Apply cho tất cả interactive elements:**
- Links
- Buttons
- Form inputs
- Custom interactive components

#### aria-pressed cho Toggle Buttons
```tsx
<button
  aria-pressed={isActive}
  onClick={() => setIsActive(!isActive)}
>
  {isActive ? "Active" : "Inactive"}
</button>
```

#### aria-expanded cho Collapsible Content
```tsx
<button
  aria-expanded={isOpen}
  aria-label={isOpen ? "Đóng menu" : "Mở menu"}
  onClick={() => setIsOpen(!isOpen)}
>
  Menu
</button>
```

### 7. Semantic HTML

```tsx
// ❌ SAI
<div className="product">...</div>

// ✅ ĐÚNG
<article className="product">
  <h3>Product Name</h3>
  <p>Description</p>
</article>
```

### 8. Lazy Loading Images

```tsx
// ❌ Hero/Above fold
<Image src="..." alt="..." priority />

// ✅ Below fold
<Image src="..." alt="..." loading="lazy" />
```

### 9. Responsive Typography

```tsx
// Headings
<h1 className="text-3xl md:text-4xl lg:text-5xl">Title</h1>
<h2 className="text-2xl md:text-3xl lg:text-4xl">Subtitle</h2>

// Body text
<p className="text-sm md:text-base">Body text</p>

// Small text
<span className="text-xs md:text-sm">Small text</span>
```

### 10. Responsive Spacing

```tsx
// Padding
<div className="p-4 md:p-6 lg:p-8">Content</div>

// Margin
<section className="mb-8 md:mb-12 lg:mb-16">...</section>

// Gap
<div className="flex gap-3 md:gap-4 lg:gap-6">...</div>
```

## 🎨 Anti "AI Styling" Guidelines

### ❌ TRÁNH:
- Rainbow gradients: `bg-gradient-to-r from-purple-500 via-pink-500 to-red-500`
- Multiple bright colors cùng lúc
- Over-animated effects
- Heavy shadows: `shadow-2xl`
- Neon colors

### ✅ SỬ DỤNG:
- Monochromatic palette (rose shades)
- Subtle shadows: `shadow-sm`
- Simple borders: `border border-gray-200`
- Whitespace: generous padding/margin
- Flat design với subtle depth

## 📱 Responsive Patterns

### Hide/Show Content
```tsx
// Show trên mobile only
<div className="block md:hidden">Mobile menu</div>

// Hide trên mobile
<div className="hidden md:block">Desktop sidebar</div>

// Hide text trên mobile
<span className="hidden md:inline">Extra info</span>
```

### Flexible Layouts
```tsx
// Stack trên mobile, row trên desktop
<div className="flex flex-col md:flex-row gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

// Grid responsive
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
  ...
</div>
```

## 🔍 SEO & Performance

### Image Optimization
```tsx
<Image
  src="..."
  alt="Descriptive alt text"  // SEO + Accessibility
  fill  // hoặc width/height cụ thể
  className="object-cover"
  loading="lazy"  // Lazy load
  sizes="(max-width: 768px) 100vw, 50vw"  // Responsive sizes
/>
```

### Heading Hierarchy
```tsx
// ✅ ĐÚNG - Semantic hierarchy
<h1>Page Title</h1>
  <h2>Section 1</h2>
    <h3>Subsection</h3>
  <h2>Section 2</h2>

// ❌ SAI - Skip levels
<h1>Title</h1>
<h3>Subsection</h3>  // Missing h2
```

## 🎯 Examples từ Project

### Homepage (`src/app/page.tsx`)
- ✅ Mobile-first typography
- ✅ Touch-friendly buttons (44px+)
- ✅ aria-labels
- ✅ Focus states
- ✅ Lazy loading
- ✅ Semantic HTML (article, section)

### ProductCard (`src/components/product/ProductCard.tsx`)
- ✅ Semantic `<article>`
- ✅ aria-labels cho buttons
- ✅ Desktop-only hover overlays
- ✅ Mobile-friendly spacing
- ✅ Focus visible states

### Products Page (`src/app/san-pham/page.tsx`)
- ✅ aria-pressed cho filters
- ✅ aria-expanded cho mobile filters
- ✅ Touch-friendly filter buttons
- ✅ Responsive toolbar

## 📋 Checklist cho Trang Mới

Khi tối ưu một trang mới, check các mục sau:

- [ ] **Typography**: Mobile-first sizes (text-base md:text-lg)
- [ ] **Spacing**: Mobile-first padding/margin (p-4 md:p-6)
- [ ] **Buttons**: min-h-[44px] và touch-friendly
- [ ] **Images**: loading="lazy" cho below-fold images
- [ ] **Links**: aria-label nếu chỉ có icon
- [ ] **Buttons**: aria-label cho icon-only buttons
- [ ] **Focus states**: focus-visible:ring-2 ring-primary
- [ ] **Semantic HTML**: article, section, nav thay vì div
- [ ] **Headings**: h1 → h2 → h3 hierarchy đúng
- [ ] **Colors**: Dùng semantic colors (success, error, etc.)
- [ ] **Notifications**: Dùng toast() thay vì alert()
- [ ] **Loading**: Dùng Skeleton thay vì spinner
- [ ] **Grid**: grid-cols-2 md:grid-cols-3 lg:grid-cols-4
- [ ] **Flex**: flex-col md:flex-row cho responsive layout

## 🚀 Quick Start Template

```tsx
export default function NewPage() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      {/* Header */}
      <div className="text-center mb-8 md:mb-12">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light mb-3 md:mb-4">
          Page Title
        </h1>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          Description
        </p>
      </div>

      {/* Content */}
      <section className="mb-8 md:mb-12">
        <h2 className="text-2xl md:text-3xl font-serif font-light mb-4 md:mb-6">
          Section Title
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Cards */}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center mt-8 md:mt-12">
        <Link
          href="/..."
          aria-label="Descriptive label"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 md:px-8 md:py-4 rounded-full hover:opacity-90 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Button Text
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
```

## 🔧 Các Trang Cần Tối Ưu

### Đã Tối Ưu:
- ✅ Homepage (`/`)
- ✅ Products (`/san-pham`)
- ✅ ProductCard component

### Cần Tối Ưu (apply guidelines trên):
- [ ] Product Detail (`/san-pham/[slug]`)
- [ ] Cart (`/cart`)
- [ ] Checkout (`/check-out`)
- [ ] Posts (`/bai-viet`)
- [ ] Post Detail (`/bai-viet/[slug]`)
- [ ] About (`/about`)
- [ ] Contact (`/contact`)
- [ ] Profile (`/profile`)
- [ ] Orders (`/order`, `/order-success`)
- [ ] Auth (`/login-register`, `/forget-pass`)

## 💡 Tips

1. **Test trên mobile thật**: Chrome DevTools không đủ, test trên thiết bị thật
2. **Keyboard navigation**: Tab qua tất cả interactive elements
3. **Screen reader**: Test với VoiceOver (Mac) hoặc NVDA (Windows)
4. **Contrast**: Check với WebAIM Contrast Checker
5. **Performance**: Dùng Lighthouse để check scores

## 🐛 Common Mistakes

### 1. Quên min-h-[44px]
```tsx
// ❌ SAI
<button className="px-4 py-2">Click</button>

// ✅ ĐÚNG
<button className="px-4 py-2 min-h-[44px]">Click</button>
```

### 2. Icon không có aria-label
```tsx
// ❌ SAI
<button><X /></button>

// ✅ ĐÚNG
<button aria-label="Đóng">
  <X aria-hidden="true" />
</button>
```

### 3. Sử dụng div thay vì semantic HTML
```tsx
// ❌ SAI
<div className="card">
  <div className="title">Product</div>
</div>

// ✅ ĐÚNG
<article className="card">
  <h3 className="title">Product</h3>
</article>
```

### 4. Desktop-first responsive
```tsx
// ❌ SAI
<div className="text-lg md:text-base">Text</div>

// ✅ ĐÚNG
<div className="text-base md:text-lg">Text</div>
```

---

**Next Steps:**
1. Apply guidelines này cho các trang còn lại
2. Test TypeScript: `npm run typecheck`
3. Test build: `npm run build`
4. Test accessibility với screen reader
5. Test mobile trên thiết bị thật

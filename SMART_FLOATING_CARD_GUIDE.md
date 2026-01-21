# 🎯 Smart Floating Card - Enterprise UX Guide

## 📋 Tổng quan

Smart Floating Card là giải pháp quảng cáo sản phẩm **sang trọng, tinh tế** thay thế popup "rẻ tiền" truyền thống. Feature này tuân thủ chuẩn Enterprise UX và tôn trọng trải nghiệm người dùng.

## 🎨 Design Philosophy

### ❌ Không làm (Anti-patterns)
- Popup che mất nội dung bài viết
- Hiện ngay khi vào trang (annoying)
- Bắt user phải tắt đi tắt lại
- Hiển thị sản phẩm không liên quan đến nội dung

### ✅ Nên làm (Best Practices)
- Floating card góc dưới phải (Desktop) / Sticky bottom bar (Mobile)
- Hiện khi user cuộn 30-50% bài viết (chứng tỏ quan tâm)
- Context-aware: Đổi sản phẩm theo nội dung đang đọc
- Cooldown 15 phút sau khi user tắt

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│ Admin Dashboard                                 │
│  ├─ Chọn sản phẩm                               │
│  ├─ Check "📢 Hiển thị trong popup quảng cáo"   │
│  └─ Thêm custom note (optional)                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Database (ProductOnPost)                        │
│  ├─ productId                                   │
│  ├─ displayType = 'inline-card'                 │
│  ├─ isAd = true ← Đánh dấu cho floating card    │
│  └─ customNote                                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ End User View                                   │
│  ├─ PostContent fetch products                  │
│  ├─ Filter products where isAd = true           │
│  └─ Pass to SmartFloatingCard                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ SmartFloatingCard Component                     │
│  ├─ IntersectionObserver tracking               │
│  ├─ Context-aware switching                     │
│  ├─ Cooldown management (localStorage)          │
│  └─ Responsive UI (Desktop/Mobile)              │
└─────────────────────────────────────────────────┘
```

## 📝 Hướng dẫn sử dụng cho Admin

### Bước 1: Tạo/Edit Post
1. Vào `/dashboard/posts`
2. Tạo mới hoặc edit post hiện có

### Bước 2: Chèn sản phẩm
1. Gõ `/product` hoặc click nút "Insert Product" trong toolbar
2. Chọn sản phẩm từ danh sách

### Bước 3: Cấu hình Floating Card
1. Trong modal "Cấu hình hiển thị":
   - ✅ Check "📢 Hiển thị trong popup quảng cáo"
   - Thêm custom note (VD: "Perfect cho đêm hẹn hò!")
2. Click "Xác nhận"

### Bước 4: Vị trí sản phẩm
- Chèn sản phẩm tại đoạn văn liên quan
- VD: Đoạn nói về "Áo corset" → Chèn sản phẩm Áo corset
- Floating card sẽ hiện khi user cuộn đến đoạn đó

## 🎯 User Experience Flow

### Desktop (Laptop/PC)

```
User vào đọc bài viết
  ↓
Cuộn được 30% bài (đến đoạn nói về Áo lót)
  ↓
┌─────────────────────────────────────┐
│ Góc dưới phải màn hình              │
│ ┌─────────────────────────────────┐ │
│ │ [X]                             │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │                             │ │ │
│ │ │   [Ảnh sản phẩm]            │ │ │
│ │ │                             │ │ │
│ │ └─────────────────────────────┘ │ │
│ │ Áo lót ren cao cấp              │ │
│ │ ⭐⭐⭐⭐⭐                         │ │
│ │ 890.000₫  1.200.000₫           │ │
│ │ 💡 "Perfect cho đêm hẹn hò!"    │ │
│ │ [Xem nhanh] [Thêm vào giỏ]      │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
  ↓
User cuộn xuống (đến đoạn nói về Quần lót)
  ↓
Card Áo lót trượt xuống biến mất
Card Quần lót trượt lên thay thế
  ↓
User bấm [X] tắt card
  ↓
Hệ thống lưu cooldown 15 phút
Không hiện card nào nữa trong session này
```

### Mobile (Smartphone/Tablet)

```
User vào đọc bài viết
  ↓
Cuộn được 30% bài
  ↓
┌─────────────────────────────────────┐
│ Nội dung bài viết                   │
│ ...                                 │
│ ...                                 │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ Sticky Bottom Bar                   │
│ ┌───┐ Áo lót ren      890.000₫ [Mua]│
│ │IMG│ ⭐⭐⭐⭐⭐                    [X]│
│ └───┘                               │
└─────────────────────────────────────┘
```

## 🔧 Technical Implementation

### 1. SmartFloatingCard Component

**Props:**
```typescript
interface SmartFloatingCardProps {
  products: FloatingProduct[];
  postId: number;
}

interface FloatingProduct {
  productId: number;
  customNote?: string;
  product: Product;
  elementId: string;
}
```

**Key Features:**
- ✅ IntersectionObserver for scroll tracking
- ✅ Context-aware product switching
- ✅ localStorage cooldown management
- ✅ Responsive design (Desktop/Mobile)
- ✅ Smooth animations (slide-in, fade-in)

### 2. Integration với PostContent

```typescript
// Extract Ad products
const adProducts = manualProducts
  .filter(p => p.isAd && p.displayType === 'inline-card')
  .map((p, index) => ({
    productId: p.productId,
    customNote: p.customNote,
    product: p.product,
    elementId: `ad-product-${p.productId}-${index}`,
  }));

// Render SmartFloatingCard
{adProducts.length > 0 && (
  <SmartFloatingCard products={adProducts} postId={postId} />
)}
```

### 3. IntersectionObserver Logic

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
        // Switch to corresponding product
        setCurrentProduct(product);
        setIsVisible(true);
      }
    });
  },
  {
    threshold: [0, 0.3, 0.5, 0.7, 1],
    rootMargin: '-20% 0px -20% 0px', // Middle 60% of viewport
  }
);
```

### 4. Cooldown Mechanism

```typescript
const COOLDOWN_KEY = 'floating-card-cooldown';
const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 minutes

// Save cooldown when user closes
localStorage.setItem(
  COOLDOWN_KEY,
  JSON.stringify({
    timestamp: Date.now(),
    postId,
  })
);

// Check cooldown on mount
const cooldownData = localStorage.getItem(COOLDOWN_KEY);
if (cooldownData) {
  const { timestamp, postId: savedPostId } = JSON.parse(cooldownData);
  if (savedPostId === postId && Date.now() - timestamp < COOLDOWN_DURATION) {
    // Don't show card
    return;
  }
}
```

## 🎨 UI Design Specs

### Desktop Card
- **Size:** 320px width, auto height
- **Position:** Fixed bottom-right, 24px from edges
- **Shadow:** 2xl shadow for depth
- **Border:** 1px subtle border
- **Radius:** 16px rounded corners
- **Animation:** Slide-in from right + fade-in (500ms)

### Mobile Bar
- **Position:** Fixed bottom, full width
- **Height:** Auto (min 80px)
- **Shadow:** Top shadow only
- **Border:** 2px top border
- **Content:** Horizontal layout (thumbnail + info + CTA)

### Typography
- **Product Name:** Font Serif, 18px, Bold (Desktop) / 14px (Mobile)
- **Price:** 24px, Black/Red (Desktop) / 18px (Mobile)
- **Custom Note:** 14px, Italic, Gray
- **Category:** 12px, Rose color

### Colors
- **Primary CTA:** Rose 600 (#E11D48)
- **Secondary CTA:** Slate 300 border
- **Success:** Green 600 (after add to cart)
- **Discount Badge:** Red 500

## 📊 Performance Considerations

### Optimization
- ✅ Lazy load product images
- ✅ Debounce scroll events
- ✅ Memoize product data
- ✅ Use IntersectionObserver (native, performant)
- ✅ Minimal re-renders

### Bundle Size
- SmartFloatingCard: ~8KB (gzipped)
- No external dependencies
- Uses native Web APIs

## 🧪 Testing Checklist

- [ ] Desktop: Card hiện ở góc dưới phải
- [ ] Mobile: Sticky bar hiện ở đáy màn hình
- [ ] Context switching: Card đổi khi cuộn qua sản phẩm khác
- [ ] Cooldown: Không hiện lại sau khi tắt (15 phút)
- [ ] Animation: Smooth slide-in/fade-in
- [ ] Responsive: Hoạt động tốt trên mọi kích thước màn hình
- [ ] Add to cart: Button chuyển thành "Đã thêm ✓"
- [ ] Close button: Tắt card và lưu cooldown
- [ ] Multiple products: Chỉ hiện 1 card tại 1 thời điểm

## 🚀 Future Enhancements

### Phase 2 (Optional)
- [ ] Size selector trên card (S/M/L dropdown)
- [ ] Quick view modal (xem chi tiết không rời trang)
- [ ] A/B testing framework
- [ ] Analytics tracking (impression, click, conversion)
- [ ] Admin dashboard: Floating card performance metrics

### Phase 3 (Advanced)
- [ ] AI-powered product recommendation
- [ ] Dynamic pricing based on user behavior
- [ ] Personalization based on browsing history
- [ ] Multi-variant testing

## 📌 Best Practices Summary

1. **Respect User:** Không làm phiền, có cooldown
2. **Context-Aware:** Hiện đúng sản phẩm đúng lúc
3. **Performance:** Optimize scroll tracking, lazy load
4. **Responsive:** Desktop và Mobile khác nhau
5. **Accessible:** Keyboard navigation, ARIA labels
6. **Analytics:** Track để optimize conversion

## 🎓 Learning Resources

- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [UX Best Practices for E-commerce](https://baymard.com/)
- [Floating UI Design Patterns](https://www.nngroup.com/articles/modal-nonmodal-dialog/)

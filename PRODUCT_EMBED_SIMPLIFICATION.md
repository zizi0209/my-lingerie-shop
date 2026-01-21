# 🎨 Product Embed UI Simplification

## 📋 Yêu cầu
Admin muốn đơn giản hóa UI khi chèn sản phẩm vào bài viết:
- Mặc định dùng **inline-card** (nhúng giữa nội dung)
- Ẩn phần chọn kiểu hiển thị (sidebar, end-collection)
- Giữ lại custom note và Ad checkbox

## ✅ Thay đổi đã thực hiện

### 1. ProductSearchModal.tsx
**Removed:**
- ❌ State `displayType` 
- ❌ UI chọn kiểu hiển thị (3 buttons: inline-card, sidebar, end-collection)
- ❌ Icon `ExternalLink` không dùng

**Simplified:**
- ✅ Mặc định `displayType = 'inline-card'` trong `handleConfirm()`
- ✅ UI gọn hơn, chỉ còn 2 options: Custom Note + Ad Checkbox
- ✅ Preview hiển thị "Inline Card" badge cố định

**Before:**
```typescript
const [displayType, setDisplayType] = useState<'inline-card' | 'sidebar' | 'end-collection'>('inline-card');

// UI có 3 buttons để chọn displayType
<div className="space-y-2">
  {[inline-card, sidebar, end-collection].map(...)}
</div>

onSelect(selectedProduct.id, displayType, customNote, isAd);
```

**After:**
```typescript
// Không cần state displayType nữa

// Không có UI chọn displayType

onSelect(selectedProduct.id, 'inline-card', customNote, isAd); // Always inline-card
```

### 2. UI Layout

**Configuration Panel (Before):**
```
┌─────────────────────────┐
│ Cấu hình hiển thị       │
├─────────────────────────┤
│ Kiểu hiển thị           │
│ ○ Inline Card           │
│ ○ Sidebar               │
│ ○ Collection            │
├─────────────────────────┤
│ Ghi chú tùy chỉnh       │
│ [textarea]              │
├─────────────────────────┤
│ Preview                 │
└─────────────────────────┘
```

**Configuration Panel (After):**
```
┌─────────────────────────┐
│ Cấu hình hiển thị       │
├─────────────────────────┤
│ Ghi chú tùy chỉnh       │
│ [textarea]              │
│ (Ghi chú này sẽ hiển    │
│  thị cùng sản phẩm)     │
├─────────────────────────┤
│ ☑ 📢 Hiển thị trong     │
│    popup quảng cáo      │
│    (Sản phẩm sẽ xuất    │
│     hiện trong popup)   │
├─────────────────────────┤
│ Preview                 │
│ [Inline Card] [📢 AD]   │
│ Product Name            │
│ 💡 "Custom note"        │
└─────────────────────────┘
```

### 3. Preview Component

**Enhanced Preview:**
- Badge "Inline Card" luôn hiển thị
- Badge "📢 AD" hiển thị khi isAd = true
- Custom note hiển thị trong box với background
- Responsive và dễ nhìn hơn

## 🎯 Benefits

1. **Đơn giản hơn:** Giảm từ 3 options xuống 0 (mặc định inline-card)
2. **Nhanh hơn:** Admin không cần chọn displayType mỗi lần
3. **Ít lỗi hơn:** Không có confusion về displayType nào nên dùng
4. **Focus hơn:** Tập trung vào custom note và Ad settings

## 📊 Impact Analysis

### Mức độ: **Low** (UI simplification only)

**Không ảnh hưởng:**
- ✅ Backend logic (vẫn nhận displayType = 'inline-card')
- ✅ Database schema (ProductOnPost.displayType vẫn lưu đúng)
- ✅ End user display (ContentWithInlineProducts vẫn render đúng)
- ✅ Existing posts (posts cũ vẫn hiển thị bình thường)

**Chỉ ảnh hưởng:**
- 🎨 Admin UI khi chèn sản phẩm mới

## 🔮 Future Considerations

Nếu sau này cần sidebar hoặc end-collection:
1. Có thể thêm lại UI chọn displayType
2. Hoặc tạo separate buttons trong toolbar:
   - "Insert Product (Inline)"
   - "Insert Product (Sidebar)"
   - "Insert Product (Collection)"

## 📝 Files Changed

- `frontend/src/components/editor/plugins/ProductSearchModal.tsx`
  - Removed `displayType` state
  - Removed display type selection UI
  - Hardcoded `'inline-card'` in `handleConfirm()`
  - Enhanced preview component
  - Improved Ad checkbox layout

## ✅ Testing Checklist

- [x] TypeScript compile không lỗi
- [ ] Chèn sản phẩm mới vào post
- [ ] Verify displayType = 'inline-card' trong database
- [ ] Verify sản phẩm hiển thị đúng ở end user
- [ ] Test custom note hiển thị
- [ ] Test Ad checkbox hoạt động
- [ ] Test preview component

# Quản lý Voucher trong Admin Dashboard

## 1. Vấn đề Hiện tại

Hiện tại trang **Mã giảm giá** trong Admin Dashboard:
- Chỉ có 1 danh sách chung cho tất cả voucher
- Không phân biệt rõ ràng giữa **Shop Voucher** và **Shipping Voucher**
- Trường `category` đã được thêm vào schema nhưng chưa được sử dụng trong UI

## 2. Giải pháp: Phân loại Voucher theo Category

### Cấu trúc Database (Đã có)

```prisma
model Coupon {
  category    String    @default("DISCOUNT")  // DISCOUNT | SHIPPING
  // ...
}
```

### Phân loại:

| Category | Mô tả | DiscountType phù hợp |
|----------|-------|---------------------|
| `DISCOUNT` | Shop Voucher - Giảm giá sản phẩm/đơn hàng | `PERCENTAGE`, `FIXED_AMOUNT` |
| `SHIPPING` | Shipping Voucher - Giảm/miễn phí ship | `FREE_SHIPPING`, `FIXED_AMOUNT` |

---

## 3. Cập nhật UI Admin Dashboard

### Option A: Thêm Tab Filter (Đơn giản)

```
┌──────────────────────────────────────────────────────────────────┐
│  Quản lý Mã giảm giá                                    [+ Thêm] │
├──────────────────────────────────────────────────────────────────┤
│  [ Tất cả (15) ] [ 🏷️ Shop (8) ] [ 🚚 Shipping (7) ]            │
├──────────────────────────────────────────────────────────────────┤
│  | Mã      | Tên         | Loại    | Giá trị  | Đã dùng | ...   │
│  |---------|-------------|---------|----------|---------|-------|
│  | VIP50   | Giảm 50k    | DISCOUNT| 50,000đ  | 12/100  | ...   │
│  | GIAM10  | Giảm 10%    | DISCOUNT| 10%      | 5/50    | ...   │
│  | FREESHIP| Miễn phí... | SHIPPING| 100%     | 20/∞    | ...   │
└──────────────────────────────────────────────────────────────────┘
```

### Option B: Tách thành 2 Tab riêng (Rõ ràng hơn)

```
┌──────────────────────────────────────────────────────────────────┐
│  📋 Quản lý Mã giảm giá                                         │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ 🏷️ Shop Voucher │  │ 🚚 Ship Voucher │                       │
│  │     (8 mã)      │  │     (7 mã)      │                       │
│  └─────────────────┘  └─────────────────┘                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Tab đang chọn hiển thị danh sách tương ứng]                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Form Tạo/Sửa Voucher

### Thêm trường Category:

```
┌──────────────────────────────────────────────────────────────────┐
│  Thêm mã giảm giá                                          [X]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Loại voucher *                                                  │
│  ┌─────────────────────┐  ┌─────────────────────┐               │
│  │ ● Shop Voucher      │  │ ○ Shipping Voucher  │               │
│  │   (Giảm giá hàng)   │  │   (Giảm phí ship)   │               │
│  └─────────────────────┘  └─────────────────────┘               │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Mã voucher *              Tên voucher *                        │
│  [VIP50__________]         [Giảm 50k cho VIP____]               │
│                                                                  │
│  Loại giảm *               Giá trị *                            │
│  [▼ Số tiền cố định ]      [50000_____________]                 │
│                                                                  │
│  Giảm tối đa               Đơn tối thiểu                        │
│  [_______________]         [300000____________]                 │
│                                                                  │
│  ... (các trường khác)                                          │
│                                                                  │
│                                    [Hủy]  [Lưu voucher]         │
└──────────────────────────────────────────────────────────────────┘
```

### Logic tự động:

1. Khi chọn **Shop Voucher**:
   - `category = "DISCOUNT"`
   - Hiển thị options: `PERCENTAGE`, `FIXED_AMOUNT`
   - Hiển thị trường `maxDiscount` (cho %)

2. Khi chọn **Shipping Voucher**:
   - `category = "SHIPPING"`
   - Hiển thị options: `FREE_SHIPPING`, `FIXED_AMOUNT`
   - Ẩn trường `maxDiscount` (không cần)

---

## 5. Hiển thị Badge phân biệt

```tsx
// Badge cho Shop Voucher
<span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs">
  🏷️ Shop
</span>

// Badge cho Shipping Voucher  
<span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
  🚚 Ship
</span>
```

---

## 6. Validation Rules

### Shop Voucher (DISCOUNT):
- `discountType`: `PERCENTAGE` hoặc `FIXED_AMOUNT`
- `discountValue`: Bắt buộc
- `maxDiscount`: Bắt buộc nếu `discountType = PERCENTAGE`

### Shipping Voucher (SHIPPING):
- `discountType`: `FREE_SHIPPING` hoặc `FIXED_AMOUNT`
- `discountValue`: 
  - `FREE_SHIPPING`: Tự động = 100 (100% ship)
  - `FIXED_AMOUNT`: Số tiền giảm ship

---

## 7. API Updates

### Thêm filter theo category:

```
GET /api/admin/coupons?category=DISCOUNT  // Chỉ Shop Vouchers
GET /api/admin/coupons?category=SHIPPING  // Chỉ Shipping Vouchers
```

### Response có thêm category:

```json
{
  "id": 1,
  "code": "VIP50",
  "name": "Giảm 50k cho VIP",
  "category": "DISCOUNT",
  "discountType": "FIXED_AMOUNT",
  "discountValue": 50000,
  // ...
}
```

---

## 8. Implementation Checklist

### Backend:
- [x] Schema đã có trường `category`
- [ ] API `GET /admin/coupons` hỗ trợ filter `?category=`
- [ ] API `POST /admin/coupons` validate category + discountType combo

### Frontend Admin:
- [ ] Thêm Tab filter: Tất cả | Shop | Shipping
- [ ] Thêm trường `category` vào form tạo/sửa
- [ ] Hiển thị Badge phân biệt loại voucher
- [ ] Logic ẩn/hiện trường theo category
- [ ] Validation discountType theo category

---

## 9. Lợi ích

1. **Quản lý rõ ràng**: Admin dễ dàng phân biệt và quản lý 2 loại voucher
2. **Tránh nhầm lẫn**: Không áp nhầm mã shop cho ship và ngược lại
3. **UX tốt hơn**: Tạo voucher nhanh hơn với form được tối ưu theo loại
4. **Thống kê riêng**: Có thể xem hiệu quả từng loại voucher

---

## 10. Migration Path

Các voucher hiện tại sẽ được phân loại tự động:
- `discountType = FREE_SHIPPING` → `category = SHIPPING`
- Còn lại → `category = DISCOUNT`

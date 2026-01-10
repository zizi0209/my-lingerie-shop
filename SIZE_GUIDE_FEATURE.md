# Tính Năng Hướng Dẫn Chọn Size - Lingerie 6C

## 1. Đặt Vấn Đề

### 1.1 Tại sao cần Hướng dẫn chọn size?

Với sản phẩm nội y (lingerie), việc chọn đúng size là **cực kỳ quan trọng** vì:

- **Tỷ lệ hoàn hàng cao**: Ngành nội y có tỷ lệ return 20-30% do chọn sai size
- **Sản phẩm nhạy cảm**: Khách không thể thử trước khi mua online
- **Đa dạng hệ size**: Mỗi brand có bảng size khác nhau (VN, US, EU, UK)
- **Tăng niềm tin**: Hướng dẫn chi tiết giúp khách tự tin đặt hàng

### 1.2 Hiện trạng

```tsx
// Hiện tại chỉ có button placeholder, chưa có chức năng
<button className="text-sm text-gray-500 hover:text-black underline">
  Hướng dẫn chọn size
</button>
```

---

## 2. Phân Tích Yêu Cầu

### 2.1 User Flow

```
User xem sản phẩm
    ↓
Thấy các size: S, M, L, XL
    ↓
Không biết chọn size nào?
    ↓
Click "Hướng dẫn chọn size"
    ↓
Modal hiện ra với:
  - Bảng size chi tiết (số đo)
  - Hướng dẫn cách đo
  - Gợi ý size dựa trên số đo
    ↓
Chọn đúng size → Mua hàng
```

### 2.2 Nội dung cần có trong Size Guide

#### A. Bảng Size Áo Lót (Bra)

| Size | Vòng ngực dưới (cm) | Cup | Vòng ngực trên (cm) |
|------|---------------------|-----|---------------------|
| 70A  | 68-72              | A   | 78-80               |
| 70B  | 68-72              | B   | 80-82               |
| 75A  | 73-77              | A   | 83-85               |
| 75B  | 73-77              | B   | 85-87               |
| 80A  | 78-82              | A   | 88-90               |
| 80B  | 78-82              | B   | 90-92               |
| ...  | ...                | ... | ...                 |

#### B. Bảng Size Quần Lót

| Size | Vòng mông (cm) | Vòng eo (cm) |
|------|----------------|--------------|
| S    | 86-90          | 62-66        |
| M    | 90-94          | 66-70        |
| L    | 94-98          | 70-74        |
| XL   | 98-102         | 74-78        |

#### C. Bảng Size Đồ Ngủ

| Size | Chiều cao (cm) | Cân nặng (kg) | Vòng ngực (cm) |
|------|----------------|---------------|----------------|
| S    | 150-158        | 42-48         | 78-84          |
| M    | 158-165        | 48-54         | 84-90          |
| L    | 165-170        | 54-60         | 90-96          |
| XL   | 170-175        | 60-68         | 96-102         |

### 2.3 Tính năng nâng cao (Optional)

1. **Size Calculator**: Nhập số đo → Gợi ý size
2. **Size theo Category**: Mỗi danh mục có bảng size riêng
3. **Lưu size của tôi**: User save size để không phải chọn lại

---

## 3. Giải Pháp Triển Khai

### 3.1 Kiến trúc

```
┌─────────────────────────────────────────────────────────┐
│                   Size Guide Modal                       │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ Tabs:           │  │ Content:                    │  │
│  │ - Bảng size     │  │ - Bảng size theo category   │  │
│  │ - Cách đo       │  │ - Hình minh họa            │  │
│  │ - Gợi ý size    │  │ - Công cụ tính size        │  │
│  └─────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Cấu trúc Component

```
frontend/src/components/product/
├── SizeGuideModal.tsx      # Modal chính
├── SizeChart.tsx           # Bảng size theo category
├── MeasurementGuide.tsx    # Hướng dẫn cách đo
└── SizeCalculator.tsx      # Công cụ gợi ý size (optional)
```

### 3.3 Data Structure

```typescript
interface SizeChart {
  categorySlug: string;  // "ao-lot", "quan-lot", "do-ngu"
  categoryName: string;
  sizes: SizeInfo[];
  measurementGuide: MeasurementGuide;
}

interface SizeInfo {
  size: string;          // "S", "M", "L", "70A", "75B"
  bust?: string;         // "78-84"
  waist?: string;        // "62-66"
  hips?: string;         // "86-90"
  underBust?: string;    // "68-72" (cho bra)
  cup?: string;          // "A", "B", "C" (cho bra)
  height?: string;       // "150-158"
  weight?: string;       // "42-48"
}

interface MeasurementGuide {
  title: string;
  steps: {
    name: string;
    description: string;
    image?: string;
  }[];
}
```

---

## 4. Kế Hoạch Triển Khai

### Phase 1: Size Guide Modal cơ bản
- [x] Tạo component SizeGuideModal
- [x] Bảng size tĩnh theo category
- [x] Hướng dẫn cách đo với hình minh họa
- [x] Tích hợp vào trang sản phẩm

### Phase 2: Nâng cao (Tương lai)
- [ ] Lưu bảng size vào database (Admin quản lý)
- [ ] Size Calculator
- [ ] Lưu "Size của tôi" cho user đã đăng nhập

---

## 5. Thiết Kế UI/UX

### 5.1 Modal Layout

```
┌──────────────────────────────────────────────────────────┐
│  ╳                    Hướng dẫn chọn size                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  [Áo lót] [Quần lót] [Đồ ngủ]     ← Tabs theo category   │
│  ─────────────────────────────                           │
│                                                          │
│  📏 BẢNG SIZE                                            │
│  ┌────────┬──────────────┬─────────────────────┐        │
│  │ Size   │ Vòng ngực    │ Vòng ngực dưới     │        │
│  ├────────┼──────────────┼─────────────────────┤        │
│  │ 70A    │ 78-80 cm     │ 68-72 cm           │        │
│  │ 70B    │ 80-82 cm     │ 68-72 cm           │        │
│  │ ...    │ ...          │ ...                │        │
│  └────────┴──────────────┴─────────────────────┘        │
│                                                          │
│  📐 CÁCH ĐO                                              │
│  ┌──────────────────────────────────────────────┐       │
│  │  [Hình minh họa]                             │       │
│  │                                               │       │
│  │  1. Vòng ngực trên: Đo ngang qua điểm...    │       │
│  │  2. Vòng ngực dưới: Đo sát dưới ngực...     │       │
│  └──────────────────────────────────────────────┘       │
│                                                          │
│  💡 MẸO: Nếu bạn đang phân vân giữa 2 size,              │
│     hãy chọn size lớn hơn để thoải mái hơn.             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Responsive

- **Desktop**: Modal 600px width, 2 columns
- **Tablet**: Modal full width - 40px padding
- **Mobile**: Full screen modal với scroll

---

## 6. Implementation Notes

### 6.1 Data tĩnh ban đầu

Vì chưa cần Admin quản lý, sẽ hardcode data trong file constants:

```typescript
// constants/sizeCharts.ts
export const SIZE_CHARTS = {
  "ao-lot": { ... },
  "quan-lot": { ... },
  "do-ngu": { ... },
  "default": { ... }  // Fallback
}
```

### 6.2 Xác định category của sản phẩm

```typescript
const getCategorySlug = (product: Product) => {
  return product.category?.slug || "default";
};
```

### 6.3 Accessibility

- Modal có `aria-modal="true"`
- Focus trap khi modal mở
- Đóng bằng ESC key
- Close button có `aria-label`

---
sidebar_position: 1
---

# Size System Overview

Hệ thống gợi ý size thông minh của My Lingerie Shop với công nghệ Sister Sizing và Brand Fit Adjustment.

## 🎯 Tổng quan

Size System V2 là hệ thống recommendation tiên tiến giúp khách hàng tìm được size phù hợp nhất, kể cả khi size cần đã hết hàng.

### Tính năng chính

#### 1. Sister Sizing (Size Chị Em)

Khi size bạn cần hết hàng, hệ thống tự động gợi ý **size thay thế** có cùng cup volume:

**Ví dụ:** Bạn cần `34C` nhưng hết hàng

```
Gợi ý thay thế:
├─ 32D (band chặt hơn, cùng cup volume)
└─ 36B (band lỏng hơn, cùng cup volume)
```

**Nguyên lý:**
- Band càng nhỏ → Cup phải lớn hơn để giữ cùng volume
- Band càng lớn → Cup phải nhỏ hơn để giữ cùng volume

#### 2. International Size Conversion

Hỗ trợ hiển thị size theo khu vực:

| US Size | UK Size | EU Size |
|---------|---------|---------|
| 34C | 34C | 75C |
| 34DD | 34DD | 75E ⚠️ |
| 34DDD/F | 34E | 75F |

:::warning Lưu ý
**US 34DD ≠ EU 75DD**  
Đúng là: **US 34DD = EU 75E**

Hệ thống tự động convert chính xác!
:::

#### 3. Brand Fit Adjustment

Mỗi brand có độ fit khác nhau:

- **True to Size**: Victoria's Secret
- **Runs Small**: Agent Provocateur (nên chọn size lớn hơn)
- **Runs Large**: Bluebella (nên chọn size nhỏ hơn)

Hệ thống sẽ hiển thị cảnh báo và gợi ý size phù hợp.

## 🎨 Cách sử dụng

### Bước 1: Chọn sản phẩm

Vào trang sản phẩm bạn muốn mua.

### Bước 2: Chọn Region

Click vào **Region Switcher** để chọn khu vực của bạn:
- 🇺🇸 US (Mỹ)
- 🇬🇧 UK (Anh)
- 🇪🇺 EU (Châu Âu)

### Bước 3: Chọn Size

Chọn size thông thường của bạn từ dropdown.

### Bước 4: Xem gợi ý

Nếu size đã chọn hết hàng, hệ thống sẽ hiển thị:

:::tip Sister Size Alert
⚠️ Size **34C** tạm hết hàng

**Size thay thế:**
- ✅ 32D (còn 5 sản phẩm)
- ✅ 36B (còn 3 sản phẩm)
:::

### Bước 5: Brand Fit Notice

Nếu brand chạy nhỏ/lớn, sẽ có thông báo:

:::info Brand Fit
⚠️ **Agent Provocateur runs small**

Bạn thường mặc: 34C  
Gợi ý cho brand này: **36D**
:::

## 📊 Cup Volume Equivalence

Các size có cùng cup volume (có thể thay thế cho nhau):

| Volume | Sister Sizes |
|--------|--------------|
| 1 | 28A, 30AA |
| 2 | 28B, 30A, 32AA |
| 3 | 28C, 30B, 32A, 34AA |
| 4 | 28D, 30C, 32B, 34A, 36AA |
| 5 | 28DD, 30D, 32C, 34B, 36A, 38AA |
| 6 | 28E, 30DD, 32D, **34C**, 36B, 38A, 40AA |

**Ví dụ:** 34C có volume = 6, có thể thay bằng 32D hoặc 36B.

## 🔍 Tìm hiểu thêm

- [Size Recommendations](./recommendations) - Cách hệ thống gợi ý hoạt động
- [Sister Sizing](./sister-sizing) - Chi tiết về thuật toán Sister Sizing

## ❓ Câu hỏi thường gặp

**Q: Sister size có fit giống 100% không?**  
A: Không hoàn toàn. Band size khác nhau sẽ cho cảm giác khác nhau (chặt hơn hoặc lỏng hơn), nhưng cup volume thì giống nhau.

**Q: Tôi nên chọn sister size nào?**  
A: 
- Nếu bạn thích fit chặt → Chọn sister down (32D thay vì 34C)
- Nếu bạn thích fit thoải mái → Chọn sister up (36B thay vì 34C)

**Q: Mọi brand đều dùng được sister sizing?**  
A: Có, nhưng cần kết hợp với Brand Fit Adjustment để chính xác hơn.

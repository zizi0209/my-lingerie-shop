# Welcome UX Strategy - Lingerie Shop

> **Mục tiêu**: Chuyển đổi trải nghiệm từ "Làm phiền" sang "Mời gọi"

---

## 1. Phân Tích Vấn Đề Hiện Tại

### 1.1 Bug Report

```
Console Error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!"
Location: src/lib/api.ts (line 156)
Trigger: AuthContext.tsx - initAuth() gọi API /users/profile
```

### 1.2 Root Cause

| File              | Vấn đề                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `api.ts`          | Khi có `accessToken` cũ trong localStorage → gọi API → 401 → throw Error với message hiển thị cho user |
| `AuthContext.tsx` | `initAuth()` catch error nhưng không phân biệt "token hết hạn" vs "chưa từng đăng nhập"                |

### 1.3 Impact (Tác động tiêu cực)

- ❌ Bounce Rate tăng cao (khách thoát ngay)
- ❌ Trải nghiệm đầu tiên tệ
- ❌ Mất cơ hội thu thập Lead
- ❌ Brand image bị ảnh hưởng

---

## 2. Giải Pháp Đề Xuất

### Phase 1: Bug Fix - Silent Auth Recovery (Ưu tiên cao)

> Sửa lỗi hiển thị thông báo khó chịu

**Thay đổi:**

1. **`api.ts`**: Không throw error với message cho user khi init auth fail
2. **`AuthContext.tsx`**: Xử lý silent fail, chỉ cleanup token mà không thông báo

**Logic mới:**

```
User mở web lần đầu
  └─> Có accessToken cũ trong localStorage?
        ├─ KHÔNG → Không làm gì (guest mode)
        └─ CÓ → Gọi /users/profile
              ├─ SUCCESS → User đã đăng nhập
              └─ 401 FAIL → Silent cleanup token (KHÔNG hiện thông báo)
                           → Chuyển sang guest mode
```

---

### Phase 2: Welcome Incentive System (Mời gọi đăng ký)

> Thay thế "popup đăng nhập" bằng "popup ưu đãi"

#### 2.1 Component: `WelcomeOffer`

| Thuộc tính         | Giá trị                                              |
| ------------------ | ---------------------------------------------------- |
| **Trigger**        | Sau 15 giây HOẶC scroll 50% trang                    |
| **Kiểu hiển thị**  | Slide-in từ góc dưới phải (không che toàn màn hình)  |
| **Nội dung**       | "🎁 Tặng 50K cho đơn đầu tiên - Đăng ký ngay!"       |
| **CTA Button**     | "Nhận ưu đãi" → Redirect đến /register               |
| **Close behavior** | Lưu `localStorage.welcomeOfferDismissed = timestamp` |
| **Cooldown**       | Không hiện lại trong 7 ngày sau khi đóng             |

#### 2.2 Điều kiện hiển thị

```typescript
const shouldShowWelcome = () => {
  // Không hiện nếu:
  // 1. Đã đăng nhập
  // 2. Đã đóng popup trong 7 ngày qua
  // 3. Đã đăng ký email nhận ưu đãi
  // 4. Đang ở trang login/register
};
```

#### 2.3 UI/UX Specs

```
┌─────────────────────────────────────────┐
│                                         │
│           [Main Content]                │
│                                         │
│                                         │
│                    ┌──────────────────┐ │
│                    │ 🎁 Chào bạn mới! │ │
│                    │                  │ │
│                    │ Giảm 50K đơn đầu │ │
│                    │                  │ │
│                    │ [Nhận ngay]  [✕] │ │
│                    └──────────────────┘ │
└─────────────────────────────────────────┘
```

---

### Phase 3: Top Bar Announcement (Optional)

> Banner nhẹ nhàng, không che nội dung

```
┌─────────────────────────────────────────────────────────┐
│ 🎉 Tặng nàng 50k cho đơn đầu tiên - Đăng ký ngay →    [✕] │
└─────────────────────────────────────────────────────────┘
```

- Hiển thị cho guest user
- Sticky top, height: 40px
- Có thể dismiss, lưu trạng thái 24h

---

## 3. Implementation Plan

### 3.1 Files cần sửa/tạo

| File                                       | Action | Mô tả                                                                |
| ------------------------------------------ | ------ | -------------------------------------------------------------------- |
| `frontend/src/lib/api.ts`                  | EDIT   | Phân biệt error types, không throw user-facing message khi init fail |
| `frontend/src/context/AuthContext.tsx`     | EDIT   | Silent fail handling                                                 |
| `frontend/src/components/WelcomeOffer.tsx` | CREATE | Component popup ưu đãi                                               |
| `frontend/src/hooks/useWelcomeOffer.ts`    | CREATE | Logic timing & localStorage                                          |
| `frontend/src/app/layout.tsx`              | EDIT   | Thêm WelcomeOffer component                                          |

### 3.2 Timeline ước tính

| Phase                  | Thời gian | Priority        |
| ---------------------- | --------- | --------------- |
| Phase 1: Bug Fix       | 30 phút   | 🔴 Critical     |
| Phase 2: Welcome Offer | 1-2 giờ   | 🟡 High         |
| Phase 3: Top Bar       | 30 phút   | 🟢 Nice-to-have |

---

## 4. Technical Specifications

### 4.1 Error Handling Strategy

```typescript
// api.ts - Phân loại error
class AuthError extends Error {
  constructor(
    message: string,
    public code: "SESSION_EXPIRED" | "UNAUTHORIZED" | "NETWORK_ERROR",
    public silent: boolean = false // true = không hiện cho user
  ) {
    super(message);
  }
}

// Khi init auth fail → silent = true
// Khi user action fail (vd: submit form) → silent = false
```

### 4.2 WelcomeOffer State Management

```typescript
interface WelcomeOfferState {
  dismissed: boolean;
  dismissedAt: number | null;
  emailSubmitted: boolean;
}

// localStorage key: 'lingerie_welcome_offer'
// Cooldown: 7 days (604800000 ms)
```

### 4.3 Tracking Events (Optional - cho Analytics)

| Event                     | Trigger           |
| ------------------------- | ----------------- |
| `welcome_offer_shown`     | Popup hiển thị    |
| `welcome_offer_clicked`   | Click "Nhận ngay" |
| `welcome_offer_dismissed` | Click X đóng      |

---

## 5. Testing Checklist

### 5.1 Bug Fix Tests

- [ ] Mở web lần đầu (không có token) → Không hiện thông báo lỗi
- [ ] Có token cũ/hết hạn trong localStorage → Silent cleanup, không thông báo
- [ ] User đăng nhập thành công → Token hoạt động bình thường
- [ ] User đăng nhập, đợi token hết hạn, thao tác → Thông báo phù hợp

### 5.2 Welcome Offer Tests

- [ ] Guest user, sau 15s → Hiện popup
- [ ] Guest user, scroll 50% → Hiện popup
- [ ] Đóng popup → Không hiện lại trong 7 ngày
- [ ] Đã đăng nhập → Không hiện popup
- [ ] Đang ở /login hoặc /register → Không hiện popup

---

## 6. Rollback Plan

Nếu có vấn đề sau deploy:

1. Revert commit Phase 1 (Bug Fix)
2. Disable WelcomeOffer component bằng feature flag

---

## 7. Success Metrics

| Metric                  | Before | Target   |
| ----------------------- | ------ | -------- |
| Bounce Rate (trang chủ) | TBD    | Giảm 20% |
| Registration Rate       | TBD    | Tăng 15% |
| Console Errors          | Có     | 0        |

---

## 8. Approval

- [ ] **Product Owner** approve UX flow
- [ ] **Developer** review technical specs
- [ ] **QA** review test cases

---

**Tạo bởi**: Droid AI  
**Ngày**: 2026-01-09  
**Version**: 1.0

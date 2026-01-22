# PHASE 1: Settings Page Test Checklist

> **Mục tiêu:** Đảm bảo Settings page hoạt động 100%  
> **Ngày test:** 2026-01-02  
> **Tester:** Development Team

---

## 📋 PRE-TEST SETUP

### ✅ Bước 1: Khởi động Servers

**Backend:**
```bash
# Terminal 1
cd backend
npm run dev
# Expected: Server running on http://localhost:5000
```

**Frontend:**
```bash
# Terminal 2
cd frontend
npm run dev
# Expected: Next.js running on http://localhost:3000
```

### ✅ Bước 2: Đăng nhập Admin

1. Mở trình duyệt: http://localhost:3000
2. Click "Đăng nhập"
3. Nhập:
   - Email: `admin@example.com` (hoặc email admin đã seed)
   - Password: `Admin123!@#` (hoặc password đã đặt)
4. Đăng nhập thành công → Redirect to Dashboard

**Nếu chưa có Admin user:**
```bash
cd backend
npm run seed
```

### ✅ Bước 3: Truy cập Settings Page

- URL: http://localhost:3000/dashboard/settings
- Expected: Hiển thị trang với 5 tabs

---

## 🧪 TEST CASES

### **Test Case 1: Tab Navigation**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1.1 | Click tab "Chung" | Tab active, hiển thị form thông tin shop | ⬜ |
| 1.2 | Click tab "Đơn hàng" | Tab active, hiển thị form shipping | ⬜ |
| 1.3 | Click tab "Thanh toán" | Tab active, hiển thị form bank info | ⬜ |
| 1.4 | Click tab "Thông báo" | Tab active, hiển thị toggle & email | ⬜ |
| 1.5 | Click tab "Tích hợp" | Tab active, hiển thị Pixel IDs & SEO | ⬜ |

---

### **Test Case 2: Tab "Chung" - Thông tin cửa hàng**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 2.1 | Nhập "Tên cửa hàng": "Berry Silk Lingerie" | Input value hiển thị đúng | ⬜ |
| 2.2 | Nhập "Email liên hệ": "contact@berrysilk.com" | Input value hiển thị đúng | ⬜ |
| 2.3 | Nhập "SĐT": "0901234567" | Input value hiển thị đúng | ⬜ |
| 2.4 | Nhập "Địa chỉ": "123 Nguyễn Huệ, Q1, HCM" | Input value hiển thị đúng | ⬜ |
| 2.5 | Nhập "Mô tả": "Shop nội y cao cấp" | Textarea hiển thị đúng | ⬜ |

**Upload Logo:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 2.6 | Click "Tải logo lên" | Mở file picker | ⬜ |
| 2.7 | Chọn ảnh PNG/JPG (<5MB) | Hiển thị "Đang nén..." | ⬜ |
| 2.8 | Sau khi nén xong | Preview ảnh, hiển thị kích thước & % giảm | ⬜ |
| 2.9 | Click "Xóa logo" | Preview biến mất | ⬜ |

**Social Media:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 2.10 | Nhập Facebook URL | Input value hiển thị đúng | ⬜ |
| 2.11 | Nhập Instagram URL | Input value hiển thị đúng | ⬜ |
| 2.12 | Nhập TikTok URL | Input value hiển thị đúng | ⬜ |

**Chế độ bảo trì:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 2.13 | Click toggle "Chế độ bảo trì" | Toggle sang BẬT (màu amber) | ⬜ |
| 2.14 | Click toggle lần 2 | Toggle sang TẮT (màu xám) | ⬜ |

**Giao diện:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 2.15 | Click color picker "Màu chính" | Hiển thị color picker | ⬜ |
| 2.16 | Chọn màu mới (VD: #FF1493) | Input text hiển thị hex code | ⬜ |
| 2.17 | Click color picker "Màu phụ" | Hiển thị color picker | ⬜ |
| 2.18 | Chọn màu mới (VD: #4B0082) | Input text hiển thị hex code | ⬜ |

---

### **Test Case 3: Tab "Đơn hàng" - Shipping Settings**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 3.1 | Nhập "Ngưỡng miễn phí vận chuyển": 500000 | Input hiển thị số, suffix "VNĐ" | ⬜ |
| 3.2 | Nhập "Phí vận chuyển mặc định": 30000 | Input hiển thị số, suffix "VNĐ" | ⬜ |

---

### **Test Case 4: Tab "Thanh toán" - Bank Info**

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 4.1 | Nhập "Tên ngân hàng": "Vietcombank" | Input value hiển thị đúng | ⬜ |
| 4.2 | Nhập "Số tài khoản": "1234567890" | Input value hiển thị đúng, font mono | ⬜ |
| 4.3 | Nhập "Chủ tài khoản": "NGUYEN VAN A" | Input value hiển thị đúng, UPPERCASE | ⬜ |

---

### **Test Case 5: Tab "Thông báo" - Notifications**

**Toggle Cảnh báo hết hàng:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 5.1 | Click toggle "Cảnh báo hết hàng" BẬT | Toggle màu xanh, xuất hiện input "Ngưỡng" | ⬜ |
| 5.2 | Nhập "Ngưỡng cảnh báo": 5 | Input hiển thị số, suffix "sản phẩm" | ⬜ |
| 5.3 | Click toggle "Cảnh báo hết hàng" TẮT | Toggle màu xám, input "Ngưỡng" biến mất | ⬜ |

**Toggle Thông báo đơn hàng:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 5.4 | Click toggle "Thông báo đơn hàng mới" BẬT | Toggle màu xanh, xuất hiện input "Email nhận thông báo" | ⬜ |
| 5.5 | Nhập "Email nhận thông báo": "admin@shop.com, owner@shop.com" | Input hiển thị đúng | ⬜ |
| 5.6 | Click toggle "Thông báo đơn hàng mới" TẮT | Toggle màu xám, input "Email" biến mất | ⬜ |

**Logic tổng hợp:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 5.7 | Cả 2 toggle đều TẮT | Không hiển thị input nào | ⬜ |
| 5.8 | Bật toggle "Đơn hàng", tắt "Hết hàng" | Chỉ hiện input "Email nhận thông báo" | ⬜ |
| 5.9 | Bật toggle "Hết hàng", tắt "Đơn hàng" | Chỉ hiện input "Ngưỡng cảnh báo" | ⬜ |
| 5.10 | Cả 2 toggle đều BẬT | Hiện đầy đủ: Email + Ngưỡng | ⬜ |

---

### **Test Case 6: Tab "Tích hợp" - Integrations**

**Marketing Pixels:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 6.1 | Nhập "Facebook Pixel ID": "123456789012345" | Input hiển thị, font mono | ⬜ |
| 6.2 | Nhập "Google Analytics ID": "G-XXXXXXXXXX" | Input hiển thị, font mono | ⬜ |
| 6.3 | Nhập "TikTok Pixel ID": "ABC123XYZ" | Input hiển thị, font mono | ⬜ |

**SEO Settings:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 6.4 | Nhập "SEO Title": "Berry Silk - Nội y cao cấp" | Input hiển thị đúng | ⬜ |
| 6.5 | Nhập "SEO Description": "Shop chuyên..." | Textarea hiển thị đúng | ⬜ |
| 6.6 | Nhập "SEO Keywords": "lingerie, nội y" | Input hiển thị đúng | ⬜ |

**Upload OG Image:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 6.7 | Click "Tải ảnh lên" (OG Image) | Mở file picker | ⬜ |
| 6.8 | Chọn ảnh 1200x630px | Hiển thị "Đang nén..." | ⬜ |
| 6.9 | Sau khi nén xong | Preview ảnh (ratio 2:1), hiển thị kích thước | ⬜ |
| 6.10 | Click "Xóa ảnh" | Preview biến mất | ⬜ |

**Chính sách & Hướng dẫn:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 6.11 | Nhập "Chính sách đổi trả" | Textarea hiển thị đúng (4 rows) | ⬜ |
| 6.12 | Nhập "Hướng dẫn chọn size" | Textarea hiển thị đúng (4 rows) | ⬜ |

---

### **Test Case 7: Save & Load Data**

**Save Function:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 7.1 | Điền đầy đủ tất cả các trường | Không có validation errors | ⬜ |
| 7.2 | Click button "Lưu thay đổi" | Button hiển thị "Đang lưu..." + spinner | ⬜ |
| 7.3 | Chờ response | Hiển thị toast success "Đã lưu cấu hình thành công!" | ⬜ |
| 7.4 | Mở Network tab | Request `PUT /api/admin/system-config` → 200 OK | ⬜ |

**Load Function:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 7.5 | Press F5 (hard reload) | Page reload, hiển thị loading state | ⬜ |
| 7.6 | Sau khi load xong | Tất cả giá trị đã lưu được hiển thị đúng | ⬜ |
| 7.7 | Check Network tab | Request `GET /api/admin/system-config` → 200 OK | ⬜ |
| 7.8 | Check Response data | JSON chứa tất cả config keys | ⬜ |

---

### **Test Case 8: Upload Images (Logo & OG Image)**

**Upload Flow:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 8.1 | Upload logo 2MB | Nén thành công, preview hiện | ⬜ |
| 8.2 | Upload OG Image 3MB | Nén thành công, preview hiện | ⬜ |
| 8.3 | Click "Lưu thay đổi" | Upload cả 2 ảnh lên Cloudinary | ⬜ |
| 8.4 | Check Network tab | 2 requests `POST /api/media/single` → 200 OK | ⬜ |
| 8.5 | Check Response | Trả về URL Cloudinary cho cả 2 ảnh | ⬜ |
| 8.6 | F5 reload | Cả 2 ảnh preview từ URL Cloudinary | ⬜ |

---

### **Test Case 9: Error Handling**

**Network Errors:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 9.1 | Tắt backend server | - | ⬜ |
| 9.2 | Click "Lưu thay đổi" | Hiển thị toast error "Có lỗi xảy ra" | ⬜ |
| 9.3 | Bật lại backend | - | ⬜ |
| 9.4 | Click "Lưu thay đổi" | Save thành công | ⬜ |

**Validation Errors:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 9.5 | Nhập email sai format "admin@" | Browser validation hoặc error message | ⬜ |
| 9.6 | Upload file >5MB | Error "File too large" | ⬜ |
| 9.7 | Upload file .exe | Error "Invalid file type" | ⬜ |

---

### **Test Case 10: Responsive & Dark Mode**

**Responsive:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 10.1 | Resize browser to mobile (375px) | Layout responsive, tabs stack | ⬜ |
| 10.2 | Test tất cả tabs trên mobile | Tất cả forms hoạt động | ⬜ |
| 10.3 | Resize to tablet (768px) | Layout responsive | ⬜ |
| 10.4 | Resize to desktop (1920px) | Layout tối ưu | ⬜ |

**Dark Mode:**
| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 10.5 | Click toggle Dark Mode (ở header) | Chuyển sang dark mode | ⬜ |
| 10.6 | Test tất cả tabs | Colors contrast tốt | ⬜ |
| 10.7 | F5 reload | Dark mode được giữ | ⬜ |

---

## 🐛 BUGS FOUND

### Critical Bugs
> (Ghi lại bugs phát hiện trong quá trình test)

| ID | Description | Steps to Reproduce | Expected | Actual | Status |
|----|-------------|-------------------|----------|--------|--------|
| C1 | - | - | - | - | - |

### High Priority Bugs
| ID | Description | Steps to Reproduce | Expected | Actual | Status |
|----|-------------|-------------------|----------|--------|--------|
| H1 | - | - | - | - | - |

### Low Priority Bugs
| ID | Description | Steps to Reproduce | Expected | Actual | Status |
|----|-------------|-------------------|----------|--------|--------|
| L1 | - | - | - | - | - |

---

## 📊 TEST SUMMARY

| Category | Total | Passed | Failed | Skipped | Pass Rate |
|----------|-------|--------|--------|---------|-----------|
| Tab Navigation | 5 | 0 | 0 | 0 | 0% |
| Tab Chung | 18 | 0 | 0 | 0 | 0% |
| Tab Đơn hàng | 2 | 0 | 0 | 0 | 0% |
| Tab Thanh toán | 3 | 0 | 0 | 0 | 0% |
| Tab Thông báo | 10 | 0 | 0 | 0 | 0% |
| Tab Tích hợp | 12 | 0 | 0 | 0 | 0% |
| Save & Load | 8 | 0 | 0 | 0 | 0% |
| Upload Images | 6 | 0 | 0 | 0 | 0% |
| Error Handling | 7 | 0 | 0 | 0 | 0% |
| Responsive & Dark Mode | 7 | 0 | 0 | 0 | 0% |
| **TOTAL** | **78** | **0** | **0** | **0** | **0%** |

---

## ✅ PHASE 1 COMPLETION CRITERIA

Phase 1 được coi là hoàn thành khi:

- [ ] Tất cả 78 test cases PASSED (Pass rate ≥ 95%)
- [ ] Không có Critical Bugs
- [ ] High Priority Bugs ≤ 2
- [ ] Settings page save data thành công
- [ ] Settings page load data thành công sau reload
- [ ] Upload images hoạt động
- [ ] Responsive trên mobile/tablet/desktop
- [ ] Dark mode hoạt động tốt
- [ ] Không có TypeScript errors trong console
- [ ] TODO.md được update với checklist hoàn thành

---

**Test started:** _____________  
**Test completed:** _____________  
**Tester signature:** _____________

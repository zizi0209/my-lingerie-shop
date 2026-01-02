# 🚀 Quick Test Guide - Settings Page

## ✅ STATUS: Ready to Test!

**Pre-checks completed:**
- ✅ Backend running on port 5000 (PID 5596)
- ✅ Frontend running on port 3000 (PID 9480)
- ✅ Frontend .env.local created with API_URL
- ✅ TypeScript checks PASSED (Frontend + Backend)
- ✅ Backend health check OK
- ✅ Database seeded with admin user

## Bước 1: Admin Credentials

**Admin Login:**
- Email: Lấy từ `backend/.env` → `ADMIN_EMAIL`
- Password: Lấy từ `backend/.env` → `ADMIN_PASSWORD`

*Note: Check your backend/.env file for actual credentials*

---

## Bước 2: Đăng nhập Admin

1. **Mở trình duyệt:** http://localhost:3000
2. **Click:** "Đăng nhập" (hoặc nếu đã đăng nhập, skip bước này)
3. **Nhập credentials từ backend/.env:**
   - Email: Value of `ADMIN_EMAIL`
   - Password: Value of `ADMIN_PASSWORD`
4. **Click:** "Đăng nhập"
5. **Expected:** Redirect to Dashboard

**If login fails:**
- Check Network tab (F12) for 401 errors
- Try reset: `cd backend && npm run seed`

---

## Bước 3: Truy cập Settings Page

URL: http://localhost:3000/dashboard/settings

### ✅ Checklist nhanh:

#### 1. Tab Navigation (5 tabs)
- [ ] Tab "Chung" active mặc định
- [ ] Click tab "Đơn hàng" → Chuyển tab
- [ ] Click tab "Thanh toán" → Chuyển tab  
- [ ] Click tab "Thông báo" → Chuyển tab
- [ ] Click tab "Tích hợp" → Chuyển tab

#### 2. Tab "Chung" - Điền form
- [ ] Nhập "Tên cửa hàng": **Berry Silk Lingerie**
- [ ] Nhập "Email": **contact@example.com**
- [ ] Nhập "SĐT": **0901234567**
- [ ] Nhập "Địa chỉ": **123 Nguyễn Huệ, Q1, HCM**
- [ ] Nhập Facebook URL: **https://facebook.com/example**
- [ ] Nhập Instagram URL: **https://instagram.com/example**

#### 3. Tab "Đơn hàng"
- [ ] Nhập "Ngưỡng freeship": **500000**
- [ ] Nhập "Phí ship mặc định": **30000**

#### 4. Tab "Thanh toán"
- [ ] Nhập "Tên ngân hàng": **Vietcombank**
- [ ] Nhập "Số TK": **1234567890**
- [ ] Nhập "Chủ TK": **NGUYEN VAN A**

#### 5. Tab "Thông báo"
- [ ] Bật toggle "Cảnh báo hết hàng"
- [ ] Nhập "Ngưỡng": **5**
- [ ] Bật toggle "Thông báo đơn hàng"
- [ ] Nhập "Email nhận": **example@shop.com, owner@shop.com**

#### 6. Tab "Tích hợp"
- [ ] Nhập "Facebook Pixel": **123456789012345**
- [ ] Nhập "Google Analytics": **G-XXXXXXXXXX**
- [ ] Nhập "SEO Title": **Berry Silk - Nội y cao cấp**
- [ ] Nhập "SEO Description": **Shop nội y cao cấp số 1 Việt Nam**

#### 7. SAVE & RELOAD TEST
- [ ] Click button **"Lưu thay đổi"**
- [ ] Thấy loading spinner + text "Đang lưu..."
- [ ] Thấy toast success "Đã lưu cấu hình thành công!"
- [ ] Press **F5** để reload trang
- [ ] Kiểm tra: **Tất cả giá trị vẫn còn** ✅

---

## Bước 4: Kiểm tra Network (Chrome DevTools)

### Mở DevTools:
- Windows: `F12` hoặc `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`

### Tab Network:
1. Click tab "Network"
2. Click button "Lưu thay đổi"
3. Tìm request: `PUT /api/admin/system-config`
4. Check:
   - Status: **200 OK** ✅
   - Response: `{"success": true, ...}` ✅

### Tab Console:
- Không có errors màu đỏ ✅
- Chỉ có logs màu xanh/xám

---

## Bước 5: Test Upload Images (Optional)

### Upload Logo:
1. Click "Tải logo lên" trong tab "Chung"
2. Chọn ảnh PNG/JPG (<5MB)
3. Thấy "Đang nén..."
4. Preview ảnh xuất hiện
5. Thấy kích thước file giảm (VD: -45%)
6. Click "Lưu thay đổi"
7. F5 reload → Logo vẫn hiển thị ✅

### Upload OG Image:
1. Click "Tải ảnh lên" trong tab "Tích hợp" (phần SEO)
2. Chọn ảnh 1200x630px
3. Preview ratio 2:1
4. Click "Lưu thay đổi"  
5. F5 reload → OG Image vẫn hiển thị ✅

---

## Bước 6: Test Dark Mode

1. Click icon 🌙 ở header (toggle dark mode)
2. Settings page chuyển sang dark mode
3. Check tất cả tabs:
   - Text contrast tốt
   - Colors không bị mất
   - Borders hiển thị rõ
4. F5 reload → Dark mode được giữ

---

## Bước 7: Test Responsive

### Mobile (375px):
1. F12 → Toggle device toolbar (Ctrl+Shift+M)
2. Chọn "iPhone SE" hoặc width 375px
3. Check:
   - Tab navigation responsive
   - Forms stack vertically
   - Buttons full-width

### Tablet (768px):
1. Chọn "iPad Mini" hoặc width 768px
2. Check layout 2 columns

### Desktop (1920px):
1. Chọn "Responsive" → Width 1920px
2. Check max-width container

---

## ❌ Common Issues & Solutions

### Issue 1: "Cannot GET /api/admin/system-config"
**Solution:**
```bash
# Check backend có chạy không
cd backend
npm run dev
```

### Issue 2: "401 Unauthorized"
**Solution:**
- Đăng xuất và đăng nhập lại
- Check token trong localStorage (F12 → Application → Local Storage)

### Issue 3: "Network Error"
**Solution:**
```bash
# Check backend port
cd backend
cat .env | grep PORT
# Expected: PORT=5000

# Check frontend API URL
cd frontend
cat .env.local | grep NEXT_PUBLIC_API_URL
# Expected: NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Issue 4: Upload ảnh lỗi
**Solution:**
- Check Cloudinary config trong backend `.env`
- Thử ảnh nhỏ hơn (<2MB)
- Check browser console có lỗi không

---

## ✅ Phase 1 Complete Criteria

Phase 1 xong khi:
- [x] Settings page mở được
- [x] Tất cả 5 tabs hiển thị
- [x] Điền form thành công
- [x] Click "Lưu thay đổi" → Save thành công
- [x] F5 reload → Data vẫn còn
- [x] Không có lỗi trong console
- [x] Network request 200 OK
- [x] Dark mode hoạt động
- [x] Responsive mobile/desktop

---

## 📸 Screenshots to Take

Chụp màn hình để báo cáo:
1. Settings page - Tab "Chung" (filled)
2. Settings page - Tab "Tích hợp" (filled)
3. Chrome DevTools - Network tab (200 OK)
4. Chrome DevTools - Console (no errors)
5. Settings page - Dark mode
6. Settings page - Mobile view

---

**Estimated time:** 15-20 phút  
**Difficulty:** ⭐⭐ (Easy)

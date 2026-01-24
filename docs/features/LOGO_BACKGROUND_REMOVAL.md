# Logo Background Removal Feature

## Tổng quan

Tính năng xóa nền ảnh logo tự động đã được tích hợp vào trang **Dashboard Settings** (`/dashboard/settings`).

## Cách sử dụng

### Bước 1: Truy cập Settings
1. Đăng nhập với tài khoản Admin
2. Vào **Dashboard** → **Settings**
3. Tab **General** → Section **Store Information**

### Bước 2: Upload Logo
1. Click nút **"Tải logo lên"** (Upload Logo)
2. Chọn file ảnh logo (PNG, JPG, WEBP)
3. Ảnh sẽ được tự động nén và hiển thị preview

### Bước 3: Xóa nền (Optional)
1. Sau khi upload, nút **"Xóa nền"** (màu tím) sẽ xuất hiện
2. Click nút **"Xóa nền"** để xử lý
3. Đợi 1-5 giây (tùy phương pháp)
4. Preview sẽ cập nhật với ảnh đã xóa nền
5. Badge **"Đã xóa nền"** (màu xanh) sẽ hiển thị

### Bước 4: Lưu
1. Click nút **"Lưu thay đổi"** (Save Changes)
2. Logo mới sẽ được áp dụng cho toàn bộ website

## UI Components

### Upload Button
- **Màu**: Primary (hồng)
- **Icon**: Upload
- **Text**: "Tải logo lên" / "Upload Logo"

### Remove Background Button
- **Màu**: Purple
- **Icon**: Zap (⚡)
- **Text**: "Xóa nền" / "Remove Background"
- **Loading**: "Đang xóa nền..." / "Removing background..."

### Success Badge
- **Màu**: Emerald (xanh lá)
- **Icon**: CheckCircle (✓)
- **Text**: "Đã xóa nền" / "Background removed"

### Remove Logo Button
- **Màu**: Slate (xám)
- **Icon**: X
- **Text**: "Xóa logo" / "Remove Logo"

## Phương pháp xử lý

Hệ thống hỗ trợ 3 phương pháp tự động:

### 1. AI Method (Tốt nhất)
- Sử dụng deep learning model
- Chất lượng cao nhất
- Xử lý tốt cả ảnh phức tạp
- Thời gian: 5-7 giây

### 2. Advanced Method (Tốt)
- Phân tích màu nền từ góc ảnh
- Xóa pixel tương tự
- Phù hợp logo nền đơn sắc
- Thời gian: 0.5-1 giây

### 3. Simple Method (Nhanh)
- Xóa nền trắng/đen
- Nhanh nhất
- Phù hợp logo đơn giản
- Thời gian: 0.2-0.5 giây

**Lưu ý**: Hệ thống tự động chọn phương pháp tốt nhất có sẵn.

## Tips để có kết quả tốt nhất

### ✅ Nên làm
- Upload ảnh có độ phân giải cao (ít nhất 500x500px)
- Sử dụng ảnh có nền đơn sắc (trắng, đen, xám)
- Logo có viền rõ ràng, không bị mờ
- Format PNG hoặc JPG chất lượng cao

### ❌ Không nên
- Upload ảnh quá nhỏ (<200x200px)
- Ảnh có nền nhiều màu, gradient phức tạp
- Logo bị mờ, nhiễu, chất lượng thấp
- Ảnh có watermark, text overlay

## Troubleshooting

### Kết quả không như mong đợi

**Vấn đề**: Còn sót nền hoặc bị xóa mất chi tiết

**Giải pháp**:
1. Thử upload lại với ảnh chất lượng cao hơn
2. Chỉnh sửa ảnh trước (crop, tăng contrast)
3. Sử dụng tool chỉnh sửa ảnh chuyên nghiệp (Photoshop, GIMP)

### Xử lý quá lâm

**Vấn đề**: Nút "Đang xóa nền..." không kết thúc

**Giải pháp**:
1. Đợi thêm 10-15 giây
2. Refresh trang và thử lại
3. Giảm kích thước ảnh trước khi upload
4. Liên hệ admin nếu vẫn lỗi

### Lỗi "Failed to remove background"

**Giải pháp**:
1. Kiểm tra file ảnh có hợp lệ không
2. Thử upload ảnh khác
3. Refresh trang và thử lại
4. Sử dụng ảnh gốc nếu không cần xóa nền

## Best Practices

### Cho Logo Shop
1. **Format**: PNG với nền trong suốt
2. **Kích thước**: 500x500px đến 1000x1000px
3. **Style**: Đơn giản, rõ ràng, dễ nhận diện
4. **Màu sắc**: Tương phản với background website

### Cho Logo có chữ
1. Upload ảnh có font rõ ràng
2. Tránh font quá mỏng hoặc quá nhỏ
3. Đảm bảo chữ không bị mờ

### Cho Logo có icon
1. Icon có viền rõ ràng
2. Không quá nhiều chi tiết nhỏ
3. Màu sắc tương phản với nền

## Technical Details

### Supported Formats
- PNG (khuyến nghị)
- JPG/JPEG
- WEBP

### File Size Limits
- Max: 10MB (được validate bởi backend)
- Recommended: < 2MB

### Output Format
- Format: PNG với alpha channel (transparency)
- Quality: 90%
- Compression: Level 9

### Processing Location
- **Backend**: Node.js + Sharp
- **Storage**: Cloudinary
- **Folder**: `settings/no-bg/`

## API Integration

Nếu bạn muốn tích hợp vào custom code:

```typescript
// Frontend
const formData = new FormData();
formData.append('image', file);
formData.append('folder', 'settings/no-bg');
formData.append('method', 'auto');

const response = await api.uploadFile(
  '/background-removal/remove',
  formData
);

console.log(response.data.processedUrl);
```

## Security & Privacy

- ✅ Chỉ Admin có quyền sử dụng
- ✅ Xử lý local trên server (không gửi ra ngoài)
- ✅ File được validate (type, size)
- ✅ Rate limiting để tránh abuse
- ✅ Tự động cleanup temporary files

## Future Enhancements

Các tính năng có thể thêm trong tương lai:

- [ ] Batch processing (xóa nền nhiều ảnh cùng lúc)
- [ ] Manual adjustment (chỉnh threshold/tolerance)
- [ ] Preview before/after comparison
- [ ] Undo/Redo functionality
- [ ] Save multiple versions
- [ ] Background color picker (thay nền màu khác)

## Support

Nếu gặp vấn đề:
1. Đọc phần Troubleshooting ở trên
2. Kiểm tra console log (F12)
3. Liên hệ technical support
4. Tham khảo `backend/BACKGROUND_REMOVAL_SETUP.md`

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: ✅ Production Ready

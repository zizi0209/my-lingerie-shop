# Hướng dẫn cài đặt Resend cho trang Contact

## Tổng quan

Trang Contact (`/contact`) sử dụng **Resend** để gửi email thông báo khi khách hàng gửi form liên hệ.

### Luồng hoạt động:
1. Khách hàng điền form → Submit
2. Frontend gọi API `POST /api/contact`
3. Backend lưu vào database (`ContactMessage` table)
4. Backend gửi 2 email qua Resend:
   - **Email cho Admin**: Thông báo có tin nhắn mới
   - **Email cho khách**: Xác nhận đã nhận tin nhắn

---

## Các bước cài đặt

### Bước 1: Tạo tài khoản Resend
1. Truy cập [https://resend.com](https://resend.com)
2. Đăng ký tài khoản (miễn phí 3000 email/tháng)
3. Vào **API Keys** → **Create API Key**
4. Copy API Key vừa tạo

### Bước 2: Verify domain (Khuyến nghị)
- Nếu muốn gửi từ email custom (VD: `noreply@lingerie-shop.vn`):
  1. Vào **Domains** → **Add Domain**
  2. Thêm DNS records theo hướng dẫn
  3. Đợi verify (thường 5-10 phút)
- Nếu chỉ test: dùng `onboarding@resend.dev` (mặc định)

### Bước 3: Cấu hình biến môi trường
Mở file `backend/.env` và điền:

```env
# RESEND Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx
CONTACT_EMAIL_FROM=noreply@your-domain.com
CONTACT_EMAIL_TO=admin@your-domain.com
```

| Biến | Mô tả |
|------|-------|
| `RESEND_API_KEY` | API Key từ Resend dashboard |
| `CONTACT_EMAIL_FROM` | Email gửi đi (phải verify domain hoặc dùng `onboarding@resend.dev`) |
| `CONTACT_EMAIL_TO` | Email nhận thông báo (email admin shop) |

### Bước 4: Cài đặt package
```bash
cd backend
npm install resend
```

### Bước 5: Kiểm tra
1. Chạy backend: `npm run dev`
2. Chạy frontend: `npm run dev`
3. Truy cập http://localhost:3000/contact
4. Điền form và gửi
5. Kiểm tra email admin và email khách

---

## Cấu trúc file

```
backend/
├── src/
│   ├── routes/
│   │   └── contactRoutes.ts    # API endpoint POST /api/contact
│   └── services/
│       └── emailService.ts     # Logic gửi email với Resend
└── .env                        # Biến môi trường
```

---

## Lưu ý quan trọng

1. **Test mode**: Dùng `onboarding@resend.dev` để test, nhưng chỉ gửi được đến email đã verify trên Resend
2. **Production**: Cần verify domain riêng để gửi đến bất kỳ email nào
3. **Rate limit**: Free tier = 3000 emails/tháng, 100 emails/ngày
4. **Error handling**: Nếu gửi email fail, form vẫn submit thành công (đã lưu DB)

---

## Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `API key is invalid` | Sai API key | Kiểm tra lại `RESEND_API_KEY` |
| `From email not verified` | Domain chưa verify | Verify domain hoặc dùng `onboarding@resend.dev` |
| `Rate limit exceeded` | Vượt quota | Upgrade plan hoặc đợi reset |
| Email không nhận | Spam folder | Kiểm tra spam, whitelist email |

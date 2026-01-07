# Phân tích trang Contact - Lingerie Shop

## Tổng quan

Trang Contact (`/contact`) là trang liên hệ cho phép khách hàng gửi tin nhắn và xem thông tin liên lạc của shop.

**File:** `frontend/src/app/contact/page.tsx`

---

## Cấu trúc trang

```
┌─────────────────────────────────────────────────────────────┐
│                    HEADER (Tiêu đề)                         │
│         "Liên hệ với chúng tôi" + mô tả                     │
├─────────────────────┬───────────────────────────────────────┤
│                     │                                       │
│  THÔNG TIN LIÊN HỆ  │         FORM LIÊN HỆ                  │
│  - Địa chỉ          │  - Họ tên *                           │
│  - Điện thoại       │  - Email *                            │
│  - Email            │  - Điện thoại                         │
│  - Giờ làm việc     │  - Chủ đề *                           │
│                     │  - Tin nhắn *                         │
├─────────────────────┤  - [Gửi tin nhắn]                     │
│  MẠNG XÃ HỘI        │                                       │
│  FB | IG | LinkedIn ├───────────────────────────────────────┤
├─────────────────────┤         HÌNH ẢNH CỬA HÀNG             │
│  LINK FAQ           │                                       │
└─────────────────────┴───────────────────────────────────────┘
```

---

## Dependencies

### Libraries sử dụng

| Library | Mục đích |
|---------|----------|
| `react` | useState để quản lý state |
| `next/link` | Navigation nội bộ |
| `next/image` | Tối ưu hình ảnh |
| `lucide-react` | Icons (Mail, Phone, MapPin, Clock, Send, MessageSquare) |

---

## State Management

```typescript
// Form data state
const [formData, setFormData] = useState({
  name: "",      // Họ tên
  email: "",     // Email
  phone: "",     // Số điện thoại
  subject: "",   // Chủ đề
  message: ""    // Nội dung tin nhắn
});

// Trạng thái submit
const [isSubmitted, setIsSubmitted] = useState(false);
```

---

## Luồng hoạt động

### 1. Nhập liệu form

```
User nhập → handleInputChange() → Cập nhật formData state
```

```typescript
const handleInputChange = (e) => {
  setFormData({
    ...formData,
    [e.target.name]: e.target.value
  });
};
```

### 2. Gửi form

```
User click "Gửi" → handleSubmit() → Log console → Hiện success message (3s)
```

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  console.log("Contact form:", formData);  // ⚠️ Chỉ log, chưa gọi API
  setIsSubmitted(true);
  setTimeout(() => setIsSubmitted(false), 3000);
};
```

---

## Các thành phần UI

### 1. Thông tin liên hệ (hardcoded)

| Thông tin | Giá trị |
|-----------|---------|
| Địa chỉ | 123 Nguyễn Huệ, Quận 1, TP.HCM |
| Hotline | 1900 1234 |
| Tel | (028) 1234 5678 |
| Email hỗ trợ | support@lingerie-shop.vn |
| Email kinh doanh | kinhdoanh@lingerie-shop.vn |
| Giờ làm việc | T2-T6: 8:00-21:00, T7-CN: 9:00-20:00 |

### 2. Form liên hệ

| Trường | Type | Required | Validation |
|--------|------|----------|------------|
| Họ tên | text | ✅ | HTML5 required |
| Email | email | ✅ | HTML5 email validation |
| Điện thoại | tel | ❌ | Không |
| Chủ đề | select | ✅ | HTML5 required |
| Tin nhắn | textarea | ✅ | HTML5 required |

### 3. Chủ đề có sẵn

```typescript
<option value="consultation">Tư vấn sản phẩm</option>
<option value="order">Về đơn hàng</option>
<option value="return">Đổi trả sản phẩm</option>
<option value="partnership">Hợp tác</option>
<option value="other">Khác</option>
```

---

## Trạng thái hiển thị

### Chưa gửi (isSubmitted = false)
→ Hiện form đầy đủ

### Đã gửi (isSubmitted = true)
→ Hiện thông báo thành công với icon và text:
- "Tin nhắn đã được gửi!"
- "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi trong vòng 24 giờ."

---

## Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 1024px) | 1 cột, thông tin trên, form dưới |
| Desktop (≥ 1024px) | 3 cột: 1 cột info + 2 cột form |

```typescript
<div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
  <div className="lg:col-span-1">  // Thông tin
  <div className="lg:col-span-2">  // Form
```

---

## Dark Mode Support

Trang hỗ trợ dark mode qua Tailwind classes:

```typescript
// Ví dụ
className="text-gray-900 dark:text-white"
className="bg-white dark:bg-gray-900"
className="border-gray-200 dark:border-gray-800"
```

---

## ⚠️ Hạn chế hiện tại

### 1. Chưa tích hợp Backend
```typescript
// Hiện tại chỉ log ra console
console.log("Contact form:", formData);
```

### 2. Validation yếu
- Chỉ dùng HTML5 validation
- Không validate phone format
- Không có CAPTCHA chống spam

### 3. Thông tin hardcoded
- Địa chỉ, SĐT, email đều hardcode trong code
- Nên lấy từ Settings/CMS

---

## Kỹ thuật gửi Email - Giải pháp đề xuất

### ❌ TUYỆT ĐỐI KHÔNG Hardcode

```typescript
// ❌ SAI - Lộ credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'myemail@gmail.com',      // ❌ KHÔNG BAO GIỜ
    pass: 'my-password-123'          // ❌ NGUY HIỂM
  }
});
```

**Đây là nguyên tắc bảo mật tối thiểu!**

---

### ❌ Tại sao KHÔNG nên dùng Gmail cá nhân (Nodemailer + Gmail SMTP)?

| Vấn đề | Mô tả |
|--------|-------|
| **Bị chặn spam** | Google dễ chặn vì nghi ngờ spam khi gửi nhiều email |
| **Cấu hình phức tạp** | Phải bật "App Password", 2FA, Less secure apps |
| **Tỷ lệ vào Spam cao** | Email từ Gmail cá nhân thường bị đánh dấu spam |
| **Giới hạn gửi** | Chỉ 500 email/ngày (Gmail cá nhân) |
| **Không chuyên nghiệp** | Không có tracking, analytics, bounce handling |

---

### ✅ Giải pháp: Sử dụng RESEND

**Resend** là dịch vụ Transactional Email hiện đại, được tạo bởi đội ngũ từ Vercel.

#### Tại sao chọn Resend?

| Ưu điểm | Chi tiết |
|---------|----------|
| **Miễn phí** | 3,000 email/tháng (Free tier) |
| **Dễ tích hợp** | SDK đơn giản, docs rõ ràng |
| **Deliverability cao** | Tỷ lệ vào Inbox tốt |
| **React Email** | Hỗ trợ template bằng React components |
| **Dashboard** | Tracking, analytics, logs đầy đủ |
| **API hiện đại** | RESTful + SDK cho nhiều ngôn ngữ |

---

### Triển khai với Resend

#### Bước 1: Cấu hình biến môi trường

```bash
# backend/.env
RESEND_API_KEY=re_xxxxxxxxxxxx
CONTACT_EMAIL_TO=admin@lingerie-shop.vn
CONTACT_EMAIL_FROM=contact@lingerie-shop.vn
```

#### Bước 2: Cài đặt package

```bash
cd backend
npm install resend
```

#### Bước 3: Tạo Email Service

```typescript
// backend/src/services/email.service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactEmailData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const sendContactEmail = async (data: ContactEmailData) => {
  const { name, email, phone, subject, message } = data;

  // Email gửi cho Admin
  const adminEmail = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: process.env.CONTACT_EMAIL_TO!,
    subject: `[Liên hệ] ${subject} - từ ${name}`,
    html: `
      <h2>Tin nhắn mới từ trang Contact</h2>
      <p><strong>Họ tên:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Điện thoại:</strong> ${phone || 'Không cung cấp'}</p>
      <p><strong>Chủ đề:</strong> ${subject}</p>
      <hr />
      <p><strong>Nội dung:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
    `,
    replyTo: email, // Reply trực tiếp cho khách
  });

  // Email xác nhận cho khách hàng
  const customerEmail = await resend.emails.send({
    from: process.env.CONTACT_EMAIL_FROM!,
    to: email,
    subject: `Lingerie Shop đã nhận tin nhắn của bạn`,
    html: `
      <h2>Cảm ơn bạn đã liên hệ!</h2>
      <p>Chào ${name},</p>
      <p>Chúng tôi đã nhận được tin nhắn của bạn về "<strong>${subject}</strong>".</p>
      <p>Đội ngũ Lingerie Shop sẽ phản hồi trong vòng 24 giờ làm việc.</p>
      <hr />
      <p><em>Nội dung bạn đã gửi:</em></p>
      <blockquote>${message.replace(/\n/g, '<br>')}</blockquote>
      <hr />
      <p>Trân trọng,<br/>Lingerie Shop Team</p>
    `,
  });

  return { adminEmail, customerEmail };
};
```

#### Bước 4: Tạo API Route

```typescript
// backend/src/routes/contact.routes.ts
import { Router } from 'express';
import { sendContactEmail } from '../services/email.service';
import { ContactMessage } from '../models/contactMessage.model';

const router = Router();

router.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validate
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc' 
      });
    }

    // Lưu vào database
    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
      status: 'new'
    });

    // Gửi email
    await sendContactEmail({ name, email, phone, subject, message });

    res.json({ 
      success: true, 
      message: 'Tin nhắn đã được gửi thành công!' 
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Có lỗi xảy ra, vui lòng thử lại sau' 
    });
  }
});

export default router;
```

#### Bước 5: Model lưu Database

```typescript
// backend/src/models/contactMessage.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  createdAt: Date;
  repliedAt?: Date;
}

const ContactMessageSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['new', 'read', 'replied'], 
    default: 'new' 
  },
  repliedAt: { type: Date }
}, { timestamps: true });

export const ContactMessage = mongoose.model<IContactMessage>(
  'ContactMessage', 
  ContactMessageSchema
);
```

#### Bước 6: Cập nhật Frontend

```typescript
// frontend/src/app/contact/page.tsx
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError('');

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } else {
      setError(data.message || 'Có lỗi xảy ra');
    }
  } catch (err) {
    setError('Không thể gửi tin nhắn. Vui lòng thử lại.');
  } finally {
    setIsLoading(false);
  }
};
```

---

### Luồng hoạt động hoàn chỉnh

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CONTACT FORM FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────┐         ┌──────────┐         ┌──────────┐
  │  User    │         │ Frontend │         │ Backend  │
  │          │         │ Next.js  │         │ Express  │
  └────┬─────┘         └────┬─────┘         └────┬─────┘
       │                    │                    │
       │  1. Điền form      │                    │
       │───────────────────>│                    │
       │                    │                    │
       │                    │  2. POST /api/contact
       │                    │───────────────────>│
       │                    │                    │
       │                    │                    │  3. Validate data
       │                    │                    │─────────────────┐
       │                    │                    │<────────────────┘
       │                    │                    │
       │                    │                    │  4. Save to MongoDB
       │                    │                    │─────────────────┐
       │                    │                    │<────────────────┘
       │                    │                    │
       │                    │                    │        ┌──────────┐
       │                    │                    │        │  RESEND  │
       │                    │                    │        │   API    │
       │                    │                    │        └────┬─────┘
       │                    │                    │             │
       │                    │                    │  5. Send    │
       │                    │                    │────────────>│
       │                    │                    │             │
       │                    │                    │  6. Email   │
       │                    │                    │    to Admin │
       │                    │                    │<────────────│───> 📧 Admin
       │                    │                    │             │
       │                    │                    │  7. Email   │
       │                    │                    │    confirm  │
       │                    │                    │<────────────│───> 📧 User
       │                    │                    │             │
       │                    │  8. Success response             │
       │                    │<───────────────────│             │
       │                    │                    │             │
       │  9. Show success   │                    │             │
       │<───────────────────│                    │             │
       │                    │                    │             │
```

---

### So sánh các dịch vụ Email

| Dịch vụ | Free Tier | Ưu điểm | Nhược điểm |
|---------|-----------|---------|------------|
| **Resend** | 3,000/tháng | Modern, React Email, dễ dùng | Mới, ít tính năng nâng cao |
| SendGrid | 100/ngày | Nhiều tính năng, mature | Setup phức tạp |
| Mailgun | 5,000/tháng (3 tháng) | Mạnh mẽ, API tốt | Cần verify domain |
| Amazon SES | 62,000/tháng (từ EC2) | Rẻ, scale tốt | Setup phức tạp, AWS only |
| Postmark | 100/tháng | Deliverability cao | Free tier nhỏ |

**Khuyến nghị: RESEND** cho dự án này vì đơn giản, hiện đại và free tier đủ dùng.

---

### Checklist triển khai

- [ ] Đăng ký tài khoản Resend (https://resend.com)
- [ ] Verify domain (hoặc dùng domain test của Resend)
- [ ] Lấy API Key và thêm vào `.env`
- [ ] Cài đặt package `resend`
- [ ] Tạo Email Service
- [ ] Tạo Contact Message Model
- [ ] Tạo API Route `/api/contact`
- [ ] Cập nhật Frontend gọi API
- [ ] Test gửi email
- [ ] (Optional) Thêm Rate Limiting chống spam
- [ ] (Optional) Thêm reCAPTCHA

---

## Tổng kết

| Aspect | Status |
|--------|--------|
| UI/UX | ✅ Hoàn thiện |
| Responsive | ✅ Hoàn thiện |
| Dark Mode | ✅ Hoàn thiện |
| Form Validation | ⚠️ Cơ bản |
| Backend Integration | ❌ Chưa có |
| Email với Resend | ❌ Chưa có |
| Spam Protection | ❌ Chưa có |

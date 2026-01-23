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

  const fromEmail = process.env.CONTACT_EMAIL_FROM || 'onboarding@resend.dev';
  const toEmail = process.env.CONTACT_EMAIL_TO || 'admin@example.com';
  // Chỉ gửi email xác nhận cho khách khi đã verify domain (không dùng onboarding@resend.dev)
  const sendCustomerEmail = process.env.SEND_CUSTOMER_EMAIL === 'true';

  // Email gửi cho Admin
  const adminEmail = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `[Liên hệ] ${subject} - từ ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #e91e63; padding-bottom: 10px;">
          Tin nhắn mới từ trang Contact
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Họ tên:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <a href="mailto:${email}">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Điện thoại:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${phone || 'Không cung cấp'}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">Chủ đề:</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${subject}</td>
          </tr>
        </table>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin-top: 20px;">
          <h3 style="margin-top: 0; color: #555;">Nội dung tin nhắn:</h3>
          <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
        </div>
        <p style="color: #888; font-size: 12px; margin-top: 30px;">
          Email này được gửi tự động từ form liên hệ trên website Lingerie Shop.
        </p>
      </div>
    `,
    replyTo: email,
  });

  // Email xác nhận cho khách hàng (chỉ gửi khi đã verify domain)
  let customerEmail = null;
  if (sendCustomerEmail) {
    customerEmail = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Lingerie Shop đã nhận tin nhắn của bạn`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e91e63;">Cảm ơn bạn đã liên hệ!</h2>
          <p>Chào <strong>${name}</strong>,</p>
          <p>Chúng tôi đã nhận được tin nhắn của bạn về "<strong>${subject}</strong>".</p>
          <p>Đội ngũ Lingerie Shop sẽ phản hồi trong vòng <strong>24 giờ làm việc</strong>.</p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e91e63;">
            <p style="margin: 0 0 10px 0; font-style: italic; color: #666;">Nội dung bạn đã gửi:</p>
            <p style="white-space: pre-wrap; margin: 0;">${message}</p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <p style="margin-bottom: 5px;">Trân trọng,</p>
          <p style="margin-top: 0; color: #e91e63; font-weight: bold;">Lingerie Shop Team</p>
          
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            Nếu bạn không gửi tin nhắn này, vui lòng bỏ qua email này.
          </p>
        </div>
      `,
    });
  }

  return { adminEmail, customerEmail };
};

interface NewsletterCouponConfig {
  discountValue: number;
  minOrderValue: number;
  expiryDays: number;
}

const formatVND = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

/**
 * Gửi email xác nhận đăng ký newsletter (Double Opt-in)
 */
export const sendNewsletterVerificationEmail = async (
  email: string, 
  token: string,
  couponConfig?: NewsletterCouponConfig
) => {
  const fromEmail = process.env.CONTACT_EMAIL_FROM || 'onboarding@resend.dev';
  const storeName = process.env.STORE_NAME || 'Lingerie Shop';
  const storeUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${storeUrl}/newsletter/verify?token=${token}`;
  
  const discountValue = couponConfig?.discountValue ?? 50000;

  const result = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Xác nhận đăng ký & Nhận quà chào mừng từ ${storeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">${storeName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Xác nhận đăng ký nhận tin</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0;">Chỉ còn 1 bước nữa thôi!</h2>
          
          <p style="color: #555; line-height: 1.8;">
            Cảm ơn bạn đã đăng ký nhận tin từ ${storeName}. 
            Vui lòng xác nhận email để nhận ngay <strong>mã giảm ${formatVND(discountValue)}đ</strong> cho đơn hàng đầu tiên!
          </p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${verifyUrl}" 
               style="display: inline-block; background: #e91e63; color: #fff; padding: 18px 50px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
              XÁC NHẬN EMAIL
            </a>
          </div>
          
          <div style="background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107;">
            <p style="margin: 0; color: #795548; font-size: 14px;">
              <strong>Lưu ý:</strong> Link xác nhận có hiệu lực trong <strong>24 giờ</strong>.
              Sau khi xác nhận, mã ưu đãi độc quyền sẽ được gửi vào email này.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            Nếu nút không hoạt động, copy link sau vào trình duyệt:<br/>
            <a href="${verifyUrl}" style="color: #e91e63; word-break: break-all;">${verifyUrl}</a>
          </p>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; margin: 0;">
            Nếu bạn không yêu cầu email này, vui lòng bỏ qua.
          </p>
        </div>
      </div>
    `,
  });

  return result;
};

/**
 * Gửi email chứa mã coupon unique sau khi xác nhận
 */
export const sendWelcomeCouponEmail = async (
  email: string, 
  couponCode: string,
  couponConfig?: NewsletterCouponConfig
) => {
  const fromEmail = process.env.CONTACT_EMAIL_FROM || 'onboarding@resend.dev';
  const storeName = process.env.STORE_NAME || 'Lingerie Shop';
  const storeUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const discountValue = couponConfig?.discountValue ?? 50000;
  const minOrderValue = couponConfig?.minOrderValue ?? 399000;
  const expiryDays = couponConfig?.expiryDays ?? 30;

  const result = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Mã ưu đãi độc quyền của bạn - Giảm ${formatVND(discountValue)}đ! 🎁`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <div style="background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">${storeName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Quà chào mừng dành riêng cho bạn!</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0;">Chào mừng bạn đến với ${storeName}! 💕</h2>
          
          <p style="color: #555; line-height: 1.8;">
            Cảm ơn bạn đã xác nhận đăng ký! Đây là mã ưu đãi độc quyền dành riêng cho bạn:
          </p>
          
          <div style="background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; border: 2px dashed #e91e63;">
            <p style="margin: 0 0 10px 0; color: #c2185b; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Mã giảm giá của bạn</p>
            <p style="margin: 0; color: #e91e63; font-size: 36px; font-weight: bold; letter-spacing: 4px;">${couponCode}</p>
            <p style="margin: 15px 0 0 0; color: #333; font-size: 18px; font-weight: bold;">Giảm ${formatVND(discountValue)}đ</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Cho đơn hàng từ ${formatVND(minOrderValue)}đ • Hiệu lực ${expiryDays} ngày</p>
          </div>
          
          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #2e7d32; font-weight: bold;">✓ Điều kiện sử dụng:</p>
            <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
              <li>Áp dụng cho đơn hàng từ <strong>${formatVND(minOrderValue)}đ</strong></li>
              <li>Chỉ sử dụng được với email <strong>${email}</strong></li>
              <li>Mỗi mã chỉ dùng <strong>1 lần duy nhất</strong></li>
              <li>Không kết hợp với ưu đãi khác</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${storeUrl}/san-pham" 
               style="display: inline-block; background: #e91e63; color: #fff; padding: 18px 50px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
              MUA SẮM NGAY
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
          
          <p style="color: #555; line-height: 1.8;">
            Từ giờ, bạn sẽ là người đầu tiên nhận được:
          </p>
          <ul style="color: #555; line-height: 2;">
            <li>🎁 Ưu đãi độc quyền dành riêng cho subscriber</li>
            <li>✨ Thông tin BST mới trước khi ra mắt</li>
            <li>💝 Mã giảm giá đặc biệt vào các dịp lễ</li>
          </ul>
        </div>
        
        <div style="background: #f5f5f5; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; margin: 0;">
            Bạn nhận được email này vì đã đăng ký nhận tin từ ${storeName}.<br/>
            <a href="${storeUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #e91e63;">Hủy đăng ký</a>
          </p>
        </div>
      </div>
    `,
  });

  return result;
};


/**
 * Gửi email thông báo đổi mật khẩu thành công
 */
export const sendPasswordChangeNotification = async (
  email: string,
  userName: string | null,
  metadata: {
    ip: string;
    userAgent: string;
    timestamp: Date;
  }
) => {
  const fromEmail = process.env.CONTACT_EMAIL_FROM || 'onboarding@resend.dev';
  const storeName = process.env.STORE_NAME || 'Lingerie Shop';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';
  
  const displayName = userName || 'Khách hàng';
  const formattedTime = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'full',
    timeStyle: 'long',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(metadata.timestamp);

  // Parse user agent to get browser and device info
  const getBrowserInfo = (ua: string) => {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const getDeviceInfo = (ua: string) => {
    if (ua.includes('Mobile')) return 'Mobile';
    if (ua.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  };

  const browser = getBrowserInfo(metadata.userAgent);
  const device = getDeviceInfo(metadata.userAgent);

  const result = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `[Bảo mật] Mật khẩu của bạn đã được thay đổi`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #e91e63 0%, #9c27b0 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">${storeName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Thông báo bảo mật</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0;">Mật khẩu đã được thay đổi</h2>
          
          <p style="color: #555; line-height: 1.8;">
            Xin chào <strong>${displayName}</strong>,
          </p>
          
          <p style="color: #555; line-height: 1.8;">
            Mật khẩu tài khoản của bạn vừa được thay đổi thành công.
          </p>
          
          <!-- Security Details -->
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="margin: 0 0 15px 0; color: #333; font-weight: bold;">Chi tiết thay đổi:</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 120px;">Thời gian:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${formattedTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Thiết bị:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${device}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Trình duyệt:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${browser}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Địa chỉ IP:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${metadata.ip}</td>
              </tr>
            </table>
          </div>
          
          <!-- Security Notice -->
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; border-left: 4px solid #ff9800; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #e65100; font-weight: bold;">⚠️ Quan trọng:</p>
            <p style="margin: 0; color: #555; line-height: 1.8;">
              Để bảo mật tài khoản, tất cả các phiên đăng nhập khác trên các thiết bị khác đã được đăng xuất tự động.
            </p>
          </div>
          
          <!-- Warning if not user -->
          <div style="background: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #f44336; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #c62828; font-weight: bold;">🚨 Nếu bạn KHÔNG thực hiện thay đổi này:</p>
            <p style="margin: 0 0 15px 0; color: #555; line-height: 1.8;">
              Tài khoản của bạn có thể đã bị xâm nhập. Vui lòng liên hệ ngay với chúng tôi để được hỗ trợ khẩn cấp.
            </p>
            <a href="mailto:${supportEmail}" 
               style="display: inline-block; background: #f44336; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              LIÊN HỆ HỖ TRỢ NGAY
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          
          <!-- Security Tips -->
          <p style="color: #555; line-height: 1.8; margin-bottom: 10px;">
            <strong>Mẹo bảo mật:</strong>
          </p>
          <ul style="color: #555; line-height: 2; margin-top: 0;">
            <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
            <li>Sử dụng mật khẩu mạnh và khác nhau cho mỗi tài khoản</li>
            <li>Đổi mật khẩu định kỳ (3-6 tháng/lần)</li>
            <li>Cảnh giác với email lừa đảo (phishing)</li>
          </ul>
        </div>
        
        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">
            Email này được gửi tự động từ hệ thống bảo mật của ${storeName}.
          </p>
          <p style="color: #888; font-size: 12px; margin: 0;">
            Nếu có thắc mắc, vui lòng liên hệ: <a href="mailto:${supportEmail}" style="color: #e91e63;">${supportEmail}</a>
          </p>
        </div>
      </div>
    `,
  });

  return result;
};

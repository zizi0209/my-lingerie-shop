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

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * 🔐 ADMIN PASSWORD SETUP EMAIL
 * Send email to admin users who were promoted from social login accounts
 * They need to set a password to access admin dashboard
 */
export const sendAdminPasswordSetupEmail = async (params: {
  email: string;
  name: string | null;
  role: string;
  token: string;
  expiresInHours: number;
}) => {
  const { email, name, role, token, expiresInHours } = params;

  const fromEmail = process.env.CONTACT_EMAIL_FROM || 'onboarding@resend.dev';
  const storeName = process.env.STORE_NAME || 'Lingerie Shop';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const setupUrl = `${frontendUrl}/set-admin-password/${token}`;

  const displayName = name || email;

  const result = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `[Bảo mật] Thiết lập mật khẩu Admin - ${storeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">🔐 ${storeName}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Thiết lập mật khẩu Admin</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333; margin-top: 0;">Chào mừng ${displayName}!</h2>

          <p style="color: #555; line-height: 1.8;">
            Bạn vừa được cấp quyền <strong style="color: #667eea;">${role}</strong> trong hệ thống ${storeName}.
          </p>

          <p style="color: #555; line-height: 1.8;">
            Vì tài khoản của bạn hiện đăng nhập qua <strong>Google/Github</strong>,
            bạn cần <strong>thiết lập mật khẩu riêng</strong> để truy cập Admin Dashboard.
          </p>

          <!-- Setup Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}"
               style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: #fff; padding: 16px 40px; text-decoration: none; border-radius: 8px;
                      font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
              🔒 Thiết lập mật khẩu ngay
            </a>
          </div>

          <p style="color: #888; font-size: 13px; text-align: center;">
            Link sẽ hết hạn sau ${expiresInHours} giờ
          </p>

          <!-- Password Requirements -->
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="margin: 0 0 15px 0; color: #333; font-weight: bold;">
              ⚠️ Yêu cầu mật khẩu Admin:
            </p>
            <ul style="color: #555; line-height: 2; margin: 0; padding-left: 20px;">
              <li>Tối thiểu <strong>12 ký tự</strong></li>
              <li>Ít nhất <strong>1 chữ hoa</strong> (A-Z)</li>
              <li>Ít nhất <strong>1 chữ thường</strong> (a-z)</li>
              <li>Ít nhất <strong>1 số</strong> (0-9)</li>
              <li>Ít nhất <strong>1 ký tự đặc biệt</strong> (!@#$%^&*)</li>
            </ul>
          </div>

          <!-- What Happens Next -->
          <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
            <p style="margin: 0 0 10px 0; color: #1565c0; font-weight: bold;">
              📋 Sau khi thiết lập mật khẩu:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 2;">
              <li>Đăng nhập vào <strong>Admin Dashboard</strong> bằng email + mật khẩu mới</li>
              <li>Không cần dùng social login (Google/Github) cho dashboard</li>
              <li>Vẫn có thể dùng social login cho mua sắm (nếu muốn)</li>
              <li>Mật khẩu này độc lập với tài khoản social của bạn</li>
            </ul>
          </div>

          <!-- Security Tips -->
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <p style="margin: 0 0 10px 0; color: #e65100; font-weight: bold;">
              🛡️ Mẹo bảo mật:
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 2; font-size: 14px;">
              <li>Sử dụng mật khẩu <strong>khác biệt</strong> với tài khoản social (Google/Github)</li>
              <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
              <li>Lưu mật khẩu vào password manager (1Password, Bitwarden, etc.)</li>
              <li>Đổi mật khẩu định kỳ (3-6 tháng/lần)</li>
              <li>Không dùng thông tin cá nhân dễ đoán (tên, ngày sinh, số điện thoại)</li>
            </ul>
          </div>

          <!-- Help Section -->
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />

          <p style="color: #555; font-size: 14px; line-height: 1.8;">
            <strong>Gặp vấn đề?</strong><br>
            Nếu link không hoạt động, copy URL sau vào trình duyệt:
          </p>
          <p style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; word-break: break-all; color: #666;">
            ${setupUrl}
          </p>

          <p style="color: #555; font-size: 14px; line-height: 1.8; margin-top: 20px;">
            Hoặc liên hệ Super Admin để được hỗ trợ.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; margin: 0 0 10px 0;">
            Email này được gửi tự động từ hệ thống ${storeName}.
          </p>
          <p style="color: #888; font-size: 12px; margin: 0;">
            Link này chỉ hoạt động <strong>1 lần</strong> và hết hạn sau <strong>${expiresInHours} giờ</strong>.
          </p>
        </div>
      </div>
    `,
  });

  return result;
};

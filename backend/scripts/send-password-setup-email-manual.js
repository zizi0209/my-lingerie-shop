const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * Manually send password setup email to admin user without password
 * Use this when the automatic email flow failed
 */
async function sendPasswordSetupEmail() {
  try {
    const userEmail = 'trantuongvy131@gmail.com';

    console.log(`\n🔍 Finding user: ${userEmail}...\n`);

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        role: { select: { id: true, name: true } }
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role?.name}`);
    console.log(`   Has Password: ${user.password ? 'YES' : 'NO'}`);

    // Check if user is admin without password
    if ((user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN') && !user.password) {
      console.log('\n🔐 User is ADMIN without password. Generating setup token...\n');

      // Delete old tokens for this user (if any)
      const deletedCount = await prisma.passwordSetupToken.deleteMany({
        where: {
          userId: user.id,
          purpose: 'ADMIN_PASSWORD_SETUP'
        }
      });

      console.log(`   Old tokens deleted: ${deletedCount.count}`);

      // Generate new token
      const setupToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(setupToken, 10);

      await prisma.passwordSetupToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          purpose: 'ADMIN_PASSWORD_SETUP',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      });

      console.log('   ✅ Token created successfully');
      console.log(`   ⏰ Expires in: 24 hours`);

      // Send email
      console.log('\n📧 Sending password setup email...\n');

      // Import Resend directly and send email
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const fromEmail = process.env.CONTACT_EMAIL_FROM || 'onboarding@resend.dev';
      const storeName = process.env.STORE_NAME || 'Lingerie Shop';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const setupUrl = `${frontendUrl}/set-admin-password/${setupToken}`;
      const displayName = user.name || user.email;

      try {
        const result = await resend.emails.send({
          from: fromEmail,
          to: user.email,
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
                  Bạn vừa được cấp quyền <strong style="color: #667eea;">${user.role.name}</strong> trong hệ thống ${storeName}.
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
                  Link sẽ hết hạn sau 24 giờ
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
                  Link này chỉ hoạt động <strong>1 lần</strong> và hết hạn sau <strong>24 giờ</strong>.
                </p>
              </div>
            </div>
          `
        });

        console.log('✅ Email sent successfully!');
        console.log(`   Email ID: ${result.data?.id || 'N/A'}`);
        console.log(`\n📬 Check inbox: ${user.email}`);
        console.log(`   Subject: [Bảo mật] Thiết lập mật khẩu Admin - ${process.env.STORE_NAME || 'Lingerie Shop'}`);
        console.log(`\n🔗 Setup URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/set-admin-password/${setupToken}`);

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: user.id, // Self-triggered
            action: 'ADMIN_PASSWORD_SETUP_EMAIL_SENT',
            resource: 'user',
            resourceId: String(user.id),
            newValue: {
              role: user.role.name,
              expiresInHours: 24,
              tokenPurpose: 'ADMIN_PASSWORD_SETUP',
              reason: 'MANUAL_TRIGGER',
              emailId: result.data?.id
            },
            severity: 'WARNING'
          }
        });

        console.log('\n✅ Audit log created');

      } catch (emailError) {
        console.error('\n❌ Email sending failed:');
        console.error(emailError);

        // Still create audit log for the failure
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'ADMIN_PASSWORD_SETUP_EMAIL_FAILED',
            resource: 'user',
            resourceId: String(user.id),
            newValue: {
              error: emailError.message,
              role: user.role.name,
              reason: 'MANUAL_TRIGGER'
            },
            severity: 'CRITICAL'
          }
        });

        console.log('\n⚠️  Audit log created for email failure');
        console.log('\n🔧 Please check:');
        console.log('   1. RESEND_API_KEY is set in .env');
        console.log('   2. Resend API key is valid');
        console.log('   3. CONTACT_EMAIL_FROM is configured');
        console.log('   4. Backend logs for more details');
      }

    } else if (user.password) {
      console.log('\n⚠️  User already has a password. No email needed.');
    } else {
      console.log('\n⚠️  User is not ADMIN or SUPER_ADMIN. No password setup needed.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sendPasswordSetupEmail();

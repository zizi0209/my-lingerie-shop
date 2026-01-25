import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// OTP expires in 15 minutes
const OTP_EXPIRY_MINUTES = 15;

/**
 * Generate 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate secure token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * POST /api/auth/forgot-password
 * Send OTP to user's email
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email là bắt buộc',
      });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null
      }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        success: true,
        message: 'Nếu email tồn tại, mã OTP đã được gửi đến hộp thư của bạn.',
      });
    }

    // Check if user is social login (no password)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'Tài khoản này đăng ký qua mạng xã hội và không có mật khẩu. Vui lòng đăng nhập bằng Google hoặc GitHub.',
      });
    }

    // Generate OTP and token
    const otp = generateOTP();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Delete old tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: email.toLowerCase() },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        email: email.toLowerCase(),
        token,
        otp,
        expires: expiresAt,
      },
    });

    // Send email with OTP
    try {
      await resend.emails.send({
        from: process.env.CONTACT_EMAIL_FROM || 'noreply@lingerie.zyth.id.vn',
        to: email,
        subject: 'Mã OTP đặt lại mật khẩu - Lingerie Shop',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Lingerie Shop</h1>
              <p style="color: #f0f0f0; margin: 10px 0 0 0;">Đặt lại mật khẩu</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Xin chào!</h2>
              
              <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản <strong>${email}</strong>.</p>
              
              <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Mã OTP của bạn:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: monospace;">
                  ${otp}
                </div>
                <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">
                  Mã có hiệu lực trong ${OTP_EXPIRY_MINUTES} phút
                </p>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                <strong>Lưu ý bảo mật:</strong><br>
                • Không chia sẻ mã OTP này với bất kỳ ai<br>
                • Lingerie Shop sẽ không bao giờ yêu cầu mã OTP qua điện thoại<br>
                • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                Email này được gửi tự động, vui lòng không trả lời.<br>
                © ${new Date().getFullYear()} Lingerie Shop. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log(`✅ OTP sent to ${email}: ${otp} (expires at ${expiresAt.toISOString()})`);

      return res.json({
        success: true,
        message: 'Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.',
        // In development, include token for testing
        ...(process.env.NODE_ENV === 'development' && { token, otp }),
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Không thể gửi email. Vui lòng thử lại sau.',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP code
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email và OTP là bắt buộc',
      });
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        email: email.toLowerCase(),
        otp,
        expires: { gte: new Date() },
        usedAt: null,
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: 'Mã OTP không hợp lệ hoặc đã hết hạn',
      });
    }

    return res.json({
      success: true,
      message: 'Mã OTP hợp lệ',
      token: resetToken.token, // Return token for reset password step
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password with token and new password
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token và mật khẩu mới là bắt buộc',
      });
    }

    // Validate password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Mật khẩu phải có ít nhất 8 ký tự',
      });
    }

    // Find valid token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        expires: { gte: new Date() },
        usedAt: null,
      },
    });

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        error: 'Token không hợp lệ hoặc đã hết hạn',
      });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email: resetToken.email,
        deletedAt: null
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy người dùng',
      });
    }

    // Check if social user
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'Tài khoản này đăng ký qua mạng xã hội và không có mật khẩu',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0, // Reset failed attempts
        lockedUntil: null, // Unlock account if locked
        tokenVersion: user.tokenVersion + 1, // Invalidate existing tokens
      },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    // Delete all refresh tokens for this user (force re-login)
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    console.log(`✅ Password reset successful for user: ${user.email}`);

    return res.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    });
  }
};

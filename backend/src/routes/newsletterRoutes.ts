import express, { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { 
  sendNewsletterVerificationEmail, 
  sendWelcomeCouponEmail 
} from '../services/emailService';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { validateNewsletterEmail } from '../utils/tempMailBlacklist';

const router = express.Router();

const subscribeSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  source: z.enum(['website', 'footer', 'popup', 'checkout']).optional().default('website'),
});

/**
 * Generate unique welcome coupon code
 * Format: WEL-XXXXX (5 chars alphanumeric)
 */
function generateWelcomeCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars: 0,O,1,I
  let code = 'WEL-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Default coupon config
const DEFAULT_COUPON_CONFIG = {
  discountValue: 50000,
  minOrderValue: 399000,
  expiryDays: 30,
};

// Get newsletter coupon config from PageSection
async function getNewsletterCouponConfig(): Promise<typeof DEFAULT_COUPON_CONFIG> {
  try {
    const newsletterSection = await prisma.pageSection.findFirst({
      where: {
        code: { startsWith: 'newsletter' },
        isVisible: true,
      },
      select: { content: true },
    });

    if (newsletterSection?.content && typeof newsletterSection.content === 'object') {
      const content = newsletterSection.content as Record<string, unknown>;
      return {
        discountValue: typeof content.discountValue === 'number' ? content.discountValue : DEFAULT_COUPON_CONFIG.discountValue,
        minOrderValue: typeof content.minOrderValue === 'number' ? content.minOrderValue : DEFAULT_COUPON_CONFIG.minOrderValue,
        expiryDays: typeof content.expiryDays === 'number' ? content.expiryDays : DEFAULT_COUPON_CONFIG.expiryDays,
      };
    }
  } catch (err) {
    console.error('Error fetching newsletter config:', err);
  }
  return DEFAULT_COUPON_CONFIG;
}

/**
 * POST /api/newsletter/subscribe
 * Bước 1: Đăng ký và gửi email xác nhận (Double Opt-in)
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const validated = subscribeSchema.parse(req.body);
    const { email, source } = validated;
    const normalizedEmail = email.toLowerCase().trim();

    // Check temp mail
    const tempMailError = validateNewsletterEmail(normalizedEmail);
    if (tempMailError) {
      res.status(400).json({ success: false, message: tempMailError });
      return;
    }

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Already verified and has coupon
      if (existing.isVerified && existing.welcomeCouponCode) {
        if (existing.welcomeCouponUsedAt) {
          res.json({
            success: true,
            message: 'Email này đã đăng ký và sử dụng ưu đãi chào mừng.',
            alreadySubscribed: true,
          });
        } else {
          res.json({
            success: true,
            message: 'Email này đã đăng ký! Kiểm tra hộp thư để lấy mã ưu đãi.',
            alreadySubscribed: true,
          });
        }
        return;
      }
      
      // Not verified yet - resend verification
      if (!existing.isVerified) {
        const verificationToken = uuidv4();
        const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        
        await prisma.newsletterSubscriber.update({
          where: { email: normalizedEmail },
          data: {
            verificationToken,
            verificationExpiresAt,
            source,
          },
        });

        // Get coupon config and send verification email
        const couponConfig = await getNewsletterCouponConfig();
        sendNewsletterVerificationEmail(normalizedEmail, verificationToken, couponConfig).catch((err) => {
          console.error('Failed to send verification email:', err);
        });

        res.json({
          success: true,
          message: 'Email xác nhận đã được gửi lại! Vui lòng kiểm tra hộp thư.',
          needsVerification: true,
        });
        return;
      }
    }

    // Create new subscription with verification token
    const verificationToken = uuidv4();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.newsletterSubscriber.create({
      data: {
        email: normalizedEmail,
        source,
        isVerified: false,
        verificationToken,
        verificationExpiresAt,
      },
    });

    // Get coupon config and send verification email (non-blocking)
    const couponConfig = await getNewsletterCouponConfig();
    sendNewsletterVerificationEmail(normalizedEmail, verificationToken, couponConfig).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    res.json({
      success: true,
      message: 'Vui lòng kiểm tra email để xác nhận đăng ký và nhận mã ưu đãi!',
      needsVerification: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => e.message).join(', ');
      res.status(400).json({ success: false, message: messages });
      return;
    }

    console.error('Newsletter subscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra, vui lòng thử lại sau',
    });
  }
});

/**
 * GET /api/newsletter/verify/:token
 * Bước 2: Xác nhận email và gửi mã coupon unique
 */
router.get('/verify/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    console.log('[Newsletter Verify] Token received:', token);
    console.log('[Newsletter Verify] Token length:', token?.length);

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { verificationToken: token },
    });

    console.log('[Newsletter Verify] Subscriber found:', subscriber ? 'Yes' : 'No');
    if (subscriber) {
      console.log('[Newsletter Verify] Subscriber email:', subscriber.email);
      console.log('[Newsletter Verify] isVerified:', subscriber.isVerified);
      console.log('[Newsletter Verify] DB token:', subscriber.verificationToken);
    }

    if (!subscriber) {
      // Try to find by email to check if token was cleared
      const allSubscribers = await prisma.newsletterSubscriber.findMany({
        where: { verificationToken: { not: null } },
        select: { email: true, verificationToken: true },
        take: 5,
      });
      console.log('[Newsletter Verify] Sample tokens in DB:', allSubscribers.map(s => ({ email: s.email, token: s.verificationToken?.substring(0, 8) + '...' })));
      
      res.status(400).json({
        success: false,
        message: 'Link xác nhận không hợp lệ hoặc đã hết hạn.',
      });
      return;
    }

    // Check expiration
    if (subscriber.verificationExpiresAt && subscriber.verificationExpiresAt < new Date()) {
      res.status(400).json({
        success: false,
        message: 'Link xác nhận đã hết hạn. Vui lòng đăng ký lại.',
        expired: true,
      });
      return;
    }

    // Already verified
    if (subscriber.isVerified && subscriber.welcomeCouponCode) {
      // Check if coupon exists in Coupon table, create if missing (migration case)
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: subscriber.welcomeCouponCode },
      });

      if (!existingCoupon) {
        // Legacy case: coupon not in Coupon table, create it now
        const user = await prisma.user.findFirst({
          where: {
            email: subscriber.email,
            deletedAt: null
          },
          select: { id: true },
        });

        const couponConfig = await getNewsletterCouponConfig();
        const couponExpiresAt = new Date(Date.now() + couponConfig.expiryDays * 24 * 60 * 60 * 1000);

        await prisma.$transaction(async (tx) => {
          const coupon = await tx.coupon.create({
            data: {
              code: subscriber.welcomeCouponCode!,
              name: 'Ưu đãi chào mừng thành viên mới',
              description: `Giảm ${couponConfig.discountValue.toLocaleString('vi-VN')}đ cho đơn hàng đầu tiên từ ${couponConfig.minOrderValue.toLocaleString('vi-VN')}đ`,
              category: 'DISCOUNT',
              discountType: 'FIXED_AMOUNT',
              discountValue: couponConfig.discountValue,
              minOrderValue: couponConfig.minOrderValue,
              quantity: 1,
              maxUsagePerUser: 1,
              couponType: 'NEW_USER',
              isSystem: true,
              isPublic: false,
              isActive: true,
              startDate: new Date(),
              endDate: couponExpiresAt,
            },
          });

          if (user) {
            await tx.userCoupon.create({
              data: {
                userId: user.id,
                couponId: coupon.id,
                status: 'AVAILABLE',
                source: 'NEWSLETTER',
                expiresAt: couponExpiresAt,
              },
            });
          }
        });

        console.log('[Newsletter Verify] Migrated legacy coupon:', subscriber.welcomeCouponCode);
      }

      res.json({
        success: true,
        message: 'Email đã được xác nhận trước đó!',
        alreadyVerified: true,
        couponCode: subscriber.welcomeCouponCode,
      });
      return;
    }

    // Generate unique coupon code
    let couponCode = generateWelcomeCouponCode();
    
    // Ensure uniqueness in both NewsletterSubscriber and Coupon tables
    let attempts = 0;
    while (attempts < 10) {
      const [existingSubscriber, existingCoupon] = await Promise.all([
        prisma.newsletterSubscriber.findUnique({
          where: { welcomeCouponCode: couponCode },
        }),
        prisma.coupon.findUnique({
          where: { code: couponCode },
        }),
      ]);
      if (!existingSubscriber && !existingCoupon) break;
      couponCode = generateWelcomeCouponCode();
      attempts++;
    }

    // Find user by email to link coupon to their wallet
    const user = await prisma.user.findFirst({
      where: {
        email: subscriber.email,
        deletedAt: null
      },
      select: { id: true },
    });

    // Get coupon config from admin settings
    const couponConfig = await getNewsletterCouponConfig();
    const couponExpiresAt = new Date(Date.now() + couponConfig.expiryDays * 24 * 60 * 60 * 1000);

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update subscriber (keep token so user can revisit the link)
      await tx.newsletterSubscriber.update({
        where: { id: subscriber.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verificationExpiresAt: null,
          welcomeCouponCode: couponCode,
          isActive: true,
        },
      });

      // Create Coupon record so checkout can validate it
      const coupon = await tx.coupon.create({
        data: {
          code: couponCode,
          name: 'Ưu đãi chào mừng thành viên mới',
          description: `Giảm ${couponConfig.discountValue.toLocaleString('vi-VN')}đ cho đơn hàng đầu tiên từ ${couponConfig.minOrderValue.toLocaleString('vi-VN')}đ`,
          category: 'DISCOUNT',
          discountType: 'FIXED_AMOUNT',
          discountValue: couponConfig.discountValue,
          minOrderValue: couponConfig.minOrderValue,
          quantity: 1,
          maxUsagePerUser: 1,
          couponType: 'NEW_USER',
          isSystem: true,
          isPublic: false,
          isActive: true,
          startDate: new Date(),
          endDate: couponExpiresAt,
        },
      });

      // If user exists, add to their wallet
      let userCoupon = null;
      if (user) {
        userCoupon = await tx.userCoupon.create({
          data: {
            userId: user.id,
            couponId: coupon.id,
            status: 'AVAILABLE',
            source: 'NEWSLETTER',
            expiresAt: couponExpiresAt,
          },
        });
      }

      return { coupon, userCoupon };
    });

    console.log('[Newsletter Verify] Created coupon:', result.coupon.code);
    if (result.userCoupon) {
      console.log('[Newsletter Verify] Added to user wallet:', user?.id);
    }

    // Send welcome email with coupon code and config
    sendWelcomeCouponEmail(subscriber.email, couponCode, couponConfig).catch((err) => {
      console.error('Failed to send welcome coupon email:', err);
    });

    res.json({
      success: true,
      message: 'Xác nhận thành công! Mã ưu đãi đã được gửi vào email của bạn.',
      couponCode,
    });
  } catch (error) {
    console.error('Newsletter verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra, vui lòng thử lại sau',
    });
  }
});

/**
 * POST /api/newsletter/validate-coupon
 * Validate welcome coupon tại checkout (3 lớp bảo mật)
 */
router.post('/validate-coupon', async (req: Request, res: Response) => {
  try {
    const { couponCode, email, phone } = req.body;

    if (!couponCode || !email || !phone) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin để xác thực mã giảm giá',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.replace(/\D/g, ''); // Remove non-digits

    // Find coupon
    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { welcomeCouponCode: couponCode.toUpperCase() },
    });

    if (!subscriber) {
      res.status(400).json({
        success: false,
        message: 'Mã giảm giá không tồn tại',
      });
      return;
    }

    // Lớp 1: Check if coupon already used
    if (subscriber.welcomeCouponUsedAt) {
      res.status(400).json({
        success: false,
        message: 'Mã giảm giá đã được sử dụng',
      });
      return;
    }

    // Lớp 2: Email binding - mã phải dùng đúng email đăng ký
    if (subscriber.email !== normalizedEmail) {
      res.status(400).json({
        success: false,
        message: 'Mã giảm giá này chỉ có hiệu lực với email đã đăng ký',
      });
      return;
    }

    // Lớp 3: Check phone - SĐT đã dùng mã chào mừng chưa
    const phoneUsed = await prisma.welcomeCouponUsage.findUnique({
      where: { phone: normalizedPhone },
    });

    if (phoneUsed) {
      res.status(400).json({
        success: false,
        message: 'Số điện thoại này đã sử dụng mã ưu đãi chào mừng',
      });
      return;
    }

    // Lớp 4: Check first-time customer (optional - check order history)
    // Check by shippingPhone or guestInfo containing email/phone
    const existingOrders = await prisma.order.findFirst({
      where: {
        OR: [
          { shippingPhone: normalizedPhone },
          { 
            guestInfo: {
              path: ['email'],
              equals: normalizedEmail,
            }
          },
          {
            guestInfo: {
              path: ['phone'],
              equals: normalizedPhone,
            }
          },
          {
            user: {
              OR: [
                { email: normalizedEmail },
                { phone: normalizedPhone },
              ]
            }
          }
        ],
        status: { not: 'CANCELLED' },
      },
    });

    if (existingOrders) {
      res.status(400).json({
        success: false,
        message: 'Mã ưu đãi chào mừng chỉ dành cho khách hàng mới',
      });
      return;
    }

    // Valid! Return coupon info with dynamic config
    const couponConfig = await getNewsletterCouponConfig();
    res.json({
      success: true,
      message: 'Mã giảm giá hợp lệ',
      coupon: {
        code: couponCode,
        discountType: 'FIXED',
        discountValue: couponConfig.discountValue,
        minOrderValue: couponConfig.minOrderValue,
        description: `Giảm ${couponConfig.discountValue.toLocaleString('vi-VN')}đ cho đơn hàng đầu tiên từ ${couponConfig.minOrderValue.toLocaleString('vi-VN')}đ`,
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra, vui lòng thử lại sau',
    });
  }
});

/**
 * POST /api/newsletter/use-coupon
 * Mark coupon as used after successful order
 */
router.post('/use-coupon', async (req: Request, res: Response) => {
  try {
    const { couponCode, email, phone, orderId } = req.body;

    if (!couponCode || !email || !phone || !orderId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.replace(/\D/g, '');

    // Update subscriber
    await prisma.newsletterSubscriber.update({
      where: { welcomeCouponCode: couponCode.toUpperCase() },
      data: {
        welcomeCouponUsedAt: new Date(),
        welcomeCouponOrderId: orderId,
      },
    });

    // Record phone usage
    await prisma.welcomeCouponUsage.create({
      data: {
        phone: normalizedPhone,
        email: normalizedEmail,
        couponCode: couponCode.toUpperCase(),
        orderId,
      },
    });

    res.json({
      success: true,
      message: 'Đã ghi nhận sử dụng mã giảm giá',
    });
  } catch (error) {
    console.error('Use coupon error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra',
    });
  }
});

/**
 * POST /api/newsletter/unsubscribe
 * Hủy đăng ký nhận tin
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, message: 'Email không hợp lệ' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const subscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (!subscriber || !subscriber.isActive) {
      res.json({
        success: true,
        message: 'Email này không có trong danh sách nhận tin.',
      });
      return;
    }

    await prisma.newsletterSubscriber.update({
      where: { email: normalizedEmail },
      data: {
        isActive: false,
        unsubscribedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Hủy đăng ký thành công. Bạn sẽ không nhận thêm email từ chúng tôi.',
    });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Có lỗi xảy ra, vui lòng thử lại sau',
    });
  }
});

export default router;

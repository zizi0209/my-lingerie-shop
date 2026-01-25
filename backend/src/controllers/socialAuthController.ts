import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateTokens, setRefreshTokenCookie } from '../utils/tokenUtils';

/**
 * POST /api/auth/social-login
 * Create or update user from social OAuth login
 */
export const socialLogin = async (req: Request, res: Response) => {
  try {
    const { provider, providerAccountId, email, name, image } = req.body;

    if (!provider || !providerAccountId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: provider, providerAccountId, email',
      });
    }

    // Check if account already exists
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingAccount) {
      // Account exists, return user
      // Generate JWT tokens for existing user
      const userWithRole = await prisma.user.findUnique({
        where: { id: existingAccount.user.id },
        include: { role: { select: { name: true } } },
      });

      if (!userWithRole) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const { accessToken, refreshToken, expiresIn } = await generateTokens({
        userId: userWithRole.id,
        email: userWithRole.email,
        roleId: userWithRole.roleId,
        roleName: userWithRole.role?.name,
        tokenVersion: userWithRole.tokenVersion,
      });

      setRefreshTokenCookie(res, refreshToken);

      return res.json({
        success: true,
        data: {
          user: userWithRole,
          accessToken,
          expiresIn,
          isNew: false,
        },
      });
    }

    // Check if user with this email exists (for account linking)
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        deletedAt: null
      }
    });

    let user;

    if (existingUser) {
      // User exists, link new social account
      user = existingUser;

      // Create Account record
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider,
          providerAccountId,
        },
      });

      // Update emailVerified if not set
      if (!user.emailVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date(),
            image: image || user.avatar,
          },
        });
      }

      console.log(`🔗 Account linked: ${email} → ${provider}`);
    } else {
      // Create new user for social login
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: null, // Social users don't have password
          avatar: image,
          emailVerified: new Date(),
          roleId: null,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          tokenVersion: 0,
        },
      });

      // Create Account record
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider,
          providerAccountId,
        },
      });

      // Auto-assign welcome voucher for new social users
      try {
        const welcomeCoupon = await prisma.coupon.findFirst({
          where: {
            couponType: 'NEW_USER',
            isActive: true,
            startDate: { lte: new Date() },
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
        });

        if (welcomeCoupon) {
          await prisma.userCoupon.create({
            data: {
              userId: user.id,
              couponId: welcomeCoupon.id,
              status: 'AVAILABLE',
              source: 'SOCIAL_SIGNUP',
            },
          });
          console.log(`🎁 Welcome coupon assigned to social user: ${email}`);
        }
      } catch (error) {
        console.error('Failed to assign welcome coupon:', error);
        // Non-critical, continue
      }

      console.log(`✅ New social user created: ${email} via ${provider}`);
    }

    // Generate JWT tokens for the user
    const userWithRole = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: { select: { name: true } } },
    });

    if (!userWithRole) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve user data',
      });
    }

    const { accessToken, refreshToken, expiresIn } = await generateTokens({
      userId: userWithRole.id,
      email: userWithRole.email,
      roleId: userWithRole.roleId,
      roleName: userWithRole.role?.name,
      tokenVersion: userWithRole.tokenVersion,
    });

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      success: true,
      data: {
        user: userWithRole,
        accessToken,
        expiresIn,
        isNew: !existingUser,
      },
    });
  } catch (error) {
    console.error('Social login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process social login',
    });
  }
};

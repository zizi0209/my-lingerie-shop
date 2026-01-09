import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import couponRoutes from '../../routes/couponRoutes';
import { prisma, createTestUser, generateTestToken } from '../setup';

// Store current user ID for mock
let mockUserId: number | null = null;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mock auth middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token && mockUserId) {
      (req as any).user = { id: mockUserId };
    }
    next();
  });

  app.use('/api', couponRoutes);
  return app;
}

const app = createTestApp();

describe('Coupon API', () => {
  let testUser: { user: any; password: string };
  let testToken: string;
  let testCoupon: any;

  beforeEach(async () => {
    // Create test user with unique email
    testUser = await createTestUser();
    testToken = generateTestToken(testUser.user.id);
    mockUserId = testUser.user.id;

    // Create test coupon
    testCoupon = await prisma.coupon.create({
      data: {
        code: 'TEST50K',
        name: 'Test Coupon 50K',
        description: 'Test discount coupon',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        minOrderValue: 300000,
        maxUsagePerUser: 1,
        couponType: 'PUBLIC',
        isPublic: true,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  });

  afterEach(async () => {
    mockUserId = null;
  });

  describe('GET /api/vouchers', () => {
    it('should return public vouchers', async () => {
      const response = await request(app)
        .get('/api/vouchers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].code).toBe('TEST50K');
    });

    it('should not return inactive vouchers', async () => {
      await prisma.coupon.update({
        where: { id: testCoupon.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .get('/api/vouchers')
        .expect(200);

      expect(response.body.data.find((v: any) => v.code === 'TEST50K')).toBeUndefined();
    });

    it('should not return expired vouchers', async () => {
      await prisma.coupon.update({
        where: { id: testCoupon.id },
        data: { endDate: new Date(Date.now() - 1000) },
      });

      const response = await request(app)
        .get('/api/vouchers')
        .expect(200);

      expect(response.body.data.find((v: any) => v.code === 'TEST50K')).toBeUndefined();
    });
  });

  describe('POST /api/my-vouchers/collect/:code', () => {
    it('should collect voucher successfully', async () => {
      const response = await request(app)
        .post('/api/my-vouchers/collect/TEST50K')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Đã lưu');

      // Verify in database
      const userCoupon = await prisma.userCoupon.findFirst({
        where: { userId: testUser.user.id, couponId: testCoupon.id },
      });
      expect(userCoupon).toBeDefined();
      expect(userCoupon?.status).toBe('AVAILABLE');
    });

    it('should reject collecting same voucher twice', async () => {
      // First collect
      await request(app)
        .post('/api/my-vouchers/collect/TEST50K')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      // Second collect
      const response = await request(app)
        .post('/api/my-vouchers/collect/TEST50K')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body.error).toContain('đã lưu');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/my-vouchers/collect/TEST50K')
        .expect(401);
    });

    it('should reject non-existent coupon', async () => {
      const response = await request(app)
        .post('/api/my-vouchers/collect/NONEXISTENT')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.error).toContain('Không tìm thấy');
    });
  });

  describe('POST /api/vouchers/validate', () => {
    it('should validate coupon successfully', async () => {
      const response = await request(app)
        .post('/api/vouchers/validate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ code: 'TEST50K', orderTotal: 500000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.discountAmount).toBe(50000);
      expect(response.body.data.finalTotal).toBe(450000);
    });

    it('should reject order below minimum', async () => {
      const response = await request(app)
        .post('/api/vouchers/validate')
        .send({ code: 'TEST50K', orderTotal: 200000 })
        .expect(400);

      expect(response.body.error).toContain('tối thiểu');
    });

    it('should reject expired coupon', async () => {
      await prisma.coupon.update({
        where: { id: testCoupon.id },
        data: { endDate: new Date(Date.now() - 1000) },
      });

      const response = await request(app)
        .post('/api/vouchers/validate')
        .send({ code: 'TEST50K', orderTotal: 500000 })
        .expect(400);

      expect(response.body.error).toContain('hết hạn');
    });

    it('should calculate percentage discount correctly', async () => {
      await prisma.coupon.update({
        where: { id: testCoupon.id },
        data: {
          discountType: 'PERCENTAGE',
          discountValue: 10,
          maxDiscount: 100000,
        },
      });

      const response = await request(app)
        .post('/api/vouchers/validate')
        .send({ code: 'TEST50K', orderTotal: 500000 })
        .expect(200);

      expect(response.body.data.discountAmount).toBe(50000); // 10% of 500000
    });

    it('should cap percentage discount at maxDiscount', async () => {
      await prisma.coupon.update({
        where: { id: testCoupon.id },
        data: {
          discountType: 'PERCENTAGE',
          discountValue: 50,
          maxDiscount: 100000,
        },
      });

      const response = await request(app)
        .post('/api/vouchers/validate')
        .send({ code: 'TEST50K', orderTotal: 500000 })
        .expect(200);

      expect(response.body.data.discountAmount).toBe(100000); // Capped at maxDiscount
    });
  });

  describe('GET /api/my-vouchers', () => {
    it('should return user vouchers', async () => {
      // Collect voucher first
      await prisma.userCoupon.create({
        data: {
          userId: testUser.user.id,
          couponId: testCoupon.id,
          status: 'AVAILABLE',
          source: 'COLLECTED',
        },
      });

      const response = await request(app)
        .get('/api/my-vouchers')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].coupon.code).toBe('TEST50K');
    });

    it('should not return used vouchers', async () => {
      await prisma.userCoupon.create({
        data: {
          userId: testUser.user.id,
          couponId: testCoupon.id,
          status: 'USED',
          source: 'COLLECTED',
        },
      });

      const response = await request(app)
        .get('/api/my-vouchers')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });
  });
});

describe('Loyalty Points API', () => {
  let testUser: { user: any; password: string };
  let testToken: string;

  beforeEach(async () => {
    testUser = await createTestUser();
    testToken = generateTestToken(testUser.user.id);
    mockUserId = testUser.user.id;

    // Give user some points
    await prisma.user.update({
      where: { id: testUser.user.id },
      data: {
        pointBalance: 1000,
        totalSpent: 3000000,
        memberTier: 'SILVER',
      },
    });
  });

  describe('GET /api/my-points', () => {
    it('should return user points info', async () => {
      const response = await request(app)
        .get('/api/my-points')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(1000);
      expect(response.body.data.tier).toBe('SILVER');
      expect(response.body.data.totalSpent).toBe(3000000);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/my-points')
        .expect(401);
    });
  });

  describe('GET /api/my-tier', () => {
    it('should return tier progress', async () => {
      const response = await request(app)
        .get('/api/my-tier')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentTier).toBe('SILVER');
      expect(response.body.data.nextTier).toBe('GOLD');
      expect(response.body.data.nextTierThreshold).toBe(5000000);
      expect(response.body.data.amountToNextTier).toBe(2000000);
    });

    it('should show all tiers', async () => {
      const response = await request(app)
        .get('/api/my-tier')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.allTiers).toHaveLength(4);
      expect(response.body.data.allTiers[0].tier).toBe('BRONZE');
      expect(response.body.data.allTiers[3].tier).toBe('PLATINUM');
    });
  });

  describe('POST /api/points/calculate', () => {
    it('should calculate points preview for logged in user', async () => {
      const response = await request(app)
        .post('/api/points/calculate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ orderTotal: 500000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tier).toBe('SILVER');
      // SILVER rate is 1.5%, so 500000 / 100 * 1.5 = 7500 points
      expect(response.body.data.pointsToEarn).toBe(7500);
    });

    it('should show base rate for guest', async () => {
      const response = await request(app)
        .post('/api/points/calculate')
        .send({ orderTotal: 500000 })
        .expect(200);

      expect(response.body.data.tier).toBeNull();
      expect(response.body.data.message).toContain('Đăng nhập');
    });
  });
});

describe('Rewards API', () => {
  let testUser: { user: any; password: string };
  let testToken: string;
  let testReward: any;

  beforeEach(async () => {
    testUser = await createTestUser();
    testToken = generateTestToken(testUser.user.id);
    mockUserId = testUser.user.id;

    // Give user points
    await prisma.user.update({
      where: { id: testUser.user.id },
      data: { pointBalance: 1000 },
    });

    // Create test reward
    testReward = await prisma.pointReward.create({
      data: {
        name: 'Voucher 50K',
        description: 'Đổi 500 điểm lấy voucher 50K',
        pointCost: 500,
        rewardType: 'DISCOUNT',
        discountValue: 50000,
        discountType: 'FIXED_AMOUNT',
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    mockUserId = null;
  });

  describe('GET /api/rewards', () => {
    it('should return available rewards', async () => {
      const response = await request(app)
        .get('/api/rewards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toBe('Voucher 50K');
    });
  });

  describe('POST /api/rewards/:id/redeem', () => {
    it('should redeem reward successfully', async () => {
      const response = await request(app)
        .post(`/api/rewards/${testReward.id}/redeem`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pointsSpent).toBe(500);
      expect(response.body.data.newBalance).toBe(500);
      expect(response.body.data.voucher).toBeDefined();

      // Verify user points deducted
      const user = await prisma.user.findUnique({
        where: { id: testUser.user.id },
      });
      expect(user?.pointBalance).toBe(500);

      // Verify voucher created
      const userCoupon = await prisma.userCoupon.findFirst({
        where: { userId: testUser.user.id },
      });
      expect(userCoupon).toBeDefined();
    });

    it('should reject if not enough points', async () => {
      // Set user points to 100 (less than 500 required)
      await prisma.user.update({
        where: { id: testUser.user.id },
        data: { pointBalance: 100 },
      });

      const response = await request(app)
        .post(`/api/rewards/${testReward.id}/redeem`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body.error).toContain('điểm');
    });

    it('should reject inactive reward', async () => {
      await prisma.pointReward.update({
        where: { id: testReward.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .post(`/api/rewards/${testReward.id}/redeem`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body.error).toContain('hết hiệu lực');
    });
  });
});

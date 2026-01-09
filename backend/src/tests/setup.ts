import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, afterEach } from 'vitest';

// Test database
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  console.log('✅ Test database connected');
});

afterEach(async () => {
  // Clean up test data after each test (respecting FK constraints order)
  // Note: We keep Role table as it's seeded and reused
  try {
    // First delete tables with foreign keys
    await prisma.auditLog.deleteMany({});
    await prisma.rewardRedemption.deleteMany({});
    await prisma.pointHistory.deleteMany({});
    await prisma.couponUsage.deleteMany({});
    await prisma.userCoupon.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.productView.deleteMany({});
    
    // Then delete main tables
    await prisma.pointReward.deleteMany({});
    await prisma.coupon.deleteMany({});
    await prisma.campaign.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.pageSection.deleteMany({});
    await prisma.media.deleteMany({});
    await prisma.user.deleteMany({});
    // Keep Role - it's reused across tests
  } catch (error) {
    // Silently ignore cleanup errors - they don't affect test results
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('✅ Test database disconnected');
});

// Re-export helpers
export * from './helpers';

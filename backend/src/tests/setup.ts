import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { beforeAll, afterAll, afterEach } from 'vitest';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET không được cấu hình trong file .env cho test!');
}

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const DATABASE_URL = process.env.DATABASE_URL;

const getDbLabel = (url?: string): string => {
  if (!url) return 'unknown';
  try {
    const parsed = new URL(url);
    const host = parsed.host || 'unknown-host';
    const db = parsed.pathname?.replace('/', '') || 'unknown-db';
    return `${host}/${db}`;
  } catch {
    return 'invalid-url';
  }
};

const assertSafeTestDatabase = (): void => {
  if (!TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL là bắt buộc để chạy test. Không được dùng DATABASE_URL mặc định.');
  }
  if (DATABASE_URL && TEST_DATABASE_URL === DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL không được trùng DATABASE_URL để tránh xóa nhầm dữ liệu thật.');
  }
};

assertSafeTestDatabase();

// Set NODE_ENV to test for all test runs
process.env.NODE_ENV = 'test';

// Test database
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  console.log(`✅ Test database connected (${getDbLabel(TEST_DATABASE_URL)})`);
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
  } catch {
    // Silently ignore cleanup errors - they don't affect test results
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('✅ Test database disconnected');
});

// Re-export helpers
export * from './helpers';

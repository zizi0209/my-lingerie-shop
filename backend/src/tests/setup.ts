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
  // Clean up test data after each test
  const tables = [
    'AuditLog',
    'OrderItem',
    'Order',
    'CartItem',
    'ProductImage',
    'ProductVariant',
    'Product',
    'Category',
    'PageSection',
    'MediaFile',
    'User',
    'Role',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}";`);
    } catch (error) {
      // Table might not exist, ignore
    }
  }
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('✅ Test database disconnected');
});

// Re-export helpers
export * from './helpers';

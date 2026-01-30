/**
 * JEST TEST SETUP
 *
 * Global setup for all tests
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { beforeAll, afterAll } from '@jest/globals';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Setup before all tests
beforeAll(async () => {
  console.log('🔧 Setting up test environment...');

  // Clear Redis cache
  await redis.flushall();

  // Ensure test database is clean
  // (You might want to use a separate test database)
  console.log('✅ Test environment ready');
});

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  await prisma.$disconnect();
  await redis.quit();

  console.log('✅ Cleanup complete');
});

// Global error handler
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in tests:', error);
  process.exit(1);
});

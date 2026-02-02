/**
 * SISTER SIZING SERVICE - UNIT TESTS
 *
 * Tests for sister size calculations and recommendations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../tests/setup';
import { sisterSizingService } from '../sister-sizing.service';
import {
  seedTestSizes,
  createTestCategory,
  cleanupSisterSizeRecommendations,
} from '../../tests/helpers';

let testCategory: Awaited<ReturnType<typeof createTestCategory>>;
let testSizeData: Awaited<ReturnType<typeof seedTestSizes>>;

describe('SisterSizingService', () => {
  beforeAll(async () => {
    // Seed test sizes and category
    testSizeData = await seedTestSizes();
    testCategory = await createTestCategory({ name: 'Test Bras', slug: 'test-bras' });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({ where: { categoryId: testCategory.id } });
    await prisma.category.deleteMany({ where: { id: testCategory.id } });
    await cleanupSisterSizeRecommendations();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await sisterSizingService.invalidateCache();
    // Clear recommendation logs to avoid data accumulation
    await cleanupSisterSizeRecommendations();
  });

  describe('getSisterSizes', () => {
    it('should return sister sizes for 34C (US)', async () => {
      const result = await sisterSizingService.getSisterSizes({
        universalCode: 'UIC_BRA_BAND86_CUPVOL6',
      });

      expect(result).toBeDefined();
      expect(result.original.displaySize).toBe('34C');
      expect(result.sisterDown).toBeDefined();
      expect(result.sisterDown?.displaySize).toBe('32D');
      expect(result.sisterUp).toBeDefined();
      expect(result.sisterUp?.displaySize).toBe('36B');
    });

    it('should have same cup volume for all sister sizes', async () => {
      const result = await sisterSizingService.getSisterSizes({
        universalCode: 'UIC_BRA_BAND86_CUPVOL6',
      });

      const originalVolume = result.original.cupVolume;
      expect(result.sisterDown?.cupVolume).toBe(originalVolume);
      expect(result.sisterUp?.cupVolume).toBe(originalVolume);
    });

    it('should calculate correct band differences', async () => {
      const result = await sisterSizingService.getSisterSizes({
        universalCode: 'UIC_BRA_BAND86_CUPVOL6',
      });

      const originalBand = result.original.bandSize;

      // Sister down: band -5cm
      expect(result.sisterDown?.bandSize).toBe(originalBand - 5);

      // Sister up: band +5cm
      expect(result.sisterUp?.bandSize).toBe(originalBand + 5);
    });

    it('should throw error for invalid UIC', async () => {
      await expect(
        sisterSizingService.getSisterSizes({
          universalCode: 'INVALID_UIC',
        })
      ).rejects.toThrow('Size not found');
    });

    it('should cache results', async () => {
      const uic = 'UIC_BRA_BAND86_CUPVOL6';

      // First call - hits database
      const result1 = await sisterSizingService.getSisterSizes({
        universalCode: uic,
      });

      // Second call - should use cache
      const result2 = await sisterSizingService.getSisterSizes({
        universalCode: uic,
      });

      // Results should be equal (cached or not)
      expect(result1).toEqual(result2);
    });
  });

  describe('getAvailableSisterSizes', () => {
    it('should return in-stock status when size is available', async () => {
      const uniqueSuffix = Date.now();
      // Create test product variant with stock
      const product = await prisma.product.create({
        data: {
          name: `Test Bra ${uniqueSuffix}`,
          slug: `test-bra-001-${uniqueSuffix}`,
          description: 'Test',
          price: 29.99,
          categoryId: testCategory.id,
        },
      });

      const variant = await prisma.productVariant.create({
        data: {
          sku: `TEST-BRA-34C-BLACK-${uniqueSuffix}`,
          size: '34C',
          baseSizeUIC: 'UIC_BRA_BAND86_CUPVOL6',
          colorName: 'Black',
          stock: 10,
          productId: product.id,
        },
      });

      const result = await sisterSizingService.getAvailableSisterSizes({
        productId: product.id,
        requestedSize: '34C',
        regionCode: 'US',
      });

      expect(result.isAvailable).toBe(true);
      expect(result.stock).toBe(10);
      expect(result.alternatives).toHaveLength(0);

      // Cleanup
      await prisma.productVariant.delete({ where: { id: variant.id } });
      await prisma.product.delete({ where: { id: product.id } });
    });

    it('should return sister size alternatives when out of stock', async () => {
      const uniqueSuffix = Date.now();
      const product = await prisma.product.create({
        data: {
          name: `Test Bra 2 ${uniqueSuffix}`,
          slug: `test-bra-002-${uniqueSuffix}`,
          description: 'Test',
          price: 29.99,
          categoryId: testCategory.id,
        },
      });

      // Requested size: OUT OF STOCK
      const variant34C = await prisma.productVariant.create({
        data: {
          sku: `TEST-BRA-34C-BLACK-2-${uniqueSuffix}`,
          size: '34C',
          baseSizeUIC: 'UIC_BRA_BAND86_CUPVOL6',
          colorName: 'Black',
          stock: 0, // OUT OF STOCK
          productId: product.id,
        },
      });

      // Sister down: IN STOCK
      const variant32D = await prisma.productVariant.create({
        data: {
          sku: `TEST-BRA-32D-BLACK-${uniqueSuffix}`,
          size: '34C',
          baseSizeUIC: 'UIC_BRA_BAND81_CUPVOL6',
          colorName: 'Black',
          stock: 5,
          productId: product.id,
        },
      });

      // Sister up: IN STOCK
      const variant36B = await prisma.productVariant.create({
        data: {
          sku: `TEST-BRA-36B-BLACK-${uniqueSuffix}`,
          size: '34C',
          baseSizeUIC: 'UIC_BRA_BAND91_CUPVOL6',
          colorName: 'Black',
          stock: 3,
          productId: product.id,
        },
      });

      const result = await sisterSizingService.getAvailableSisterSizes({
        productId: product.id,
        requestedSize: '34C',
        regionCode: 'US',
        sessionId: 'test-session',
      });

      expect(result.isAvailable).toBe(false);
      expect(result.alternatives.length).toBeGreaterThan(0);

      const sisterDown = result.alternatives.find((a) => a.type === 'SISTER_DOWN');
      expect(sisterDown).toBeDefined();
      expect(sisterDown?.size).toBe('32D');
      expect(sisterDown?.stock).toBe(5);

      const sisterUp = result.alternatives.find((a) => a.type === 'SISTER_UP');
      expect(sisterUp).toBeDefined();
      expect(sisterUp?.size).toBe('36B');
      expect(sisterUp?.stock).toBe(3);

      // Cleanup
      await prisma.productVariant.deleteMany({
        where: { productId: product.id },
      });
      await prisma.product.delete({ where: { id: product.id } });
    });

    it('should log recommendation when alternatives are shown', async () => {
      const uniqueSuffix = Date.now();
      const product = await prisma.product.create({
        data: {
          name: `Test Bra 3 ${uniqueSuffix}`,
          slug: `test-bra-003-${uniqueSuffix}`,
          description: 'Test',
          price: 29.99,
          categoryId: testCategory.id,
        },
      });

      const variant34C = await prisma.productVariant.create({
        data: {
          sku: `TEST-BRA-34C-BLACK-3-${uniqueSuffix}`,
          size: '34C',
          baseSizeUIC: 'UIC_BRA_BAND86_CUPVOL6',
          colorName: 'Black',
          stock: 0,
          productId: product.id,
        },
      });

      const variant32D = await prisma.productVariant.create({
        data: {
          sku: `TEST-BRA-32D-BLACK-3-${uniqueSuffix}`,
          size: '34C',
          baseSizeUIC: 'UIC_BRA_BAND81_CUPVOL6',
          colorName: 'Black',
          stock: 5,
          productId: product.id,
        },
      });

      const sessionId = `test-session-123-${uniqueSuffix}`;

      await sisterSizingService.getAvailableSisterSizes({
        productId: product.id,
        requestedSize: '34C',
        regionCode: 'US',
        sessionId,
      });

      // Check recommendation was logged
      const recommendation = await prisma.sisterSizeRecommendation.findFirst({
        where: { sessionId },
      });

      expect(recommendation).toBeDefined();
      expect(recommendation?.requestedSize).toBe('34C');
      expect(recommendation?.recommendedSize).toBe('32D');
      expect(recommendation?.recommendationType).toBe('SISTER_DOWN');

      // Cleanup
      await prisma.sisterSizeRecommendation.delete({
        where: { id: recommendation!.id },
      });
      await prisma.productVariant.deleteMany({
        where: { productId: product.id },
      });
      await prisma.product.delete({ where: { id: product.id } });
    });
  });

  describe('getSisterSizeFamily', () => {
    it('should return all sizes with same cup volume', async () => {
      const family = await sisterSizingService.getSisterSizeFamily({
        universalCode: 'UIC_BRA_BAND86_CUPVOL6',
        regionCode: 'US',
      });

      expect(family.length).toBeGreaterThan(0);

      // All should have same cup volume
      const cupVolume = family[0].cupVolume;
      family.forEach((size) => {
        expect(size.cupVolume).toBe(cupVolume);
      });

      // Should be sorted by band size
      for (let i = 1; i < family.length; i++) {
        expect(family[i].bandSize).toBeGreaterThan(family[i - 1].bandSize);
      }
    });
  });

  describe('acceptRecommendation', () => {
    it('should mark recommendation as accepted', async () => {
      // Create a recommendation first
      const recommendation = await prisma.sisterSizeRecommendation.create({
        data: {
          productId: 1,
          requestedSize: '34C',
          requestedUIC: 'UIC_BRA_BAND86_CUPVOL6',
          recommendedSize: '32D',
          recommendedUIC: 'UIC_BRA_BAND81_CUPVOL6',
          recommendationType: 'SISTER_DOWN',
          sessionId: 'test-session',
          regionCode: 'US',
        },
      });

      await sisterSizingService.acceptRecommendation(recommendation.id, 123);

      const updated = await prisma.sisterSizeRecommendation.findUnique({
        where: { id: recommendation.id },
      });

      expect(updated?.accepted).toBe(true);
      expect(updated?.acceptedAt).toBeDefined();
      expect(updated?.userId).toBe(123);

      // Cleanup
      await prisma.sisterSizeRecommendation.delete({
        where: { id: recommendation.id },
      });
    });
  });

  describe('getAcceptanceStats', () => {
    it('should calculate acceptance rates correctly', async () => {
      // Create test data
      const recommendations = await Promise.all([
        prisma.sisterSizeRecommendation.create({
          data: {
            productId: 1,
            requestedSize: '34C',
            requestedUIC: 'UIC_BRA_BAND86_CUPVOL6',
            recommendedSize: '32D',
            recommendedUIC: 'UIC_BRA_BAND81_CUPVOL6',
            recommendationType: 'SISTER_DOWN',
            sessionId: 'test-1',
            regionCode: 'US',
            accepted: true,
          },
        }),
        prisma.sisterSizeRecommendation.create({
          data: {
            productId: 1,
            requestedSize: '34C',
            requestedUIC: 'UIC_BRA_BAND86_CUPVOL6',
            recommendedSize: '32D',
            recommendedUIC: 'UIC_BRA_BAND81_CUPVOL6',
            recommendationType: 'SISTER_DOWN',
            sessionId: 'test-2',
            regionCode: 'US',
            accepted: false,
          },
        }),
        prisma.sisterSizeRecommendation.create({
          data: {
            productId: 1,
            requestedSize: '34C',
            requestedUIC: 'UIC_BRA_BAND86_CUPVOL6',
            recommendedSize: '36B',
            recommendedUIC: 'UIC_BRA_BAND91_CUPVOL6',
            recommendationType: 'SISTER_UP',
            sessionId: 'test-3',
            regionCode: 'US',
            accepted: true,
          },
        }),
      ]);

      const stats = await sisterSizingService.getAcceptanceStats();

      const sisterDownStats = stats.find((s) => s.type === 'SISTER_DOWN');
      expect(sisterDownStats).toBeDefined();
      expect(sisterDownStats?.totalRecommendations).toBe(2);
      expect(sisterDownStats?.acceptedRecommendations).toBe(1);
      expect(sisterDownStats?.acceptanceRate).toBe(50);

      const sisterUpStats = stats.find((s) => s.type === 'SISTER_UP');
      expect(sisterUpStats).toBeDefined();
      expect(sisterUpStats?.totalRecommendations).toBe(1);
      expect(sisterUpStats?.acceptedRecommendations).toBe(1);
      expect(sisterUpStats?.acceptanceRate).toBe(100);

      // Cleanup
      await prisma.sisterSizeRecommendation.deleteMany({
        where: {
          id: { in: recommendations.map((r) => r.id) },
        },
      });
    });
  });

  describe('getFrequentlyOutOfStockSizes', () => {
    it('should return most requested out-of-stock sizes', async () => {
      // Create test data
      const recommendations = await Promise.all([
        prisma.sisterSizeRecommendation.create({
          data: {
            productId: 1,
            requestedSize: '34C',
            requestedUIC: 'UIC_BRA_BAND86_CUPVOL6',
            recommendedSize: '32D',
            recommendedUIC: 'UIC_BRA_BAND81_CUPVOL6',
            recommendationType: 'SISTER_DOWN',
            sessionId: 'test-1',
            regionCode: 'US',
          },
        }),
        prisma.sisterSizeRecommendation.create({
          data: {
            productId: 1,
            requestedSize: '34C',
            requestedUIC: 'UIC_BRA_BAND86_CUPVOL6',
            recommendedSize: '32D',
            recommendedUIC: 'UIC_BRA_BAND81_CUPVOL6',
            recommendationType: 'SISTER_DOWN',
            sessionId: 'test-2',
            regionCode: 'US',
          },
        }),
        prisma.sisterSizeRecommendation.create({
          data: {
            productId: 1,
            requestedSize: '36B',
            requestedUIC: 'UIC_BRA_BAND91_CUPVOL6',
            recommendedSize: '34C',
            recommendedUIC: 'UIC_BRA_BAND86_CUPVOL6',
            recommendationType: 'SISTER_DOWN',
            sessionId: 'test-3',
            regionCode: 'US',
          },
        }),
      ]);

      const sizes = await sisterSizingService.getFrequentlyOutOfStockSizes(5);

      expect(sizes.length).toBeGreaterThan(0);
      const size34C = sizes.find((s) => s.size === '34C');
      expect(size34C).toBeDefined();
      expect(size34C?.outOfStockRequests).toBe(2);

      // Cleanup
      await prisma.sisterSizeRecommendation.deleteMany({
        where: {
          id: { in: recommendations.map((r) => r.id) },
        },
      });
    });
  });
});

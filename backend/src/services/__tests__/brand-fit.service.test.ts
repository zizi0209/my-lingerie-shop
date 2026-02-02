/**
 * BRAND FIT SERVICE - UNIT TESTS
 *
 * Tests for brand-specific size adjustments
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { brandFitService } from '../brand-fit.service';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

describe('BrandFitService', () => {
  let testBrandId: string;

  beforeAll(async () => {
    await redis.flushall();

    // Create test brand
    const brand = await prisma.brand.create({
      data: {
        name: 'Test Brand',
        slug: 'test-brand',
        fitType: 'RUNS_SMALL',
        bandAdjustment: 1, // Size up 1 band
        cupAdjustment: 1, // Size up 1 cup
        fitNotes: 'This brand runs small. Size up.',
        fitConfidence: 0.8,
      },
    });

    testBrandId = brand.id;
  });

  afterAll(async () => {
    await prisma.brand.delete({ where: { id: testBrandId } });
    await prisma.$disconnect();
    await redis.quit();
  });

  beforeEach(async () => {
    await brandFitService.invalidateCache();
  });

  describe('adjustSizeForBrand', () => {
    it('should return same size for TRUE_TO_SIZE brands', async () => {
      const trueBrand = await prisma.brand.create({
        data: {
          name: 'True Brand',
          slug: 'true-brand',
          fitType: 'TRUE_TO_SIZE',
          bandAdjustment: 0,
          cupAdjustment: 0,
          fitNotes: 'True to size',
          fitConfidence: 0.9,
        },
      });

      const result = await brandFitService.adjustSizeForBrand({
        brandId: trueBrand.id,
        userNormalSize: '34C',
        regionCode: 'US',
      });

      expect(result.originalSize).toBe('34C');
      expect(result.recommendedSize).toBe('34C');
      expect(result.bandAdjustment).toBe(0);
      expect(result.cupAdjustment).toBe(0);
      expect(result.fitType).toBe('TRUE_TO_SIZE');

      await prisma.brand.delete({ where: { id: trueBrand.id } });
    });

    it('should size up for RUNS_SMALL brands', async () => {
      const result = await brandFitService.adjustSizeForBrand({
        brandId: testBrandId,
        userNormalSize: '34C',
        regionCode: 'US',
      });

      expect(result.originalSize).toBe('34C');
      expect(result.recommendedSize).toBe('36D'); // +1 band (+5cm), +1 cup
      expect(result.bandAdjustment).toBe(1);
      expect(result.cupAdjustment).toBe(1);
      expect(result.fitType).toBe('RUNS_SMALL');
      expect(result.fitNote).toContain('size up');
    });

    it('should size down for RUNS_LARGE brands', async () => {
      const largeBrand = await prisma.brand.create({
        data: {
          name: 'Large Brand',
          slug: 'large-brand',
          fitType: 'RUNS_LARGE',
          bandAdjustment: -1,
          cupAdjustment: 0,
          fitNotes: 'This brand runs large. Size down.',
          fitConfidence: 0.7,
        },
      });

      const result = await brandFitService.adjustSizeForBrand({
        brandId: largeBrand.id,
        userNormalSize: '36C',
        regionCode: 'US',
      });

      expect(result.originalSize).toBe('36C');
      expect(result.recommendedSize).toBe('34C'); // -1 band (-5cm)
      expect(result.bandAdjustment).toBe(-1);

      await prisma.brand.delete({ where: { id: largeBrand.id } });
    });

    it('should throw error for invalid brand', async () => {
      await expect(
        brandFitService.adjustSizeForBrand({
          brandId: 'invalid-brand-id',
          userNormalSize: '34C',
          regionCode: 'US',
        })
      ).rejects.toThrow('Brand not found');
    });

    it('should throw error for invalid size format', async () => {
      await expect(
        brandFitService.adjustSizeForBrand({
          brandId: testBrandId,
          userNormalSize: 'INVALID',
          regionCode: 'US',
        })
      ).rejects.toThrow('Invalid size format');
    });

    it('should cache results', async () => {
      const params = {
        brandId: testBrandId,
        userNormalSize: '34C',
        regionCode: 'US',
      };

      // First call
      await brandFitService.adjustSizeForBrand(params);

      // Check cache
      const cacheKey = `brand-fit:${testBrandId}:34C:US`;
      const cached = await redis.get(cacheKey);
      expect(cached).toBeDefined();

      // Second call should use cache
      const result = await brandFitService.adjustSizeForBrand(params);
      expect(result.recommendedSize).toBe('36D');
    });
  });

  describe('getBrandProfile', () => {
    it('should return brand profile', async () => {
      const profile = await brandFitService.getBrandProfile(testBrandId);

      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Test Brand');
      expect(profile?.fitType).toBe('RUNS_SMALL');
      expect(profile?.bandAdjustment).toBe(1);
      expect(profile?.cupAdjustment).toBe(1);
    });

    it('should return null for invalid brand', async () => {
      const profile = await brandFitService.getBrandProfile('invalid-id');
      expect(profile).toBeNull();
    });
  });

  describe('getAllBrandProfiles', () => {
    it('should return all active brands', async () => {
      const profiles = await brandFitService.getAllBrandProfiles();

      expect(profiles.length).toBeGreaterThan(0);
      expect(profiles[0]).toHaveProperty('name');
      expect(profiles[0]).toHaveProperty('fitType');
    });

    it('should not include inactive brands', async () => {
      const inactiveBrand = await prisma.brand.create({
        data: {
          name: 'Inactive Brand',
          slug: 'inactive-brand',
          fitType: 'TRUE_TO_SIZE',
          isActive: false,
        },
      });

      const profiles = await brandFitService.getAllBrandProfiles();
      const hasInactive = profiles.some((p) => p.id === inactiveBrand.id);

      expect(hasInactive).toBe(false);

      await prisma.brand.delete({ where: { id: inactiveBrand.id } });
    });
  });

  describe('submitFitFeedback', () => {
    it('should create fit feedback', async () => {
      const feedback = await brandFitService.submitFitFeedback({
        brandId: testBrandId,
        productId: 1,
        normalSize: '34C',
        boughtSize: '36D',
        fitRating: 3,
        fitComment: 'Perfect fit!',
        userId: 123,
      });

      expect(feedback.id).toBeDefined();

      // Verify created
      const created = await prisma.brandFitFeedback.findUnique({
        where: { id: feedback.id },
      });

      expect(created).not.toBeNull();
      expect(created?.brandId).toBe(testBrandId);
      expect(created?.normalSize).toBe('34C');
      expect(created?.boughtSize).toBe('36D');
      expect(created?.fitRating).toBe(3);

      // Cleanup
      await prisma.brandFitFeedback.delete({ where: { id: feedback.id } });
    });

    it('should mark as verified if orderId provided', async () => {
      const feedback = await brandFitService.submitFitFeedback({
        brandId: testBrandId,
        productId: 1,
        normalSize: '34C',
        boughtSize: '36D',
        fitRating: 3,
        orderId: 456,
      });

      const created = await prisma.brandFitFeedback.findUnique({
        where: { id: feedback.id },
      });

      expect(created?.isVerified).toBe(true);
      expect(created?.orderId).toBe(456);

      await prisma.brandFitFeedback.delete({ where: { id: feedback.id } });
    });
  });

  describe('getBrandFitStats', () => {
    it('should calculate fit statistics', async () => {
      // Create test feedback
      const feedbacks = await Promise.all([
        prisma.brandFitFeedback.create({
          data: {
            brandId: testBrandId,
            productId: 1,
            normalSize: '34C',
            boughtSize: '36D',
            fitRating: 3,
            isVerified: true,
          },
        }),
        prisma.brandFitFeedback.create({
          data: {
            brandId: testBrandId,
            productId: 1,
            normalSize: '34C',
            boughtSize: '36D',
            fitRating: 4,
            isVerified: true,
          },
        }),
        prisma.brandFitFeedback.create({
          data: {
            brandId: testBrandId,
            productId: 1,
            normalSize: '34C',
            boughtSize: '36D',
            fitRating: 2,
            isVerified: true,
          },
        }),
      ]);

      const stats = await brandFitService.getBrandFitStats(testBrandId);

      expect(stats.totalFeedback).toBe(3);
      expect(stats.averageRating).toBe(3); // (3+4+2)/3 = 3
      expect(stats.fitDistribution[3]).toBe(1);
      expect(stats.fitDistribution[4]).toBe(1);
      expect(stats.fitDistribution[2]).toBe(1);

      // Cleanup
      await prisma.brandFitFeedback.deleteMany({
        where: { id: { in: feedbacks.map((f) => f.id) } },
      });
    });

    it('should return zero stats for brand with no feedback', async () => {
      const newBrand = await prisma.brand.create({
        data: {
          name: 'New Brand',
          slug: 'new-brand',
          fitType: 'TRUE_TO_SIZE',
        },
      });

      const stats = await brandFitService.getBrandFitStats(newBrand.id);

      expect(stats.totalFeedback).toBe(0);
      expect(stats.averageRating).toBe(0);

      await prisma.brand.delete({ where: { id: newBrand.id } });
    });
  });

  describe('calculateSuggestedAdjustment', () => {
    it('should suggest RUNS_SMALL when average rating > 3.5', async () => {
      // Create feedback indicating items run small (need to size up)
      const feedbacks = await Promise.all(
        Array(15)
          .fill(null)
          .map(() =>
            prisma.brandFitFeedback.create({
              data: {
                brandId: testBrandId,
                productId: 1,
                normalSize: '34C',
                boughtSize: '36D',
                fitRating: 4, // Too small (needed to size up)
                isVerified: true,
              },
            })
          )
      );

      const suggestion = await brandFitService.calculateSuggestedAdjustment(
        testBrandId
      );

      expect(suggestion.suggestedFitType).toBe('RUNS_SMALL');
      expect(suggestion.suggestedBandAdjustment).toBe(1);
      expect(suggestion.confidence).toBeGreaterThan(0);

      // Cleanup
      await prisma.brandFitFeedback.deleteMany({
        where: { id: { in: feedbacks.map((f) => f.id) } },
      });
    });

    it('should suggest RUNS_LARGE when average rating < 2.5', async () => {
      // Create feedback indicating items run large (need to size down)
      const feedbacks = await Promise.all(
        Array(15)
          .fill(null)
          .map(() =>
            prisma.brandFitFeedback.create({
              data: {
                brandId: testBrandId,
                productId: 1,
                normalSize: '36C',
                boughtSize: '34C',
                fitRating: 2, // Too large (needed to size down)
                isVerified: true,
              },
            })
          )
      );

      const suggestion = await brandFitService.calculateSuggestedAdjustment(
        testBrandId
      );

      expect(suggestion.suggestedFitType).toBe('RUNS_LARGE');
      expect(suggestion.suggestedBandAdjustment).toBe(-1);

      // Cleanup
      await prisma.brandFitFeedback.deleteMany({
        where: { id: { in: feedbacks.map((f) => f.id) } },
      });
    });

    it('should suggest TRUE_TO_SIZE when average rating ~3', async () => {
      // Create feedback indicating true to size
      const feedbacks = await Promise.all(
        Array(15)
          .fill(null)
          .map(() =>
            prisma.brandFitFeedback.create({
              data: {
                brandId: testBrandId,
                productId: 1,
                normalSize: '34C',
                boughtSize: '34C',
                fitRating: 3, // Perfect fit
                isVerified: true,
              },
            })
          )
      );

      const suggestion = await brandFitService.calculateSuggestedAdjustment(
        testBrandId
      );

      expect(suggestion.suggestedFitType).toBe('TRUE_TO_SIZE');
      expect(suggestion.suggestedBandAdjustment).toBe(0);

      // Cleanup
      await prisma.brandFitFeedback.deleteMany({
        where: { id: { in: feedbacks.map((f) => f.id) } },
      });
    });

    it('should return low confidence with insufficient data', async () => {
      const newBrand = await prisma.brand.create({
        data: {
          name: 'New Brand 2',
          slug: 'new-brand-2',
          fitType: 'TRUE_TO_SIZE',
        },
      });

      // Only 5 feedbacks (< 10 minimum)
      await Promise.all(
        Array(5)
          .fill(null)
          .map(() =>
            prisma.brandFitFeedback.create({
              data: {
                brandId: newBrand.id,
                productId: 1,
                normalSize: '34C',
                boughtSize: '34C',
                fitRating: 3,
                isVerified: true,
              },
            })
          )
      );

      const suggestion = await brandFitService.calculateSuggestedAdjustment(
        newBrand.id
      );

      expect(suggestion.confidence).toBe(0);

      // Cleanup
      await prisma.brandFitFeedback.deleteMany({
        where: { brandId: newBrand.id },
      });
      await prisma.brand.delete({ where: { id: newBrand.id } });
    });
  });

  describe('upsertBrandProfile', () => {
    it('should create new brand profile', async () => {
      const profile = await brandFitService.upsertBrandProfile({
        name: 'New Test Brand',
        slug: 'new-test-brand',
        fitType: 'RUNS_SMALL',
        bandAdjustment: 1,
        cupAdjustment: 0,
        fitNotes: 'Runs small in band',
      });

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('New Test Brand');
      expect(profile.fitType).toBe('RUNS_SMALL');

      // Cleanup
      await prisma.brand.delete({ where: { id: profile.id } });
    });

    it('should update existing brand profile', async () => {
      const existing = await prisma.brand.create({
        data: {
          name: 'Update Test',
          slug: 'update-test',
          fitType: 'TRUE_TO_SIZE',
        },
      });

      const updated = await brandFitService.upsertBrandProfile({
        brandId: existing.id,
        name: 'Update Test',
        slug: 'update-test',
        fitType: 'RUNS_SMALL',
        bandAdjustment: 1,
        cupAdjustment: 1,
      });

      expect(updated.id).toBe(existing.id);
      expect(updated.fitType).toBe('RUNS_SMALL');
      expect(updated.bandAdjustment).toBe(1);

      await prisma.brand.delete({ where: { id: existing.id } });
    });

    it('should invalidate cache on update', async () => {
      const brand = await prisma.brand.create({
        data: {
          name: 'Cache Test',
          slug: 'cache-test',
          fitType: 'TRUE_TO_SIZE',
        },
      });

      // Cache some data
      await brandFitService.adjustSizeForBrand({
        brandId: brand.id,
        userNormalSize: '34C',
        regionCode: 'US',
      });

      // Update profile
      await brandFitService.upsertBrandProfile({
        brandId: brand.id,
        name: 'Cache Test',
        slug: 'cache-test',
        fitType: 'RUNS_SMALL',
        bandAdjustment: 1,
        cupAdjustment: 0,
      });

      // Cache should be invalidated
      const cacheKey = `brand-fit:${brand.id}:34C:US`;
      const cached = await redis.get(cacheKey);
      expect(cached).toBeNull();

      await prisma.brand.delete({ where: { id: brand.id } });
    });
  });
});

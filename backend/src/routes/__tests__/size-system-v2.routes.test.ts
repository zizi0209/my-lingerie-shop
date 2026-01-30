/**
 * SIZE SYSTEM API - INTEGRATION TESTS
 *
 * Tests for all API endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../server'; // Your Express app

const prisma = new PrismaClient();

describe('Size System API v2', () => {
  let testProductId: number;
  let testBrandId: string;

  beforeAll(async () => {
    // Create test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Bra API',
        slug: 'test-bra-api',
        description: 'Test',
        price: 29.99,
        categoryId: 1,
      },
    });
    testProductId = product.id;

    // Create test variants
    await Promise.all([
      prisma.productVariant.create({
        data: {
          sku: 'TEST-API-34C-BLACK',
          size: '34C',
          baseSize: '34C',
          baseSizeUIC: 'UIC_BRA_BAND86_CUPVOL6',
          colorName: 'Black',
          stock: 0, // Out of stock
          productId: testProductId,
        },
      }),
      prisma.productVariant.create({
        data: {
          sku: 'TEST-API-32D-BLACK',
          size: '32D',
          baseSize: '32D',
          baseSizeUIC: 'UIC_BRA_BAND81_CUPVOL6',
          colorName: 'Black',
          stock: 5, // In stock
          productId: testProductId,
        },
      }),
      prisma.productVariant.create({
        data: {
          sku: 'TEST-API-36B-BLACK',
          size: '36B',
          baseSize: '36B',
          baseSizeUIC: 'UIC_BRA_BAND91_CUPVOL6',
          colorName: 'Black',
          stock: 3, // In stock
          productId: testProductId,
        },
      }),
    ]);

    // Create test brand
    const brand = await prisma.brand.create({
      data: {
        name: 'Test API Brand',
        slug: 'test-api-brand',
        fitType: 'RUNS_SMALL',
        bandAdjustment: 1,
        cupAdjustment: 1,
        fitNotes: 'Test brand runs small',
      },
    });
    testBrandId = brand.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.productVariant.deleteMany({
      where: { productId: testProductId },
    });
    await prisma.product.delete({ where: { id: testProductId } });
    await prisma.brand.delete({ where: { id: testBrandId } });
    await prisma.$disconnect();
  });

  // ============================================
  // SISTER SIZING ENDPOINTS
  // ============================================

  describe('GET /api/sizes/sister/:universalCode', () => {
    it('should return sister sizes', async () => {
      const response = await request(app).get(
        '/api/sizes/sister/UIC_BRA_BAND86_CUPVOL6'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('original');
      expect(response.body.data).toHaveProperty('sisterDown');
      expect(response.body.data).toHaveProperty('sisterUp');

      expect(response.body.data.original.displaySize).toBe('34C');
      expect(response.body.data.sisterDown.displaySize).toBe('32D');
      expect(response.body.data.sisterUp.displaySize).toBe('36B');
    });

    it('should return 500 for invalid UIC', async () => {
      const response = await request(app).get('/api/sizes/sister/INVALID_UIC');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/products/:productId/sizes/alternatives', () => {
    it('should return alternatives when size is out of stock', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}/sizes/alternatives`)
        .query({ requestedSize: '34C', regionCode: 'US' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.isAvailable).toBe(false);
      expect(data.alternatives.length).toBeGreaterThan(0);

      const sisterDown = data.alternatives.find(
        (a: any) => a.type === 'SISTER_DOWN'
      );
      expect(sisterDown).toBeDefined();
      expect(sisterDown.size).toBe('32D');
      expect(sisterDown.stock).toBe(5);
    });

    it('should return 400 without required params', async () => {
      const response = await request(app).get(
        `/api/products/${testProductId}/sizes/alternatives`
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sizes/sister-family/:universalCode', () => {
    it('should return sister size family', async () => {
      const response = await request(app)
        .get('/api/sizes/sister-family/UIC_BRA_BAND86_CUPVOL6')
        .query({ regionCode: 'US' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // All sizes should have same cup volume
      const family = response.body.data;
      const cupVolume = family[0].cupVolume;
      family.forEach((size: any) => {
        expect(size.cupVolume).toBe(cupVolume);
      });
    });
  });

  describe('POST /api/sizes/sister/accept', () => {
    it('should accept recommendation', async () => {
      // Create a recommendation first
      const recommendation = await prisma.sisterSizeRecommendation.create({
        data: {
          productId: testProductId,
          requestedSize: '34C',
          requestedUIC: 'UIC_BRA_BAND86_CUPVOL6',
          recommendedSize: '32D',
          recommendedUIC: 'UIC_BRA_BAND81_CUPVOL6',
          recommendationType: 'SISTER_DOWN',
          sessionId: 'test-api',
          regionCode: 'US',
        },
      });

      const response = await request(app)
        .post('/api/sizes/sister/accept')
        .send({ recommendationId: recommendation.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify accepted
      const updated = await prisma.sisterSizeRecommendation.findUnique({
        where: { id: recommendation.id },
      });
      expect(updated?.accepted).toBe(true);

      // Cleanup
      await prisma.sisterSizeRecommendation.delete({
        where: { id: recommendation.id },
      });
    });
  });

  describe('GET /api/sizes/sister/stats', () => {
    it('should return acceptance statistics', async () => {
      const response = await request(app).get('/api/sizes/sister/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  // ============================================
  // CUP PROGRESSION ENDPOINTS
  // ============================================

  describe('POST /api/sizes/cup/convert', () => {
    it('should convert US DD to EU E', async () => {
      const response = await request(app)
        .post('/api/sizes/cup/convert')
        .send({
          fromRegion: 'US',
          toRegion: 'EU',
          cupLetter: 'DD',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.fromCupLetter).toBe('DD');
      expect(data.toCupLetter).toBe('E');
      expect(data.isExactMatch).toBe(true);
    });

    it('should return 404 for invalid conversion', async () => {
      const response = await request(app)
        .post('/api/sizes/cup/convert')
        .send({
          fromRegion: 'INVALID',
          toRegion: 'EU',
          cupLetter: 'C',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing params', async () => {
      const response = await request(app)
        .post('/api/sizes/cup/convert')
        .send({
          fromRegion: 'US',
          // Missing toRegion and cupLetter
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sizes/cup/progression/:regionCode', () => {
    it('should return US cup progression', async () => {
      const response = await request(app).get('/api/sizes/cup/progression/US');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.regionCode).toBe('US');
      expect(Array.isArray(data.progression)).toBe(true);
      expect(data.progression).toContain('DD');
      expect(data.progression).toContain('DDD');
    });

    it('should return UK cup progression', async () => {
      const response = await request(app).get('/api/sizes/cup/progression/UK');

      expect(response.status).toBe(200);
      const data = response.body.data;
      expect(data.progression).toContain('E');
      expect(data.progression).toContain('FF');
    });
  });

  describe('GET /api/sizes/cup/matrix/:cupVolume', () => {
    it('should return conversion matrix for volume 6', async () => {
      const response = await request(app).get('/api/sizes/cup/matrix/6');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.cupVolume).toBe(6);
      expect(data.matrix.US).toBe('DD');
      expect(data.matrix.UK).toBe('DD');
      expect(data.matrix.EU).toBe('E');
    });
  });

  // ============================================
  // BRAND FIT ENDPOINTS
  // ============================================

  describe('POST /api/brands/fit/adjust', () => {
    it('should adjust size for RUNS_SMALL brand', async () => {
      const response = await request(app)
        .post('/api/brands/fit/adjust')
        .send({
          brandId: testBrandId,
          userNormalSize: '34C',
          regionCode: 'US',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.originalSize).toBe('34C');
      expect(data.recommendedSize).toBe('36D');
      expect(data.fitType).toBe('RUNS_SMALL');
    });

    it('should return 400 for invalid request', async () => {
      const response = await request(app)
        .post('/api/brands/fit/adjust')
        .send({
          brandId: testBrandId,
          // Missing userNormalSize
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/brands/:brandId/fit', () => {
    it('should return brand fit profile', async () => {
      const response = await request(app).get(
        `/api/brands/${testBrandId}/fit`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data.name).toBe('Test API Brand');
      expect(data.fitType).toBe('RUNS_SMALL');
      expect(data.bandAdjustment).toBe(1);
    });

    it('should return 404 for invalid brand', async () => {
      const response = await request(app).get('/api/brands/invalid-id/fit');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/brands/fit/all', () => {
    it('should return all brand profiles', async () => {
      const response = await request(app).get('/api/brands/fit/all');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/brands/fit/feedback', () => {
    it('should submit fit feedback', async () => {
      const response = await request(app)
        .post('/api/brands/fit/feedback')
        .send({
          brandId: testBrandId,
          productId: testProductId,
          normalSize: '34C',
          boughtSize: '36D',
          fitRating: 3,
          fitComment: 'Perfect!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      // Cleanup
      await prisma.brandFitFeedback.delete({
        where: { id: response.body.data.id },
      });
    });

    it('should validate fit rating range', async () => {
      const response = await request(app)
        .post('/api/brands/fit/feedback')
        .send({
          brandId: testBrandId,
          productId: testProductId,
          normalSize: '34C',
          boughtSize: '36D',
          fitRating: 6, // Invalid (max 5)
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/brands/:brandId/fit/stats', () => {
    it('should return brand fit statistics', async () => {
      const response = await request(app).get(
        `/api/brands/${testBrandId}/fit/stats`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data).toHaveProperty('totalFeedback');
      expect(data).toHaveProperty('averageRating');
      expect(data).toHaveProperty('fitDistribution');
    });
  });

  describe('GET /api/brands/:brandId/fit/suggested-adjustment', () => {
    it('should return suggested adjustment', async () => {
      const response = await request(app).get(
        `/api/brands/${testBrandId}/fit/suggested-adjustment`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const data = response.body.data;
      expect(data).toHaveProperty('suggestedFitType');
      expect(data).toHaveProperty('suggestedBandAdjustment');
      expect(data).toHaveProperty('confidence');
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error handling', () => {
    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/sizes/cup/convert')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    it('should handle missing route', async () => {
      const response = await request(app).get('/api/sizes/invalid-route');

      expect(response.status).toBe(404);
    });
  });
});

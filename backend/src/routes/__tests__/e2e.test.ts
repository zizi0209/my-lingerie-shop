/**
 * END-TO-END TEST SCENARIOS
 *
 * Complete user journeys for Size System V2
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../server';

const prisma = new PrismaClient();

describe('E2E: Size System User Journeys', () => {
  let testData: {
    productId: number;
    brandId: string;
    userId: number;
  };

  beforeAll(async () => {
    // Setup complete test environment
    const product = await prisma.product.create({
      data: {
        name: 'Luxury Bra E2E',
        slug: 'luxury-bra-e2e',
        description: 'Test product for E2E',
        price: 59.99,
        categoryId: 1,
      },
    });

    // Create full size range
    const sizes = [
      { size: '32C', uic: 'UIC_BRA_BAND81_CUPVOL6', stock: 0 }, // Out of stock
      { size: '32D', uic: 'UIC_BRA_BAND81_CUPVOL7', stock: 5 },
      { size: '34B', uic: 'UIC_BRA_BAND86_CUPVOL5', stock: 3 },
      { size: '34C', uic: 'UIC_BRA_BAND86_CUPVOL6', stock: 0 }, // Out of stock
      { size: '34D', uic: 'UIC_BRA_BAND86_CUPVOL7', stock: 8 },
      { size: '36B', uic: 'UIC_BRA_BAND91_CUPVOL5', stock: 4 },
      { size: '36C', uic: 'UIC_BRA_BAND91_CUPVOL6', stock: 6 },
    ];

    for (const size of sizes) {
      await prisma.productVariant.create({
        data: {
          sku: `E2E-BRA-${size.size}-BLACK`,
          size: size.size,
          baseSize: size.size,
          baseSizeUIC: size.uic,
          colorName: 'Black',
          stock: size.stock,
          productId: product.id,
        },
      });
    }

    const brand = await prisma.brand.create({
      data: {
        name: 'Agent Provocateur E2E',
        slug: 'ap-e2e',
        fitType: 'RUNS_SMALL',
        bandAdjustment: 1,
        cupAdjustment: 1,
        fitNotes: 'This brand runs small. We recommend sizing up.',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: 'test-e2e@example.com',
        name: 'Test User',
      },
    });

    testData = {
      productId: product.id,
      brandId: brand.id,
      userId: user.id,
    };
  });

  afterAll(async () => {
    // Cleanup
    await prisma.productVariant.deleteMany({
      where: { productId: testData.productId },
    });
    await prisma.product.delete({ where: { id: testData.productId } });
    await prisma.brand.delete({ where: { id: testData.brandId } });
    await prisma.user.delete({ where: { id: testData.userId } });
    await prisma.$disconnect();
  });

  // ============================================
  // JOURNEY 1: Out-of-Stock Size → Sister Size
  // ============================================

  describe('Journey 1: User finds out-of-stock size, selects sister size', () => {
    it('should complete full journey', async () => {
      // Step 1: User requests 34C (out of stock)
      const alternativesRes = await request(app)
        .get(`/api/products/${testData.productId}/sizes/alternatives`)
        .query({ requestedSize: '34C', regionCode: 'US' });

      expect(alternativesRes.status).toBe(200);
      expect(alternativesRes.body.data.isAvailable).toBe(false);
      expect(alternativesRes.body.data.alternatives.length).toBeGreaterThan(0);

      // Step 2: User sees sister sizes
      const alternatives = alternativesRes.body.data.alternatives;
      const sisterDown = alternatives.find((a: any) => a.type === 'SISTER_DOWN');
      const sisterUp = alternatives.find((a: any) => a.type === 'SISTER_UP');

      expect(sisterDown).toBeDefined();
      expect(sisterDown.size).toBe('32D');
      expect(sisterDown.stock).toBeGreaterThan(0);

      expect(sisterUp).toBeDefined();
      expect(sisterUp.size).toBe('36B');
      expect(sisterUp.stock).toBeGreaterThan(0);

      // Step 3: User clicks on sister size to learn more
      const sisterInfoRes = await request(app).get(
        `/api/sizes/sister/${sisterDown.universalCode}`
      );

      expect(sisterInfoRes.status).toBe(200);
      expect(sisterInfoRes.body.data.original.cupVolume).toBe(
        sisterInfoRes.body.data.sisterDown.cupVolume
      );

      // Step 4: User selects 32D (sister down)
      // (In real app, this would be part of cart flow)
      // Here we just verify the recommendation was logged

      const recommendations = await prisma.sisterSizeRecommendation.findMany({
        where: {
          productId: testData.productId,
          requestedSize: '34C',
        },
      });

      expect(recommendations.length).toBeGreaterThan(0);

      // Step 5: User accepts recommendation (clicks "Add to Cart")
      const recommendation = recommendations[0];
      const acceptRes = await request(app)
        .post('/api/sizes/sister/accept')
        .send({ recommendationId: recommendation.id });

      expect(acceptRes.status).toBe(200);

      // Verify acceptance was recorded
      const updated = await prisma.sisterSizeRecommendation.findUnique({
        where: { id: recommendation.id },
      });

      expect(updated?.accepted).toBe(true);
      expect(updated?.acceptedAt).toBeDefined();

      console.log('✅ Journey 1: User successfully found and selected sister size');
    });
  });

  // ============================================
  // JOURNEY 2: International Customer - Size Conversion
  // ============================================

  describe('Journey 2: UK customer needs size conversion', () => {
    it('should convert US sizes to UK', async () => {
      // Step 1: Customer selects UK as region preference
      // (Assume region is set via session/cookie)

      // Step 2: View product in UK sizes
      // Customer normally wears UK 34DD, wants to know US equivalent

      // Step 3: Convert UK 34DD to US
      const conversionRes = await request(app)
        .post('/api/sizes/cup/convert')
        .send({
          fromRegion: 'UK',
          toRegion: 'US',
          cupLetter: 'DD',
        });

      expect(conversionRes.status).toBe(200);
      expect(conversionRes.body.data.fromCupLetter).toBe('DD');
      expect(conversionRes.body.data.toCupLetter).toBe('DD'); // UK DD = US DD
      expect(conversionRes.body.data.cupVolume).toBe(6); // Same volume

      // Step 4: Get full conversion matrix
      const matrixRes = await request(app).get('/api/sizes/cup/matrix/6');

      expect(matrixRes.status).toBe(200);
      expect(matrixRes.body.data.matrix.UK).toBe('DD');
      expect(matrixRes.body.data.matrix.US).toBe('DD');
      expect(matrixRes.body.data.matrix.EU).toBe('E'); // EU uses E for volume 6

      // Step 5: View size chart with conversions
      const progressionRes = await request(app).get(
        '/api/sizes/cup/progression/UK'
      );

      expect(progressionRes.status).toBe(200);
      const ukProgression = progressionRes.body.data.progression;
      expect(ukProgression).toContain('DD');
      expect(ukProgression).toContain('E'); // UK has E
      expect(ukProgression).not.toContain('DDD'); // UK doesn't use DDD

      console.log('✅ Journey 2: UK customer successfully converted sizes');
    });
  });

  // ============================================
  // JOURNEY 3: Brand Fit Adjustment
  // ============================================

  describe('Journey 3: Customer buying from RUNS_SMALL brand', () => {
    it('should recommend sizing up', async () => {
      // Step 1: Customer views product from Agent Provocateur
      const brandRes = await request(app).get(
        `/api/brands/${testData.brandId}/fit`
      );

      expect(brandRes.status).toBe(200);
      expect(brandRes.body.data.fitType).toBe('RUNS_SMALL');

      // Step 2: Get size recommendation
      // Customer normally wears 34C
      const adjustRes = await request(app)
        .post('/api/brands/fit/adjust')
        .send({
          brandId: testData.brandId,
          userNormalSize: '34C',
          regionCode: 'US',
        });

      expect(adjustRes.status).toBe(200);
      expect(adjustRes.body.data.originalSize).toBe('34C');
      expect(adjustRes.body.data.recommendedSize).toBe('36D'); // Size up
      expect(adjustRes.body.data.fitNote).toContain('size up');

      // Step 3: Customer purchases 36D
      // (Simulate purchase by creating order - skipped here)

      // Step 4: Customer leaves fit feedback
      const feedbackRes = await request(app)
        .post('/api/brands/fit/feedback')
        .send({
          brandId: testData.brandId,
          productId: testData.productId,
          normalSize: '34C',
          boughtSize: '36D',
          fitRating: 3, // Perfect fit
          fitComment: 'Sizing advice was spot on!',
        });

      expect(feedbackRes.status).toBe(200);

      // Step 5: View brand fit stats (admin perspective)
      const statsRes = await request(app).get(
        `/api/brands/${testData.brandId}/fit/stats`
      );

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.data.totalFeedback).toBeGreaterThan(0);

      console.log('✅ Journey 3: Customer successfully used brand fit adjustment');
    });
  });

  // ============================================
  // JOURNEY 4: Complete Shopping Flow
  // ============================================

  describe('Journey 4: Complete shopping experience', () => {
    it('should handle complex scenario', async () => {
      // Scenario: Japanese customer buying from RUNS_SMALL brand
      // with out-of-stock preferred size

      // Step 1: Get JP cup progression
      const jpProgressionRes = await request(app).get(
        '/api/sizes/cup/progression/JP'
      );
      expect(jpProgressionRes.status).toBe(200);

      // Step 2: Convert JP size to US
      // Customer wears JP 75E, wants to know US equivalent
      const jpToUsRes = await request(app)
        .post('/api/sizes/cup/convert')
        .send({
          fromRegion: 'JP',
          toRegion: 'US',
          cupLetter: 'E',
        });

      expect(jpToUsRes.status).toBe(200);
      const usEquivalent = jpToUsRes.body.data.toCupLetter;
      expect(usEquivalent).toBe('DD'); // JP E = US DD

      // Step 3: Brand fit adjustment
      // Brand runs small, so size up from 34DD
      const brandAdjustRes = await request(app)
        .post('/api/brands/fit/adjust')
        .send({
          brandId: testData.brandId,
          userNormalSize: '34DD',
          regionCode: 'US',
        });

      expect(brandAdjustRes.status).toBe(200);
      const recommended = brandAdjustRes.body.data.recommendedSize;
      // Should recommend 36E (up 1 band, up 1 cup from DD)

      // Step 4: Check if recommended size in stock
      const alternativesRes = await request(app)
        .get(`/api/products/${testData.productId}/sizes/alternatives`)
        .query({ requestedSize: recommended, regionCode: 'US' });

      expect(alternativesRes.status).toBe(200);

      // Step 5: If out of stock, get sister sizes
      if (!alternativesRes.body.data.isAvailable) {
        const alternatives = alternativesRes.body.data.alternatives;
        expect(alternatives.length).toBeGreaterThan(0);
        console.log('✅ Sister sizes available:', alternatives.map((a: any) => a.size));
      }

      console.log('✅ Journey 4: Complex scenario handled successfully');
    });
  });

  // ============================================
  // JOURNEY 5: Analytics & Insights
  // ============================================

  describe('Journey 5: Admin views analytics', () => {
    it('should provide actionable insights', async () => {
      // Step 1: View sister size acceptance stats
      const acceptanceRes = await request(app).get('/api/sizes/sister/stats');

      expect(acceptanceRes.status).toBe(200);
      expect(Array.isArray(acceptanceRes.body.data)).toBe(true);

      // Step 2: Get frequently out-of-stock sizes
      const outOfStockRes = await request(app)
        .get('/api/sizes/out-of-stock')
        .query({ limit: 10 });

      expect(outOfStockRes.status).toBe(200);
      const outOfStockSizes = outOfStockRes.body.data;

      if (outOfStockSizes.length > 0) {
        console.log('⚠️  Frequently out of stock:', outOfStockSizes);
      }

      // Step 3: Get brand fit suggestions
      const suggestionRes = await request(app).get(
        `/api/brands/${testData.brandId}/fit/suggested-adjustment`
      );

      expect(suggestionRes.status).toBe(200);
      const suggestion = suggestionRes.body.data;

      console.log('📊 AI-suggested brand fit:', {
        fitType: suggestion.suggestedFitType,
        bandAdjustment: suggestion.suggestedBandAdjustment,
        confidence: suggestion.confidence,
      });

      // Step 4: View all brand profiles
      const allBrandsRes = await request(app).get('/api/brands/fit/all');

      expect(allBrandsRes.status).toBe(200);
      expect(allBrandsRes.body.data.length).toBeGreaterThan(0);

      console.log('✅ Journey 5: Admin successfully viewed analytics');
    });
  });

  // ============================================
  // JOURNEY 6: Error Recovery
  // ============================================

  describe('Journey 6: User encounters errors and recovers', () => {
    it('should handle errors gracefully', async () => {
      // Scenario 1: Invalid size format
      const invalidSizeRes = await request(app)
        .post('/api/brands/fit/adjust')
        .send({
          brandId: testData.brandId,
          userNormalSize: 'INVALID',
          regionCode: 'US',
        });

      expect(invalidSizeRes.status).toBe(500);
      expect(invalidSizeRes.body.success).toBe(false);

      // Scenario 2: Invalid region code
      const invalidRegionRes = await request(app)
        .post('/api/sizes/cup/convert')
        .send({
          fromRegion: 'INVALID',
          toRegion: 'US',
          cupLetter: 'C',
        });

      expect(invalidRegionRes.status).toBe(404);

      // Scenario 3: Missing required params
      const missingParamsRes = await request(app)
        .post('/api/brands/fit/adjust')
        .send({
          brandId: testData.brandId,
          // Missing userNormalSize
        });

      expect(missingParamsRes.status).toBe(400);

      // Scenario 4: Invalid brand ID
      const invalidBrandRes = await request(app).get(
        '/api/brands/invalid-id/fit'
      );

      expect(invalidBrandRes.status).toBe(404);

      console.log('✅ Journey 6: All errors handled gracefully');
    });
  });
});

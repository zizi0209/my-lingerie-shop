 /**
  * VIRTUAL TRY-ON SERVICE - UNIT TESTS
  *
  * Tests for virtual try-on hybrid service with HuggingFace Spaces and Gemini fallback
  */
 
 import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 import {
   processVirtualTryOn,
   checkSpacesStatus,
   resetProviderHealth,
   getProviderHealthStats,
 } from '../virtualTryOnService';
 
 // Mock fetch for testing
 const mockFetch = vi.fn();
 global.fetch = mockFetch;

const setupFetchMock = (options?: {
  failAll?: boolean;
  failFashn?: boolean;
}) => {
  mockFetch.mockImplementation(async (url: string | URL, init?: RequestInit) => {
    const requestUrl = typeof url === 'string' ? url : url.toString();
    const method = init?.method ?? 'GET';

    if (method === 'HEAD') {
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      };
    }

    if (method === 'POST') {
      if (options?.failAll) {
        throw new Error('Service unavailable');
      }
      if (requestUrl.includes('api.imgbb.com/1/upload')) {
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: { url: 'https://example.com/mock-upload.jpg' },
          }),
          text: () => Promise.resolve('OK'),
        };
      }
      if (options?.failFashn && requestUrl.includes('fashn-ai-fashn-vton-1-5')) {
        throw new Error('First provider down');
      }
      return {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ event_id: 'test-event-123' }),
        text: () => Promise.resolve('OK'),
      };
    }

    return {
      ok: true,
      status: 200,
      text: () => Promise.resolve('event: complete\ndata: ["https://example.com/result.jpg"]'),
    };
  });
};
 
 // Mock Gemini service
 vi.mock('../geminiVirtualTryOnService', () => ({
   isGeminiAvailable: vi.fn(() => true),
   processGeminiTryOn: vi.fn(() => Promise.resolve({
     success: false,
     provider: 'gemini',
     error: 'Mocked Gemini failure',
   })),
 }));
 
 describe('VirtualTryOnService', () => {
   // Sample base64 images for testing
   const samplePersonImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAA...';
   const sampleGarmentImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAB...';
  const originalImgbbKey = process.env.IMGBB_API_KEY;
 
   beforeEach(() => {
     vi.clearAllMocks();
     resetProviderHealth();
    process.env.IMGBB_API_KEY = '';
   });
 
   afterEach(() => {
     vi.restoreAllMocks();
    if (originalImgbbKey) {
      process.env.IMGBB_API_KEY = originalImgbbKey;
    } else {
      delete process.env.IMGBB_API_KEY;
    }
   });
 
   describe('resetProviderHealth', () => {
     it('should reset all provider health stats', () => {
       resetProviderHealth();
       const stats = getProviderHealthStats();
 
       expect(stats).toBeDefined();
       expect(Object.keys(stats).length).toBeGreaterThan(0);
 
       // Check all providers have reset stats
       Object.values(stats).forEach(health => {
         expect(health.successCount).toBe(0);
         expect(health.failureCount).toBe(0);
         expect(health.consecutiveFailures).toBe(0);
       });
     });
   });
 
   describe('getProviderHealthStats', () => {
     it('should return health stats for all providers', () => {
       const stats = getProviderHealthStats();
 
       expect(stats).toBeDefined();
       expect(stats['FASHN-VTON-1.5']).toBeDefined();
       expect(stats['IDM-VTON']).toBeDefined();
       expect(stats['OOTDiffusion']).toBeDefined();
       expect(stats['OutfitAnyone']).toBeDefined();
       expect(stats['Kolors-VTON']).toBeDefined();
      expect(stats['StableVITON']).toBeDefined();
      expect(stats['VTON-D']).toBeDefined();
     });
 
     it('should have correct health structure', () => {
       const stats = getProviderHealthStats();
       const health = stats['FASHN-VTON-1.5'];
 
       expect(health).toHaveProperty('lastSuccess');
       expect(health).toHaveProperty('lastFailure');
       expect(health).toHaveProperty('successCount');
       expect(health).toHaveProperty('failureCount');
       expect(health).toHaveProperty('consecutiveFailures');
       expect(health).toHaveProperty('avgResponseTime');
     });
   });
 
   describe('checkSpacesStatus', () => {
     it('should return status for all providers', async () => {
       // Mock successful health checks
      setupFetchMock();
 
       const statuses = await checkSpacesStatus();
 
       expect(statuses).toBeDefined();
       expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBe(Object.keys(getProviderHealthStats()).length);
     });
 
     it('should mark provider as unavailable on error', async () => {
       // Mock failed health check
       mockFetch.mockRejectedValue(new Error('Network error'));
 
       const statuses = await checkSpacesStatus();
 
       statuses.forEach(status => {
         expect(status.available).toBe(false);
       });
     });
   });
 
   describe('processVirtualTryOn', () => {
     it('should return error when all providers fail', async () => {
       // Mock all providers failing
      setupFetchMock({ failAll: true });
 
       const result = await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(false);
       expect(result.error).toBeDefined();
       expect(result.processingTime).toBeGreaterThan(0);
     });
 
     it('should track processing time', async () => {
      setupFetchMock({ failAll: true });
 
       const result = await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.processingTime).toBeDefined();
       expect(typeof result.processingTime).toBe('number');
     });
 
     it('should update provider health on failure', async () => {
      setupFetchMock({ failAll: true });
 
       await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       const stats = getProviderHealthStats();
 
       // At least one provider should have failure recorded
       const hasFailure = Object.values(stats).some(h => h.failureCount > 0);
       expect(hasFailure).toBe(true);
     });
 
     it('should return success with result image on success', async () => {
      setupFetchMock();
 
       const result = await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(true);
       expect(result.resultImage).toBeDefined();
       expect(result.provider).toBe('FASHN-VTON-1.5');
     });
 
     it('should update health stats on success', async () => {
      setupFetchMock();
 
       await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       const stats = getProviderHealthStats();
       expect(stats['FASHN-VTON-1.5'].successCount).toBe(1);
       expect(stats['FASHN-VTON-1.5'].consecutiveFailures).toBe(0);
     });
 
     it('should try next provider on first failure', async () => {
       // First provider fails, second succeeds
      setupFetchMock({ failFashn: true });
 
       const result = await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(true);
       expect(result.provider).toBe('IDM-VTON');
     });
   });
 
   describe('Provider Configuration', () => {
     it('should have FASHN-VTON-1.5 as first provider', () => {
       const stats = getProviderHealthStats();
       const providers = Object.keys(stats);
       
       expect(providers[0]).toBe('FASHN-VTON-1.5');
     });
 
    it('should have 7 HuggingFace providers configured', () => {
       const stats = getProviderHealthStats();
      expect(Object.keys(stats).length).toBe(7);
     });
   });
 });

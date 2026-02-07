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
 
   beforeEach(() => {
     vi.clearAllMocks();
     resetProviderHealth();
   });
 
   afterEach(() => {
     vi.restoreAllMocks();
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
       mockFetch.mockResolvedValue({
         ok: true,
         text: () => Promise.resolve('OK'),
       });
 
       const statuses = await checkSpacesStatus();
 
       expect(statuses).toBeDefined();
       expect(Array.isArray(statuses)).toBe(true);
       expect(statuses.length).toBe(5); // 5 HF providers
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
       mockFetch.mockRejectedValue(new Error('Service unavailable'));
 
       const result = await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(false);
       expect(result.error).toBeDefined();
       expect(result.processingTime).toBeGreaterThan(0);
     });
 
     it('should track processing time', async () => {
       mockFetch.mockRejectedValue(new Error('Service unavailable'));
 
       const result = await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.processingTime).toBeDefined();
       expect(typeof result.processingTime).toBe('number');
     });
 
     it('should update provider health on failure', async () => {
       mockFetch.mockRejectedValue(new Error('Service unavailable'));
 
       await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       const stats = getProviderHealthStats();
 
       // At least one provider should have failure recorded
       const hasFailure = Object.values(stats).some(h => h.failureCount > 0);
       expect(hasFailure).toBe(true);
     });
 
     it('should return success with result image on success', async () => {
       // Mock successful API call
       mockFetch
         .mockResolvedValueOnce({
           ok: true,
           json: () => Promise.resolve({ event_id: 'test-event-123' }),
         })
         .mockResolvedValueOnce({
           ok: true,
           text: () => Promise.resolve('event: complete\ndata: ["https://example.com/result.jpg"]'),
         });
 
       const result = await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(true);
       expect(result.resultImage).toBeDefined();
       expect(result.provider).toBe('FASHN-VTON-1.5');
     });
 
     it('should update health stats on success', async () => {
       mockFetch
         .mockResolvedValueOnce({
           ok: true,
           json: () => Promise.resolve({ event_id: 'test-event-123' }),
         })
         .mockResolvedValueOnce({
           ok: true,
           text: () => Promise.resolve('event: complete\ndata: ["https://example.com/result.jpg"]'),
         });
 
       await processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       const stats = getProviderHealthStats();
       expect(stats['FASHN-VTON-1.5'].successCount).toBe(1);
       expect(stats['FASHN-VTON-1.5'].consecutiveFailures).toBe(0);
     });
 
     it('should try next provider on first failure', async () => {
       // First provider fails, second succeeds
       mockFetch
         .mockRejectedValueOnce(new Error('First provider down'))
         .mockResolvedValueOnce({
           ok: true,
           json: () => Promise.resolve({ event_id: 'test-event-456' }),
         })
         .mockResolvedValueOnce({
           ok: true,
           text: () => Promise.resolve('event: complete\ndata: ["https://example.com/result2.jpg"]'),
         });
 
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
 
     it('should have 5 HuggingFace providers configured', () => {
       const stats = getProviderHealthStats();
       expect(Object.keys(stats).length).toBe(5);
     });
   });
 });

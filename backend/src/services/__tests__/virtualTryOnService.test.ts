 /**
  * VIRTUAL TRY-ON SERVICE - UNIT TESTS
  *
  * Tests for virtual try-on hybrid service with HuggingFace Spaces and Gemini fallback
  */
 
 import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
type VirtualTryOnModule = typeof import('../virtualTryOnService');
 
// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

let service: VirtualTryOnModule;
const loadService = async (): Promise<void> => {
  service = await import('../virtualTryOnService');
};

const setupFetchMock = (options?: {
  failAll?: boolean;
  failFashn?: boolean;
  failSelfHostedReadiness?: boolean;
  timeoutSelfHosted?: boolean;
  failFashnAfterSelfHosted?: boolean;
  failDmvton?: boolean;
  timeoutDmvton?: boolean;
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

    if (method === 'OPTIONS') {
      if (options?.failSelfHostedReadiness && requestUrl.includes('zy131-tryon-lingerie')) {
        return {
          ok: false,
          status: 500,
          text: () => Promise.resolve('ERROR'),
        };
      }
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
      if (requestUrl.includes('dmvton.local')) {
        if (options?.timeoutDmvton) {
          throw new Error('timeout');
        }
        if (options?.failDmvton) {
          throw new Error('DM-VTON down');
        }
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            result_image_url: 'https://example.com/dmvton-result.png',
            mime_type: 'image/png',
          }),
          text: () => Promise.resolve('OK'),
        };
      }
      if (options?.timeoutSelfHosted && requestUrl.includes('zy131-tryon-lingerie')) {
        throw new Error('timeout');
      }
      if (options?.failFashnAfterSelfHosted && requestUrl.includes('fashn-ai-fashn-vton-1-5')) {
        throw new Error('First provider down');
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
 
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.IMGBB_API_KEY = '';
    delete process.env.TRYON_SELF_HOSTED_URL;
    delete process.env.TRYON_SELF_HOSTED_ENDPOINT;
    delete process.env.TRYON_SELF_HOSTED_NAME;
    delete process.env.TRYON_PRIMARY_PROVIDERS;
    delete process.env.TRYON_PROVIDER_ALLOWLIST;
    delete process.env.TRYON_PROVIDER_BLOCKLIST;
    delete process.env.TRYON_DMVTON_ENABLED;
    delete process.env.TRYON_DMVTON_URL;
    delete process.env.TRYON_DMVTON_ENDPOINT;
    delete process.env.TRYON_DEMO_LEARNING;
    vi.resetModules();
    await loadService();
    service.resetProviderHealth();
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
      service.resetProviderHealth();
      const stats = service.getProviderHealthStats();
 
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
      const stats = service.getProviderHealthStats();
 
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
      const stats = service.getProviderHealthStats();
       const health = stats['FASHN-VTON-1.5'];
 
       expect(health).toHaveProperty('lastSuccess');
       expect(health).toHaveProperty('lastFailure');
      expect(health).toHaveProperty('lastErrorAt');
      expect(health).toHaveProperty('lastErrorMessage');
       expect(health).toHaveProperty('successCount');
       expect(health).toHaveProperty('failureCount');
       expect(health).toHaveProperty('consecutiveFailures');
      expect(health).toHaveProperty('consecutiveTimeouts');
       expect(health).toHaveProperty('avgResponseTime');
      expect(health).toHaveProperty('successRate');
      expect(health).toHaveProperty('timeoutRate');
      expect(health).toHaveProperty('coolingDownUntil');
      expect(health).toHaveProperty('stage');
     });
   });
 
   describe('checkSpacesStatus', () => {
     it('should return status for all providers', async () => {
       // Mock successful health checks
      setupFetchMock();
      process.env.TRYON_DEMO_LEARNING = 'true';
      vi.resetModules();
      await loadService();
 
      const statuses = await service.checkSpacesStatus();
 
       expect(statuses).toBeDefined();
       expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBe(Object.keys(service.getProviderHealthStats()).length);
     });
 
     it('should mark provider as unavailable on error', async () => {
       // Mock failed health check
       mockFetch.mockRejectedValue(new Error('Network error'));
 
      const statuses = await service.checkSpacesStatus();
 
       statuses.forEach(status => {
         expect(status.available).toBe(false);
       });
     });
   });
 
   describe('processVirtualTryOn', () => {
     it('should return error when all providers fail', async () => {
       // Mock all providers failing
      setupFetchMock({ failAll: true });
 
      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(false);
       expect(result.error).toBeDefined();
       expect(result.processingTime).toBeGreaterThan(0);
     });
 
     it('should track processing time', async () => {
      setupFetchMock({ failAll: true });
 
      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.processingTime).toBeDefined();
       expect(typeof result.processingTime).toBe('number');
     });
 
     it('should update provider health on failure', async () => {
      setupFetchMock({ failAll: true });
 
      await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
      const stats = service.getProviderHealthStats();
 
       // At least one provider should have failure recorded
       const hasFailure = Object.values(stats).some(h => h.failureCount > 0);
       expect(hasFailure).toBe(true);
     });
 
     it('should return success with result image on success', async () => {
      setupFetchMock();
 
      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(true);
       expect(result.resultImage).toBeDefined();
       expect(result.provider).toBe('FASHN-VTON-1.5');
     });
 
     it('should update health stats on success', async () => {
      setupFetchMock();
 
      await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
      const stats = service.getProviderHealthStats();
       expect(stats['FASHN-VTON-1.5'].successCount).toBe(1);
       expect(stats['FASHN-VTON-1.5'].consecutiveFailures).toBe(0);
     });
 
     it('should try next provider on first failure', async () => {
       // First provider fails, second succeeds
      setupFetchMock({ failFashn: true });
      process.env.TRYON_DEMO_LEARNING = 'true';
      vi.resetModules();
      await loadService();
 
      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);
 
       expect(result.success).toBe(true);
       expect(result.provider).toBe('IDM-VTON');
     });
   });

  describe('DM-VTON local provider', () => {
    it('should prefer DM-VTON when enabled', async () => {
      process.env.TRYON_DMVTON_ENABLED = 'true';
      process.env.TRYON_DMVTON_URL = 'https://dmvton.local';
      setupFetchMock();
      vi.resetModules();
      await loadService();

      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('DM-VTON-Local');
    });

    it('should fallback when DM-VTON times out', async () => {
      process.env.TRYON_DMVTON_ENABLED = 'true';
      process.env.TRYON_DMVTON_URL = 'https://dmvton.local';
      setupFetchMock({ timeoutDmvton: true });
      vi.resetModules();
      await loadService();

      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('FASHN-VTON-1.5');
    });
  });

  describe('Provider license gating', () => {
    it('should block noncommercial providers when demo learning is disabled', async () => {
      process.env.TRYON_DEMO_LEARNING = 'false';
      process.env.TRYON_PROVIDER_ALLOWLIST = 'IDM-VTON';
      setupFetchMock();
      vi.resetModules();
      await loadService();

      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_UNAVAILABLE');
    });
  });

  describe('Self-hosted readiness and fallback', () => {
    const originalSelfHostedUrl = process.env.TRYON_SELF_HOSTED_URL;
    const originalPrimaryProviders = process.env.TRYON_PRIMARY_PROVIDERS;
    const originalSelfHostedName = process.env.TRYON_SELF_HOSTED_NAME;
    const originalSelfHostedEndpoint = process.env.TRYON_SELF_HOSTED_ENDPOINT;

    afterEach(() => {
      if (originalSelfHostedUrl) {
        process.env.TRYON_SELF_HOSTED_URL = originalSelfHostedUrl;
      } else {
        delete process.env.TRYON_SELF_HOSTED_URL;
      }
      if (originalPrimaryProviders) {
        process.env.TRYON_PRIMARY_PROVIDERS = originalPrimaryProviders;
      } else {
        delete process.env.TRYON_PRIMARY_PROVIDERS;
      }
      if (originalSelfHostedName) {
        process.env.TRYON_SELF_HOSTED_NAME = originalSelfHostedName;
      } else {
        delete process.env.TRYON_SELF_HOSTED_NAME;
      }
      if (originalSelfHostedEndpoint) {
        process.env.TRYON_SELF_HOSTED_ENDPOINT = originalSelfHostedEndpoint;
      } else {
        delete process.env.TRYON_SELF_HOSTED_ENDPOINT;
      }
    });

    it('should skip self-hosted when readiness fails', async () => {
      process.env.TRYON_SELF_HOSTED_URL = 'https://zy131-tryon-lingerie.hf.space';
      process.env.TRYON_SELF_HOSTED_NAME = 'Zy131-TryOn';
      process.env.TRYON_SELF_HOSTED_ENDPOINT = '/call/tryon';
      process.env.TRYON_PRIMARY_PROVIDERS = 'Zy131-TryOn,FASHN-VTON-1.5,IDM-VTON';
      process.env.TRYON_DEMO_LEARNING = 'true';

      setupFetchMock({ failSelfHostedReadiness: true });
      vi.resetModules();
      await loadService();

      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('FASHN-VTON-1.5');
    });

    it('should fallback when self-hosted times out', async () => {
      process.env.TRYON_SELF_HOSTED_URL = 'https://zy131-tryon-lingerie.hf.space';
      process.env.TRYON_SELF_HOSTED_NAME = 'Zy131-TryOn';
      process.env.TRYON_SELF_HOSTED_ENDPOINT = '/call/tryon';
      process.env.TRYON_PRIMARY_PROVIDERS = 'Zy131-TryOn,FASHN-VTON-1.5,IDM-VTON';
      process.env.TRYON_DEMO_LEARNING = 'true';

      setupFetchMock({ timeoutSelfHosted: true, failFashnAfterSelfHosted: true });
      vi.resetModules();
      await loadService();

      const result = await service.processVirtualTryOn(samplePersonImage, sampleGarmentImage);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('IDM-VTON');
    });
  });
 
   describe('Provider Configuration', () => {
     it('should have FASHN-VTON-1.5 as first provider', () => {
      const stats = service.getProviderHealthStats();
       const providers = Object.keys(stats);
       
       expect(providers[0]).toBe('FASHN-VTON-1.5');
     });
 
    it('should have 7 HuggingFace providers configured', () => {
      const stats = service.getProviderHealthStats();
      expect(Object.keys(stats).length).toBe(7);
     });
   });
 });

import { describe, it, expect, beforeEach, vi } from 'vitest';

type VirtualTryOnModule = typeof import('../virtualTryOnService');

let service: VirtualTryOnModule;
const loadService = async (): Promise<void> => {
  service = await import('../virtualTryOnService');
};

describe('VirtualTryOnService (Vertex-only)', () => {
  beforeEach(async () => {
    process.env.VERTEX_AI_PROJECT_ID = 'test-project';
    process.env.VERTEX_AI_LOCATION = 'us-central1';
    process.env.VERTEX_TRYON_MODEL_ID = 'virtual-try-on-001';
    process.env.TRYON_STORAGE_PROVIDER = 'cloudinary';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    vi.resetModules();
    await loadService();
  });

  it('processVirtualTryOn phải báo deprecated', async () => {
    await expect(service.processVirtualTryOn('person', 'garment'))
      .rejects
      .toThrow('Luồng sync đã bị ngưng');
  });

  it('checkSpacesStatus trả về Vertex health', async () => {
    const statuses = await service.checkSpacesStatus();
    expect(statuses).toHaveLength(1);
    expect(statuses[0].name).toBe('Vertex-AI');
  });

  it('getProviderHealthStats trả về snapshot Vertex', () => {
    const stats = service.getProviderHealthStats();
    expect(stats['Vertex-AI']).toBeDefined();
  });
});

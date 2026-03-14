import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { prisma } from '../../tests/setup';

describe('Virtual Try-On load smoke', () => {
  let app: typeof import('../../server').default;

  beforeAll(async () => {
    process.env.TRYON_JOB_STORE = 'postgres';
    process.env.TRYON_STORAGE_PROVIDER = 'cloudinary';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    const module = await import('../../server');
    app = module.default;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM virtual_tryon_jobs');
  });

  it('should handle burst job creation', async () => {
    const requests = Array.from({ length: 10 }).map((_, index) => request(app)
      .post('/api/virtual-tryon/jobs')
      .send({
        personImageUrl: `https://example.com/person-${index}.jpg`,
        garmentImageUrl: `https://example.com/garment-${index}.jpg`,
        productId: `test-product-${index}`,
      }));

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

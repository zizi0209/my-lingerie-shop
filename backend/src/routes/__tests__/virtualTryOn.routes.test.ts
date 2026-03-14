import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { prisma } from '../../tests/setup';

vi.mock('../../services/vertexTryOnService', () => ({
  processVertexTryOnFromUrl: vi.fn(async () => ({
    base64Image: Buffer.from('fake-image').toString('base64'),
    mimeType: 'image/png',
  })),
  processVertexTryOnFromGcs: vi.fn(async () => ({
    base64Image: Buffer.from('fake-image').toString('base64'),
    mimeType: 'image/png',
  })),
  storeTryOnResult: vi.fn(async () => ({
    signedUrl: 'https://example.com/result.png',
    storageUri: 'gs://fake-bucket/result.png',
  })),
  generateVeoVideoFromImage: vi.fn(),
  getSignedReadUrlForGcsUri: vi.fn(async () => 'https://example.com/video.mp4'),
}));

describe('Virtual Try-On async routes', () => {
  let app: typeof import('../../server').default;

  beforeAll(async () => {
    process.env.TRYON_JOB_STORE = 'postgres';
    process.env.TRYON_STORAGE_PROVIDER = 'cloudinary';
    process.env.CLOUDINARY_CLOUD_NAME = 'test';
    process.env.CLOUDINARY_API_KEY = 'test';
    process.env.CLOUDINARY_API_SECRET = 'test';
    process.env.TRYON_WORKER_TOKEN = 'test-worker-token';
    delete process.env.TRYON_WORKER_WEBHOOK_URL;
    const module = await import('../../server');
    app = module.default;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM virtual_tryon_jobs');
  });

  it('should deprecate sync endpoint', async () => {
    const response = await request(app)
      .post('/api/virtual-tryon/process')
      .send({ personImage: 'data:image/png;base64,abc', garmentImage: 'data:image/png;base64,def' });

    expect(response.status).toBe(410);
    expect(response.body.success).toBe(false);
  });

  it('should create job and process async flow', async () => {
    const jobResponse = await request(app)
      .post('/api/virtual-tryon/jobs')
      .send({
        personImageUrl: 'https://example.com/person.jpg',
        garmentImageUrl: 'https://example.com/garment.jpg',
        productId: 'test-product',
      });

    expect(jobResponse.status).toBe(200);
    expect(jobResponse.body.success).toBe(true);
    const jobId = jobResponse.body.data?.jobId as string;
    expect(jobId).toBeTruthy();

    const processResponse = await request(app)
      .post(`/api/virtual-tryon/jobs/${jobId}/process`)
      .set('x-worker-token', 'test-worker-token')
      .send();

    expect(processResponse.status).toBe(200);
    expect(processResponse.body.success).toBe(true);
    expect(processResponse.body.data.resultImage).toBe('https://example.com/result.png');
  });
});

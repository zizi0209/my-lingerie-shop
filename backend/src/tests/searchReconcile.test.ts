import { describe, it, expect, vi, afterEach } from 'vitest';

const now = vi.hoisted(() => new Date('2026-03-10T10:00:00Z'));
const older = vi.hoisted(() => new Date('2026-03-09T10:00:00Z'));

const productFindMany = vi.hoisted(() => vi.fn());
const queryRaw = vi.hoisted(() => vi.fn());

productFindMany
  .mockResolvedValueOnce([
    {
      id: 1,
      name: 'Product A',
      description: 'Desc',
      price: 100,
      salePrice: null,
      categoryId: 1,
      isVisible: true,
      ratingAverage: 4.5,
      reviewCount: 10,
      createdAt: older,
      updatedAt: now,
      category: { name: 'Cat', slug: 'cat' },
      productColors: [],
      variants: [],
    },
    {
      id: 2,
      name: 'Product B',
      description: 'Desc',
      price: 200,
      salePrice: null,
      categoryId: 1,
      isVisible: true,
      ratingAverage: 4.2,
      reviewCount: 8,
      createdAt: older,
      updatedAt: now,
      category: { name: 'Cat', slug: 'cat' },
      productColors: [],
      variants: [],
    },
  ])
  .mockResolvedValueOnce([]);

queryRaw
  .mockResolvedValueOnce([{ productId: 1, updatedAt: older }])
  .mockResolvedValueOnce([]);

vi.mock('../lib/prisma', () => ({
  prisma: {
    product: { findMany: productFindMany },
    $queryRaw: queryRaw,
  },
}));

vi.mock('../lib/redisSearch', async () => {
  const actual = await vi.importActual<typeof import('../lib/redisSearch')>('../lib/redisSearch');
  return {
    ...actual,
    ensureProductIndexDetailed: vi.fn().mockResolvedValue({ ok: true }),
    fetchIndexMetaPage: vi.fn().mockResolvedValue({
      total: 2,
      items: [
        { id: 1, updatedAtTs: Math.floor(older.getTime() / 1000) },
        { id: 3, updatedAtTs: Math.floor(older.getTime() / 1000) },
      ],
    }),
    deleteProductDoc: vi.fn().mockResolvedValue(undefined),
    upsertProductDoc: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../lib/pgvectorSearch', async () => {
  const actual = await vi.importActual<typeof import('../lib/pgvectorSearch')>('../lib/pgvectorSearch');
  return {
    ...actual,
    ensurePgvectorReady: vi.fn().mockResolvedValue({ ok: true }),
    deleteProductEmbedding: vi.fn().mockResolvedValue(undefined),
    upsertProductEmbedding: vi.fn().mockResolvedValue(undefined),
  };
});

import { reconcileSearchIndex } from '../services/searchReconcile.service';

describe('Search reconcile', () => {
  const originalEngine = process.env.SEARCH_ENGINE;
  const originalWriteMode = process.env.SEARCH_WRITE_MODE;

  afterEach(() => {
    process.env.SEARCH_ENGINE = originalEngine;
    process.env.SEARCH_WRITE_MODE = originalWriteMode;
  });

  it('should report drift in dry-run mode', async () => {
    process.env.SEARCH_ENGINE = 'redis_hybrid';
    process.env.SEARCH_WRITE_MODE = 'dual';

    const report = await reconcileSearchIndex(200, { dryRun: true });

    expect(report.scanned).toBe(2);
    expect(report.missingRedis).toBe(1);
    expect(report.staleRedis).toBe(1);
    expect(report.missingPgvector).toBe(1);
    expect(report.stalePgvector).toBe(1);
    expect(report.deletedRedis).toBe(1);
    expect(report.healed).toBe(2);
  });
});

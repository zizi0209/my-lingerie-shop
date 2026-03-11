import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../services/embeddingClient', () => ({
  embedTextsDetailed: vi.fn().mockResolvedValue({ embeddings: [[0.1, 0.2]], status: 'ok' }),
}));

const productRecord = {
  id: 10,
  name: 'Product X',
  description: 'Desc',
  price: 100,
  salePrice: null,
  categoryId: 1,
  isVisible: true,
  ratingAverage: 4.5,
  reviewCount: 2,
  createdAt: new Date('2026-03-09T10:00:00Z'),
  updatedAt: new Date('2026-03-10T10:00:00Z'),
  category: { name: 'Cat', slug: 'cat' },
  productColors: [],
  variants: [],
};

const findUnique = vi.hoisted(() => vi.fn());

findUnique.mockResolvedValue(productRecord);

vi.mock('../lib/prisma', () => ({
  prisma: {
    product: { findUnique },
  },
}));

const upsertProductDoc = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const upsertProductEmbedding = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../lib/redisSearch', async () => {
  const actual = await vi.importActual<typeof import('../lib/redisSearch')>('../lib/redisSearch');
  return {
    ...actual,
    ensureProductIndexDetailed: vi.fn().mockResolvedValue({ ok: true }),
    upsertProductDoc,
  };
});

vi.mock('../lib/pgvectorSearch', async () => {
  const actual = await vi.importActual<typeof import('../lib/pgvectorSearch')>('../lib/pgvectorSearch');
  return {
    ...actual,
    ensurePgvectorReady: vi.fn().mockResolvedValue({ ok: true }),
    upsertProductEmbedding,
  };
});

import { indexProductById } from '../services/searchIndexing.service';

describe('Search indexing dual write', () => {
  const originalEngine = process.env.SEARCH_ENGINE;
  const originalWriteMode = process.env.SEARCH_WRITE_MODE;

  afterEach(() => {
    process.env.SEARCH_ENGINE = originalEngine;
    process.env.SEARCH_WRITE_MODE = originalWriteMode;
  });

  it('should write both redis and pgvector in dual mode', async () => {
    process.env.SEARCH_ENGINE = 'pgvector';
    process.env.SEARCH_WRITE_MODE = 'dual';

    await indexProductById(10);

    expect(upsertProductDoc).toHaveBeenCalledTimes(1);
    expect(upsertProductEmbedding).toHaveBeenCalledTimes(1);
  });
});

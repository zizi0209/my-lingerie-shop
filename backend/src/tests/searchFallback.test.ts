import { describe, it, expect, vi, afterEach } from 'vitest';

const productFindMany = vi.hoisted(() => vi.fn());

productFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

vi.mock('../lib/prisma', () => ({
  prisma: {
    searchKeyword: { findFirst: vi.fn().mockResolvedValue(null) },
    searchSynonym: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue(undefined),
    },
    category: { findMany: vi.fn().mockResolvedValue([]) },
    product: {
      findMany: productFindMany,
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
      aggregate: vi.fn().mockResolvedValue({ _min: { price: 0 }, _max: { price: 0 } }),
    },
    productVariant: { findMany: vi.fn().mockResolvedValue([]) },
    searchLog: { create: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock('../services/embeddingClient', () => ({
  embedTextsDetailed: vi.fn().mockResolvedValue({ embeddings: [[0.1]], status: 'ok' }),
}));

vi.mock('../lib/redisSearch', async () => {
  const actual = await vi.importActual<typeof import('../lib/redisSearch')>('../lib/redisSearch');
  const { RedisSearchError } = actual;
  return {
    ...actual,
    ensureProductIndexDetailed: vi.fn().mockResolvedValue({ ok: true }),
    searchHybrid: vi.fn().mockRejectedValue(new RedisSearchError('Redis down', 'redis_unavailable')),
  };
});

import { smartSearch } from '../services/searchService';

describe('Search fallback', () => {
  const originalEngine = process.env.SEARCH_ENGINE;
  const originalFallback = process.env.SEARCH_FALLBACK_TO_POSTGRES;

  afterEach(() => {
    process.env.SEARCH_ENGINE = originalEngine;
    process.env.SEARCH_FALLBACK_TO_POSTGRES = originalFallback;
  });

  it('should fallback to postgres when redis hybrid fails', async () => {
    process.env.SEARCH_ENGINE = 'redis_hybrid';
    process.env.SEARCH_FALLBACK_TO_POSTGRES = 'true';

    const result = await smartSearch('test query');

    expect(result.meta.searchEngine).toBe('postgres');
    expect(result.meta.total).toBe(0);
  });
});

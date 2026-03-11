import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../lib/redisSearch', async () => {
  const actual = await vi.importActual<typeof import('../lib/redisSearch')>('../lib/redisSearch');
  return {
    ...actual,
    ensureProductIndexDetailed: vi.fn().mockResolvedValue({
      ok: false,
      reasonCode: 'redis_unavailable',
      reason: 'No Redis',
    }),
  };
});

import { reindexAllProducts } from '../services/searchIndexing.service';

describe('Search indexing', () => {
  const originalEngine = process.env.SEARCH_ENGINE;

  afterEach(() => {
    process.env.SEARCH_ENGINE = originalEngine;
  });

  it('should throw when Redis index is not ready', async () => {
    process.env.SEARCH_ENGINE = 'redis_hybrid';
    await expect(reindexAllProducts()).rejects.toThrow(/redis_unavailable.*No Redis/);
  });
});

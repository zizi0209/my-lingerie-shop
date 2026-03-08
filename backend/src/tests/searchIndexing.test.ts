import { describe, it, expect, vi } from 'vitest';

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
  it('should throw when Redis index is not ready', async () => {
    await expect(reindexAllProducts()).rejects.toThrow(/redis_unavailable.*No Redis/);
  });
});

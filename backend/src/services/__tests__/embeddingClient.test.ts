import { afterEach, describe, expect, it, vi } from 'vitest';
import { embedTextsDetailed } from '../embeddingClient';

const mockFetch = (payload: unknown, ok = true) =>
  vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  });

describe('embeddingClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.EMBEDDING_PROVIDER;
  });

  it('trả về embeddings khi response hợp lệ', async () => {
    process.env.EMBEDDING_PROVIDER = 'worker';
    vi.stubGlobal('fetch', mockFetch({ embeddings: [[0.1, 0.2]], dimension: 2, model: 'x' }));
    const result = await embedTextsDetailed(['ao lot']);
    expect(result.embeddings).toEqual([[0.1, 0.2]]);
    expect(result.status).toBe('ok');
  });

  it('trả về rỗng khi response lỗi', async () => {
    process.env.EMBEDDING_PROVIDER = 'worker';
    vi.stubGlobal('fetch', mockFetch({}, false));
    const result = await embedTextsDetailed(['ao lot']);
    expect(result.embeddings).toEqual([]);
    expect(result.status).toBe('unavailable');
  });
});

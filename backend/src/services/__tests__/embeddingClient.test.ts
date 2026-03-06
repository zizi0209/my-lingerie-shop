import { afterEach, describe, expect, it, vi } from 'vitest';
import { embedTexts } from '../embeddingClient';

const mockFetch = (payload: unknown, ok = true) =>
  vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => payload,
  });

describe('embeddingClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('trả về embeddings khi response hợp lệ', async () => {
    vi.stubGlobal('fetch', mockFetch({ embeddings: [[0.1, 0.2]], dimension: 2, model: 'x' }));
    const result = await embedTexts(['ao lot']);
    expect(result).toEqual([[0.1, 0.2]]);
  });

  it('trả về rỗng khi response lỗi', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false));
    const result = await embedTexts(['ao lot']);
    expect(result).toEqual([]);
  });
});

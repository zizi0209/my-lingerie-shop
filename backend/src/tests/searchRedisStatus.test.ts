import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/redis', () => ({
  ensureRedisReady: vi.fn().mockResolvedValue(null),
  getRedisDiagnostics: vi.fn().mockReturnValue({
    urlMasked: 'redis://***',
    host: 'localhost',
    port: 6379,
    runtimeHint: 'Chỉ hợp lệ khi backend chạy local cùng máy với Redis hoặc Redis được map port. Nếu backend chạy Docker, dùng redis://redis:6379.',
    status: null,
    lastError: 'connection failed',
    readySince: null,
    reconnectAttempts: 2,
  }),
}));

import { getIndexStatus } from '../lib/redisSearch';

describe('RedisSearch index status', () => {
  it('should return redis_unavailable with diagnostics when Redis is down', async () => {
    const status = await getIndexStatus();

    expect(status.status).toBe('redis_unavailable');
    expect(status.reasonCode).toBe('redis_unavailable');
    expect(status.diagnostics?.status).toBeNull();
    expect(status.diagnostics?.host).toBe('localhost');
    expect(status.diagnostics?.port).toBe(6379);
  });
});

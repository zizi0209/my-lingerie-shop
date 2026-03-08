 /**
  * Redis Client Singleton
  * Shared Redis connection for all services
  */
 
import Redis from 'ioredis';

export interface RedisDiagnostics {
  urlMasked: string;
  host: string | null;
  port: number | null;
  runtimeHint: string | null;
  status: string | null;
  lastError: string | null;
  readySince: number | null;
  reconnectAttempts: number;
}

let redis: Redis | null = null;
let isConnected = false;
let connectPromise: Promise<Redis | null> | null = null;
let lastError: string | null = null;
let readySince: number | null = null;
let reconnectAttempts = 0;

const ACTIVE_STATUSES = new Set(['connecting', 'connect', 'ready', 'reconnecting']);
const CLOSED_STATUSES = new Set(['end', 'close']);

const getRedisUrl = () => process.env.REDIS_URL || 'redis://localhost:6379';

const getRedisEndpointInfo = (): { host: string | null; port: number | null; runtimeHint: string | null } => {
  const urlValue = getRedisUrl();
  try {
    const url = new URL(urlValue);
    const host = url.hostname || null;
    const port = url.port ? Number(url.port) : null;
    const normalizedHost = host?.toLowerCase() ?? '';
    let runtimeHint: string | null = null;

    if (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
      runtimeHint =
        'Chỉ hợp lệ khi backend chạy local cùng máy với Redis hoặc Redis được map port. Nếu backend chạy Docker, dùng redis://redis:6379.';
    } else if (normalizedHost === 'redis') {
      runtimeHint =
        'Chỉ hợp lệ khi backend chạy trong Docker network. Nếu backend chạy local, dùng redis://localhost:6379.';
    }

    return {
      host,
      port: port !== null && Number.isFinite(port) ? port : null,
      runtimeHint,
    };
  } catch {
    return { host: null, port: null, runtimeHint: null };
  }
};

const maskRedisUrl = (value: string): string => {
  try {
    const url = new URL(value);
    if (url.password) {
      url.password = '***';
    }
    return url.toString();
  } catch {
    return 'invalid';
  }
};

const createRedisClient = (): Redis => {
  const client = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 10000,
    retryStrategy: (times) => {
      reconnectAttempts = times;
      if (times > 8) return null;
      return Math.min(times * 250, 2000);
    },
  });

  client.on('error', (err) => {
    console.warn('[Redis] Connection error:', err.message);
    isConnected = false;
    lastError = err.message;
  });

  client.on('connect', () => {
    console.log('[Redis] Connected successfully');
    isConnected = true;
    lastError = null;
  });

  client.on('ready', () => {
    console.log('[Redis] Ready');
    isConnected = true;
    lastError = null;
    readySince = Date.now();
  });

  client.on('close', () => {
    console.log('[Redis] Connection closed');
    isConnected = false;
  });

  client.on('end', () => {
    console.log('[Redis] Connection ended');
    isConnected = false;
  });

  return client;
};

const connectRedisClient = async (client: Redis): Promise<Redis | null> => {
  if (client.status === 'ready') return client;

  try {
    await client.connect();
    return client;
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Redis connect failed';
    return null;
  }
};

const waitForReady = (client: Redis, timeoutMs: number): Promise<Redis | null> =>
  new Promise((resolve) => {
    if (client.status === 'ready') {
      resolve(client);
      return;
    }

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutId);
      client.off('ready', onReady);
      client.off('end', onEnd);
      client.off('close', onEnd);
      client.off('error', onError);
    };

    const onReady = () => {
      cleanup();
      resolve(client);
    };

    const onEnd = () => {
      cleanup();
      resolve(null);
    };

    const onError = (error?: Error) => {
      cleanup();
      if (error) {
        lastError = error.message;
      }
      resolve(null);
    };

    client.once('ready', onReady);
    client.once('end', onEnd);
    client.once('close', onEnd);
    client.once('error', onError);
  });
 
 export function getRedisClient(): Redis | null {
  if (redis) {
    if (ACTIVE_STATUSES.has(redis.status)) {
      return redis;
    }

    if (CLOSED_STATUSES.has(redis.status)) {
      try {
        redis.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      redis = null;
      isConnected = false;
    } else {
      return redis;
    }
  }
 
  try {
    redis = createRedisClient();
    connectPromise = connectRedisClient(redis).finally(() => {
      connectPromise = null;
    });
    return redis;
  } catch {
    console.warn('[Redis] Initialization failed');
    return null;
  }
 }

export async function ensureRedisReady(): Promise<Redis | null> {
  let client = getRedisClient();
  if (!client) return null;

  if (CLOSED_STATUSES.has(client.status)) {
    try {
      client.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    redis = null;
    isConnected = false;
    client = getRedisClient();
    if (!client) return null;
  }

  if (client.status === 'ready') {
    try {
      await client.ping();
      return client;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Redis ping failed';
      isConnected = false;
    }
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      await connectRedisClient(client);
      return waitForReady(client, 8000);
    })().finally(() => {
      connectPromise = null;
    });
  }

  const connected = await connectPromise;
  if (!connected) return null;
  try {
    await connected.ping();
    return connected;
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'Redis ping failed';
    isConnected = false;
    return null;
  }
}
 
 export function isRedisConnected(): boolean {
  return isConnected && redis !== null && redis.status === 'ready';
 }

export function getRedisDiagnostics(): RedisDiagnostics {
  const status = redis ? redis.status : null;
  const endpointInfo = getRedisEndpointInfo();
  return {
    urlMasked: maskRedisUrl(getRedisUrl()),
    host: endpointInfo.host,
    port: endpointInfo.port,
    runtimeHint: endpointInfo.runtimeHint,
    status,
    lastError,
    readySince,
    reconnectAttempts,
  };
}
 
 export async function safeRedisGet(key: string): Promise<string | null> {
   const client = getRedisClient();
   if (!client || !isConnected) return null;
   try {
     return await client.get(key);
   } catch {
     return null;
   }
 }
 
 export async function safeRedisSetex(key: string, ttl: number, value: string): Promise<void> {
   const client = getRedisClient();
   if (!client || !isConnected) return;
   try {
     await client.setex(key, ttl, value);
   } catch {
     // Ignore cache write errors
   }
 }
 
 export async function safeRedisDel(key: string): Promise<void> {
   const client = getRedisClient();
   if (!client || !isConnected) return;
   try {
     await client.del(key);
   } catch {
     // Ignore cache delete errors
   }
 }
 
 export async function safeRedisKeys(pattern: string): Promise<string[]> {
   const client = getRedisClient();
   if (!client || !isConnected) return [];
   try {
     return await client.keys(pattern);
   } catch {
     return [];
   }
 }

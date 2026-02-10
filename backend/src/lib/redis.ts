 /**
  * Redis Client Singleton
  * Shared Redis connection for all services
  */
 
 import Redis from 'ioredis';
 
 let redis: Redis | null = null;
 let isConnected = false;
 
 export function getRedisClient(): Redis | null {
   if (redis) return redis;
 
   try {
     redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
       maxRetriesPerRequest: 3,
       enableReadyCheck: true,
       lazyConnect: true,
      connectTimeout: 10000,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
     });
 
     redis.on('error', (err) => {
       console.warn('[Redis] Connection error:', err.message);
       isConnected = false;
     });
 
     redis.on('connect', () => {
       console.log('[Redis] Connected successfully');
       isConnected = true;
     });
 
     redis.on('close', () => {
       console.log('[Redis] Connection closed');
       isConnected = false;
     });
 
     redis.connect().catch(() => {
       isConnected = false;
     });
 
     return redis;
  } catch {
     console.warn('[Redis] Initialization failed');
     return null;
   }
 }
 
 export function isRedisConnected(): boolean {
   return isConnected && redis !== null;
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

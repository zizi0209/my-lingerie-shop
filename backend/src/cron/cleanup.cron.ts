 /**
  * Cleanup Cronjob Runner
  * Scheduled database cleanup using Redis for distributed locking
  */
 
 import { cleanupService, CleanupSummary } from '../services/cleanup.service';
 import { getRedisClient, isRedisConnected } from '../lib/redis';
 
 const LOCK_KEY = 'cleanup:lock';
 const LOCK_TTL = 3600; // 1 hour max lock time
 const LAST_RUN_KEY = 'cleanup:last_run';
 
 // Cleanup intervals (in milliseconds)
 const CLEANUP_INTERVALS = {
   FULL: 24 * 60 * 60 * 1000, // 24 hours
   LIGHT: 60 * 60 * 1000, // 1 hour
 };
 
 let fullCleanupTimer: NodeJS.Timeout | null = null;
 let lightCleanupTimer: NodeJS.Timeout | null = null;
 
 /**
  * Acquire distributed lock using Redis
  */
 async function acquireLock(lockName: string): Promise<boolean> {
   if (!isRedisConnected()) {
     // If Redis is not available, proceed without locking (single instance assumption)
     console.log('[Cleanup] Redis not available, proceeding without distributed lock');
     return true;
   }
 
   const redis = getRedisClient();
   if (!redis) return true;
 
   try {
     const lockKey = `${LOCK_KEY}:${lockName}`;
     const result = await redis.set(lockKey, Date.now().toString(), 'EX', LOCK_TTL, 'NX');
     return result === 'OK';
   } catch (error) {
     console.warn('[Cleanup] Failed to acquire lock, proceeding anyway');
     return true;
   }
 }
 
 /**
  * Release distributed lock
  */
 async function releaseLock(lockName: string): Promise<void> {
   if (!isRedisConnected()) return;
 
   const redis = getRedisClient();
   if (!redis) return;
 
   try {
     await redis.del(`${LOCK_KEY}:${lockName}`);
   } catch (error) {
     console.warn('[Cleanup] Failed to release lock');
   }
 }
 
 /**
  * Save last run timestamp
  */
 async function saveLastRun(cleanupType: string, summary: CleanupSummary): Promise<void> {
   if (!isRedisConnected()) return;
 
   const redis = getRedisClient();
   if (!redis) return;
 
   try {
     await redis.hset(`${LAST_RUN_KEY}:${cleanupType}`, {
       timestamp: summary.completedAt.toISOString(),
       totalDeleted: summary.totalDeleted.toString(),
       duration: summary.totalDuration.toString(),
       errors: summary.errors.length.toString(),
     });
     // Keep last run info for 7 days
     await redis.expire(`${LAST_RUN_KEY}:${cleanupType}`, 7 * 24 * 60 * 60);
   } catch (error) {
     // Ignore save errors
   }
 }
 
 /**
  * Get last run info
  */
 async function getLastRun(cleanupType: string): Promise<Record<string, string> | null> {
   if (!isRedisConnected()) return null;
 
   const redis = getRedisClient();
   if (!redis) return null;
 
   try {
     const data = await redis.hgetall(`${LAST_RUN_KEY}:${cleanupType}`);
     return Object.keys(data).length > 0 ? data : null;
   } catch (error) {
     return null;
   }
 }
 
 /**
  * Run full cleanup with distributed locking
  */
 async function runFullCleanup(): Promise<CleanupSummary | null> {
   const lockName = 'full';
   const acquired = await acquireLock(lockName);
 
   if (!acquired) {
     console.log('[Cleanup] Full cleanup already running on another instance');
     return null;
   }
 
   try {
     const summary = await cleanupService.runFullCleanup();
     await saveLastRun('full', summary);
     return summary;
   } finally {
     await releaseLock(lockName);
   }
 }
 
 /**
  * Run light cleanup with distributed locking
  */
 async function runLightCleanup(): Promise<CleanupSummary | null> {
   const lockName = 'light';
   const acquired = await acquireLock(lockName);
 
   if (!acquired) {
     console.log('[Cleanup] Light cleanup already running on another instance');
     return null;
   }
 
   try {
     const summary = await cleanupService.runLightCleanup();
     await saveLastRun('light', summary);
     return summary;
   } finally {
     await releaseLock(lockName);
   }
 }
 
 /**
  * Start cleanup cron jobs
  */
 export function startCleanupCron(): void {
   console.log('[Cleanup] Starting cleanup cron jobs...');
 
   // Run initial light cleanup after 1 minute
   setTimeout(() => {
     runLightCleanup().catch(console.error);
   }, 60 * 1000);
 
   // Run initial full cleanup after 5 minutes
   setTimeout(() => {
     runFullCleanup().catch(console.error);
   }, 5 * 60 * 1000);
 
   // Schedule recurring light cleanup (every hour)
   lightCleanupTimer = setInterval(() => {
     runLightCleanup().catch(console.error);
   }, CLEANUP_INTERVALS.LIGHT);
 
   // Schedule recurring full cleanup (every 24 hours)
   fullCleanupTimer = setInterval(() => {
     runFullCleanup().catch(console.error);
   }, CLEANUP_INTERVALS.FULL);
 
   console.log('[Cleanup] Cron jobs started:');
   console.log('  - Light cleanup: every 1 hour');
   console.log('  - Full cleanup: every 24 hours');
 }
 
 /**
  * Stop cleanup cron jobs
  */
 export function stopCleanupCron(): void {
   if (lightCleanupTimer) {
     clearInterval(lightCleanupTimer);
     lightCleanupTimer = null;
   }
   if (fullCleanupTimer) {
     clearInterval(fullCleanupTimer);
     fullCleanupTimer = null;
   }
   console.log('[Cleanup] Cron jobs stopped');
 }
 
 /**
  * Get cleanup status
  */
 export async function getCleanupStatus(): Promise<{
   lightCleanup: Record<string, string> | null;
   fullCleanup: Record<string, string> | null;
   isRunning: boolean;
 }> {
   const lightCleanup = await getLastRun('light');
   const fullCleanup = await getLastRun('full');
 
   return {
     lightCleanup,
     fullCleanup,
     isRunning: lightCleanupTimer !== null || fullCleanupTimer !== null,
   };
 }
 
 // Export for manual trigger
 export { runFullCleanup, runLightCleanup };

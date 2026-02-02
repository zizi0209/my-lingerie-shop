 /**
  * Database Cleanup Service
  * Automated cleanup of outdated/unused data to reduce DB load
  * Best practices for e-commerce data retention
  */
 
 import { PrismaClient } from '@prisma/client';
 import { getRedisClient, isRedisConnected } from '../lib/redis';
 
 const prisma = new PrismaClient();
 
 // Cleanup configuration (days)
 const CLEANUP_CONFIG = {
   // Token cleanup
   EXPIRED_REFRESH_TOKENS_DAYS: 0, // Immediate (already expired)
   EXPIRED_VERIFICATION_TOKENS_DAYS: 0,
   EXPIRED_PASSWORD_RESET_TOKENS_DAYS: 0,
   EXPIRED_PASSWORD_SETUP_TOKENS_DAYS: 0,
   EXPIRED_ADMIN_INVITATIONS_DAYS: 0,
   EXPIRED_SESSIONS_DAYS: 0,
 
   // Soft-deleted items
   SOFT_DELETED_USERS_DAYS: 90, // 90 days after soft delete
   SOFT_DELETED_POSTS_DAYS: 30, // 30 days after soft delete
   SOFT_DELETED_CATEGORIES_DAYS: 30,
   SOFT_DELETED_PRODUCTS_DAYS: 30,
   SOFT_DELETED_POST_CATEGORIES_DAYS: 30,
 
   // Vouchers/Coupons
   EXPIRED_COUPONS_DAYS: 90, // 90 days after expiration
   EXPIRED_USER_COUPONS_DAYS: 30, // 30 days after expiration
   
   // Inactive users (no login + no orders)
   INACTIVE_USER_DAYS: 365, // 1 year inactive
 
   // Cart cleanup
   ABANDONED_GUEST_CARTS_DAYS: 30, // Guest carts older than 30 days
   EXPIRED_CARTS_DAYS: 0, // Carts past expiresAt
 
   // Analytics data (high volume tables)
   PAGE_VIEWS_DAYS: 90, // Keep 90 days
   PRODUCT_VIEWS_DAYS: 90,
   SEARCH_LOGS_DAYS: 90,
   CART_EVENTS_DAYS: 90,
   RECOMMENDATION_CLICKS_DAYS: 90,
 
   // Audit logs (compliance - keep longer)
   AUDIT_LOGS_DAYS: 730, // 2 years for compliance
 
   // Newsletter
   UNVERIFIED_NEWSLETTER_DAYS: 7, // Unverified after 7 days
 };
 
 export interface CleanupResult {
   task: string;
   deletedCount: number;
   duration: number;
   error?: string;
 }
 
 export interface CleanupSummary {
   startedAt: Date;
   completedAt: Date;
   totalDuration: number;
   totalDeleted: number;
   results: CleanupResult[];
   errors: string[];
 }
 
 class CleanupService {
   private getDateBefore(days: number): Date {
     const date = new Date();
     date.setDate(date.getDate() - days);
     return date;
   }
 
   /**
    * Cleanup expired refresh tokens
    */
   async cleanupExpiredRefreshTokens(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const result = await prisma.refreshToken.deleteMany({
         where: {
           OR: [
             { expiresAt: { lt: new Date() } },
             { revokedAt: { not: null } },
           ],
         },
       });
       return { task: 'ExpiredRefreshTokens', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredRefreshTokens', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired verification tokens
    */
   async cleanupExpiredVerificationTokens(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const result = await prisma.verificationToken.deleteMany({
         where: { expires: { lt: new Date() } },
       });
       return { task: 'ExpiredVerificationTokens', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredVerificationTokens', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired password reset tokens
    */
   async cleanupExpiredPasswordResetTokens(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const result = await prisma.passwordResetToken.deleteMany({
         where: {
           OR: [
             { expires: { lt: new Date() } },
             { usedAt: { not: null } },
           ],
         },
       });
       return { task: 'ExpiredPasswordResetTokens', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredPasswordResetTokens', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired password setup tokens
    */
   async cleanupExpiredPasswordSetupTokens(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const result = await prisma.passwordSetupToken.deleteMany({
         where: {
           OR: [
             { expiresAt: { lt: new Date() } },
             { usedAt: { not: null } },
           ],
         },
       });
       return { task: 'ExpiredPasswordSetupTokens', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredPasswordSetupTokens', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired admin invitations
    */
   async cleanupExpiredAdminInvitations(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const result = await prisma.adminInvitation.deleteMany({
         where: {
           OR: [
             { expiresAt: { lt: new Date() } },
             { usedAt: { not: null } },
           ],
         },
       });
       return { task: 'ExpiredAdminInvitations', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredAdminInvitations', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired sessions
    */
   async cleanupExpiredSessions(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const result = await prisma.session.deleteMany({
         where: { expires: { lt: new Date() } },
       });
       return { task: 'ExpiredSessions', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredSessions', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup soft-deleted users after retention period
    */
   async cleanupSoftDeletedUsers(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_USERS_DAYS);
       const result = await prisma.user.deleteMany({
         where: {
           deletedAt: { lt: cutoffDate },
         },
       });
       return { task: 'SoftDeletedUsers', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'SoftDeletedUsers', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup soft-deleted posts after retention period
    */
   async cleanupSoftDeletedPosts(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_POSTS_DAYS);
       const result = await prisma.post.deleteMany({
         where: {
           deletedAt: { lt: cutoffDate },
         },
       });
       return { task: 'SoftDeletedPosts', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'SoftDeletedPosts', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup soft-deleted categories after retention period
    */
   async cleanupSoftDeletedCategories(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_CATEGORIES_DAYS);
       const result = await prisma.category.deleteMany({
         where: {
           deletedAt: { lt: cutoffDate },
         },
       });
       return { task: 'SoftDeletedCategories', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'SoftDeletedCategories', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup soft-deleted products after retention period
    */
   async cleanupSoftDeletedProducts(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_PRODUCTS_DAYS);
       const result = await prisma.product.deleteMany({
         where: {
           deletedAt: { lt: cutoffDate },
         },
       });
       return { task: 'SoftDeletedProducts', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'SoftDeletedProducts', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup soft-deleted post categories after retention period
    */
   async cleanupSoftDeletedPostCategories(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_POST_CATEGORIES_DAYS);
       const result = await prisma.postCategory.deleteMany({
         where: {
           deletedAt: { lt: cutoffDate },
         },
       });
       return { task: 'SoftDeletedPostCategories', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'SoftDeletedPostCategories', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired coupons (endDate passed + retention period)
    */
   async cleanupExpiredCoupons(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.EXPIRED_COUPONS_DAYS);
       const result = await prisma.coupon.deleteMany({
         where: {
           endDate: { lt: cutoffDate },
           isActive: false,
         },
       });
       return { task: 'ExpiredCoupons', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredCoupons', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired user coupons
    */
   async cleanupExpiredUserCoupons(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.EXPIRED_USER_COUPONS_DAYS);
       const result = await prisma.userCoupon.deleteMany({
         where: {
           OR: [
             { expiresAt: { lt: cutoffDate } },
             { status: 'USED', usedAt: { lt: cutoffDate } },
           ],
         },
       });
       return { task: 'ExpiredUserCoupons', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredUserCoupons', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup abandoned guest carts (no userId, old carts)
    */
   async cleanupAbandonedGuestCarts(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.ABANDONED_GUEST_CARTS_DAYS);
       
       // First delete cart items for guest carts
       await prisma.cartItem.deleteMany({
         where: {
           cart: {
             userId: null,
             updatedAt: { lt: cutoffDate },
           },
         },
       });
 
       // Then delete the guest carts
       const result = await prisma.cart.deleteMany({
         where: {
           userId: null,
           updatedAt: { lt: cutoffDate },
         },
       });
       return { task: 'AbandonedGuestCarts', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'AbandonedGuestCarts', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup expired carts (past expiresAt)
    */
   async cleanupExpiredCarts(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       // First delete cart items for expired carts
       await prisma.cartItem.deleteMany({
         where: {
           cart: {
             expiresAt: { lt: new Date() },
           },
         },
       });
 
       // Then delete expired carts
       const result = await prisma.cart.deleteMany({
         where: {
           expiresAt: { lt: new Date() },
         },
       });
       return { task: 'ExpiredCarts', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'ExpiredCarts', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup old page views
    */
   async cleanupOldPageViews(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.PAGE_VIEWS_DAYS);
       const result = await prisma.pageView.deleteMany({
         where: { createdAt: { lt: cutoffDate } },
       });
       return { task: 'OldPageViews', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'OldPageViews', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup old product views
    */
   async cleanupOldProductViews(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.PRODUCT_VIEWS_DAYS);
       const result = await prisma.productView.deleteMany({
         where: { createdAt: { lt: cutoffDate } },
       });
       return { task: 'OldProductViews', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'OldProductViews', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup old search logs
    */
   async cleanupOldSearchLogs(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.SEARCH_LOGS_DAYS);
       const result = await prisma.searchLog.deleteMany({
         where: { createdAt: { lt: cutoffDate } },
       });
       return { task: 'OldSearchLogs', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'OldSearchLogs', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup old cart events
    */
   async cleanupOldCartEvents(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.CART_EVENTS_DAYS);
       const result = await prisma.cartEvent.deleteMany({
         where: { createdAt: { lt: cutoffDate } },
       });
       return { task: 'OldCartEvents', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'OldCartEvents', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup old recommendation clicks
    */
   async cleanupOldRecommendationClicks(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.RECOMMENDATION_CLICKS_DAYS);
       const result = await prisma.recommendationClick.deleteMany({
         where: { createdAt: { lt: cutoffDate } },
       });
       return { task: 'OldRecommendationClicks', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'OldRecommendationClicks', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup old audit logs (keep for compliance)
    */
   async cleanupOldAuditLogs(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.AUDIT_LOGS_DAYS);
       const result = await prisma.auditLog.deleteMany({
         where: { createdAt: { lt: cutoffDate } },
       });
       return { task: 'OldAuditLogs', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'OldAuditLogs', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup unverified newsletter subscribers
    */
   async cleanupUnverifiedNewsletterSubscribers(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(CLEANUP_CONFIG.UNVERIFIED_NEWSLETTER_DAYS);
       const result = await prisma.newsletterSubscriber.deleteMany({
         where: {
           isVerified: false,
           subscribedAt: { lt: cutoffDate },
         },
       });
       return { task: 'UnverifiedNewsletterSubscribers', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'UnverifiedNewsletterSubscribers', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup old sister size recommendations
    */
   async cleanupOldSisterSizeRecommendations(): Promise<CleanupResult> {
     const start = Date.now();
     try {
       const cutoffDate = this.getDateBefore(90); // 90 days
       const result = await prisma.sisterSizeRecommendation.deleteMany({
         where: { createdAt: { lt: cutoffDate } },
       });
       return { task: 'OldSisterSizeRecommendations', deletedCount: result.count, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'OldSisterSizeRecommendations', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Cleanup stale Redis cache keys
    */
   async cleanupRedisCache(): Promise<CleanupResult> {
     const start = Date.now();
     if (!isRedisConnected()) {
       return { task: 'RedisCache', deletedCount: 0, duration: Date.now() - start, error: 'Redis not connected' };
     }
 
     try {
       const redis = getRedisClient();
       if (!redis) {
         return { task: 'RedisCache', deletedCount: 0, duration: Date.now() - start, error: 'Redis client unavailable' };
       }
 
       // Clean up specific cache patterns that might be stale
       const patterns = [
         'product-sizes:*',
         'size-conversion:*',
         'conversion-matrix:*',
         'sister-sizes:*',
         'cup-conversion:*',
         'brand-fit:*',
       ];
 
       let totalDeleted = 0;
       for (const pattern of patterns) {
         const keys = await redis.keys(pattern);
         for (const key of keys) {
           const ttl = await redis.ttl(key);
           // Delete keys with no TTL (should have TTL) or very old keys
           if (ttl === -1) {
             await redis.del(key);
             totalDeleted++;
           }
         }
       }
 
       return { task: 'RedisCache', deletedCount: totalDeleted, duration: Date.now() - start };
     } catch (error: any) {
       return { task: 'RedisCache', deletedCount: 0, duration: Date.now() - start, error: error.message };
     }
   }
 
   /**
    * Run all cleanup tasks
    */
   async runFullCleanup(): Promise<CleanupSummary> {
     const startedAt = new Date();
     const results: CleanupResult[] = [];
     const errors: string[] = [];
 
     console.log('[Cleanup] Starting full database cleanup...');
 
     // Run cleanup tasks in order of priority
     const tasks = [
       // Critical: Token cleanup (security)
       () => this.cleanupExpiredRefreshTokens(),
       () => this.cleanupExpiredVerificationTokens(),
       () => this.cleanupExpiredPasswordResetTokens(),
       () => this.cleanupExpiredPasswordSetupTokens(),
       () => this.cleanupExpiredAdminInvitations(),
       () => this.cleanupExpiredSessions(),
 
       // Soft-deleted items
       () => this.cleanupSoftDeletedPosts(),
       () => this.cleanupSoftDeletedPostCategories(),
       () => this.cleanupSoftDeletedCategories(),
       () => this.cleanupSoftDeletedProducts(),
       () => this.cleanupSoftDeletedUsers(),
 
       // Coupons
       () => this.cleanupExpiredUserCoupons(),
       () => this.cleanupExpiredCoupons(),
 
       // Carts
       () => this.cleanupExpiredCarts(),
       () => this.cleanupAbandonedGuestCarts(),
 
       // Analytics (high volume)
       () => this.cleanupOldPageViews(),
       () => this.cleanupOldProductViews(),
       () => this.cleanupOldSearchLogs(),
       () => this.cleanupOldCartEvents(),
       () => this.cleanupOldRecommendationClicks(),
       () => this.cleanupOldSisterSizeRecommendations(),
 
       // Audit logs (compliance)
       () => this.cleanupOldAuditLogs(),
 
       // Newsletter
       () => this.cleanupUnverifiedNewsletterSubscribers(),
 
       // Redis cache
       () => this.cleanupRedisCache(),
     ];
 
     for (const task of tasks) {
       const result = await task();
       results.push(result);
       if (result.error) {
         errors.push(`${result.task}: ${result.error}`);
       }
       if (result.deletedCount > 0) {
         console.log(`[Cleanup] ${result.task}: Deleted ${result.deletedCount} records (${result.duration}ms)`);
       }
     }
 
     const completedAt = new Date();
     const totalDuration = completedAt.getTime() - startedAt.getTime();
     const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
 
     console.log(`[Cleanup] Completed. Total deleted: ${totalDeleted} records in ${totalDuration}ms`);
     if (errors.length > 0) {
       console.warn(`[Cleanup] Errors: ${errors.join(', ')}`);
     }
 
     return {
       startedAt,
       completedAt,
       totalDuration,
       totalDeleted,
       results,
       errors,
     };
   }
 
   /**
    * Run lightweight cleanup (tokens and carts only)
    * Can be run more frequently
    */
   async runLightCleanup(): Promise<CleanupSummary> {
     const startedAt = new Date();
     const results: CleanupResult[] = [];
     const errors: string[] = [];
 
     console.log('[Cleanup] Starting light cleanup...');
 
     const tasks = [
       () => this.cleanupExpiredRefreshTokens(),
       () => this.cleanupExpiredVerificationTokens(),
       () => this.cleanupExpiredPasswordResetTokens(),
       () => this.cleanupExpiredSessions(),
       () => this.cleanupExpiredCarts(),
     ];
 
     for (const task of tasks) {
       const result = await task();
       results.push(result);
       if (result.error) {
         errors.push(`${result.task}: ${result.error}`);
       }
     }
 
     const completedAt = new Date();
     const totalDuration = completedAt.getTime() - startedAt.getTime();
     const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
 
     console.log(`[Cleanup] Light cleanup completed. Total deleted: ${totalDeleted} records in ${totalDuration}ms`);
 
     return {
       startedAt,
       completedAt,
       totalDuration,
       totalDeleted,
       results,
       errors,
     };
   }
 }
 
 export const cleanupService = new CleanupService();
 export { CLEANUP_CONFIG };

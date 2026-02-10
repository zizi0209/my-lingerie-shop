 /**
  * Cleanup Routes
  * Admin endpoints for managing database cleanup
  */
 
 import { Router, Request, Response } from 'express';
import { CLEANUP_CONFIG } from '../services/cleanup.service';
 import {
   runFullCleanup,
   runLightCleanup,
   getCleanupStatus,
 } from '../cron/cleanup.cron';
 
 const router = Router();
 
 /**
  * GET /api/admin/cleanup/status
  * Get cleanup job status
  */
 router.get('/status', async (req: Request, res: Response) => {
   try {
     const status = await getCleanupStatus();
     res.json({
       success: true,
       data: {
         ...status,
         config: CLEANUP_CONFIG,
       },
     });
   } catch (error: any) {
     res.status(500).json({
       success: false,
       message: 'Failed to get cleanup status',
       error: error.message,
     });
   }
 });
 
 /**
  * POST /api/admin/cleanup/run/full
  * Manually trigger full cleanup
  */
 router.post('/run/full', async (req: Request, res: Response) => {
   try {
     console.log('[Cleanup] Manual full cleanup triggered by admin');
     const summary = await runFullCleanup();
     
     if (!summary) {
       return res.status(409).json({
         success: false,
         message: 'Cleanup is already running on another instance',
       });
     }
 
     res.json({
       success: true,
       message: 'Full cleanup completed',
       data: summary,
     });
   } catch (error: any) {
     res.status(500).json({
       success: false,
       message: 'Failed to run full cleanup',
       error: error.message,
     });
   }
 });
 
 /**
  * POST /api/admin/cleanup/run/light
  * Manually trigger light cleanup
  */
 router.post('/run/light', async (req: Request, res: Response) => {
   try {
     console.log('[Cleanup] Manual light cleanup triggered by admin');
     const summary = await runLightCleanup();
     
     if (!summary) {
       return res.status(409).json({
         success: false,
         message: 'Cleanup is already running on another instance',
       });
     }
 
     res.json({
       success: true,
       message: 'Light cleanup completed',
       data: summary,
     });
   } catch (error: any) {
     res.status(500).json({
       success: false,
       message: 'Failed to run light cleanup',
       error: error.message,
     });
   }
 });
 
 /**
  * GET /api/admin/cleanup/preview
  * Preview what would be deleted without actually deleting
  */
 router.get('/preview', async (req: Request, res: Response) => {
   try {
     const { PrismaClient } = await import('@prisma/client');
     const prisma = new PrismaClient();
 
     const now = new Date();
     const getDateBefore = (days: number) => {
       const date = new Date(now);
       date.setDate(date.getDate() - days);
       return date;
     };
 
     const preview = {
       expiredRefreshTokens: await prisma.refreshToken.count({
         where: {
           OR: [
             { expiresAt: { lt: now } },
             { revokedAt: { not: null } },
           ],
         },
       }),
       expiredVerificationTokens: await prisma.verificationToken.count({
         where: { expires: { lt: now } },
       }),
       expiredSessions: await prisma.session.count({
         where: { expires: { lt: now } },
       }),
       softDeletedPosts: await prisma.post.count({
         where: { deletedAt: { lt: getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_POSTS_DAYS) } },
       }),
       softDeletedProducts: await prisma.product.count({
         where: { deletedAt: { lt: getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_PRODUCTS_DAYS) } },
       }),
       softDeletedUsers: await prisma.user.count({
         where: { deletedAt: { lt: getDateBefore(CLEANUP_CONFIG.SOFT_DELETED_USERS_DAYS) } },
       }),
       expiredUserCoupons: await prisma.userCoupon.count({
         where: {
           OR: [
             { expiresAt: { lt: getDateBefore(CLEANUP_CONFIG.EXPIRED_USER_COUPONS_DAYS) } },
             { status: 'USED', usedAt: { lt: getDateBefore(CLEANUP_CONFIG.EXPIRED_USER_COUPONS_DAYS) } },
           ],
         },
       }),
       abandonedGuestCarts: await prisma.cart.count({
         where: {
           userId: null,
           updatedAt: { lt: getDateBefore(CLEANUP_CONFIG.ABANDONED_GUEST_CARTS_DAYS) },
         },
       }),
       oldPageViews: await prisma.pageView.count({
         where: { createdAt: { lt: getDateBefore(CLEANUP_CONFIG.PAGE_VIEWS_DAYS) } },
       }),
       oldProductViews: await prisma.productView.count({
         where: { createdAt: { lt: getDateBefore(CLEANUP_CONFIG.PRODUCT_VIEWS_DAYS) } },
       }),
       oldSearchLogs: await prisma.searchLog.count({
         where: { createdAt: { lt: getDateBefore(CLEANUP_CONFIG.SEARCH_LOGS_DAYS) } },
       }),
       oldAuditLogs: await prisma.auditLog.count({
         where: { createdAt: { lt: getDateBefore(CLEANUP_CONFIG.AUDIT_LOGS_DAYS) } },
       }),
       unverifiedNewsletterSubscribers: await prisma.newsletterSubscriber.count({
         where: {
           isVerified: false,
           subscribedAt: { lt: getDateBefore(CLEANUP_CONFIG.UNVERIFIED_NEWSLETTER_DAYS) },
         },
       }),
     };
 
     await prisma.$disconnect();
 
     const totalToDelete = Object.values(preview).reduce((sum, count) => sum + count, 0);
 
     res.json({
       success: true,
       data: {
         preview,
         totalToDelete,
         config: CLEANUP_CONFIG,
       },
     });
   } catch (error: any) {
     res.status(500).json({
       success: false,
       message: 'Failed to generate cleanup preview',
       error: error.message,
     });
   }
 });
 
 export default router;

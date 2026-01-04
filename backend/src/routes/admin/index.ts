import express from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import { adminApiLimiter } from '../../middleware/rateLimiter';

// Import admin sub-routes
import dashboardRoutes from './dashboard';
import usersRoutes from './users';
import auditLogsRoutes from './auditLogs';
import systemConfigRoutes from './systemConfig';
import reviewsRoutes from './reviews';

const router = express.Router();

// Apply middleware to ALL admin routes
router.use(adminApiLimiter); // Rate limiting
router.use(requireAdmin);     // Admin authentication & authorization

// Mount sub-routers
router.use('/dashboard', dashboardRoutes);
router.use('/users', usersRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/system-config', systemConfigRoutes);
router.use('/reviews', reviewsRoutes);

export default router;

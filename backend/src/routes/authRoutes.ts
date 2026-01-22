import express from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  verifyPassword,
  checkDashboardAuth,
  revokeDashboardAuth,
} from '../controllers/authController';
import { socialLogin } from '../controllers/socialAuthController';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public routes với rate limiting
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/social-login', socialLogin); // Social OAuth login
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes
router.post('/logout-all', authenticateToken, logoutAll);

// Dashboard auth routes (protected)
router.post('/verify-password', authenticateToken, verifyPassword);
router.get('/check-dashboard-auth', authenticateToken, checkDashboardAuth);
router.post('/revoke-dashboard-auth', authenticateToken, revokeDashboardAuth);

export default router;

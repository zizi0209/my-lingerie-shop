import express from 'express';
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public routes với rate limiting
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes
router.post('/logout-all', authenticateToken, logoutAll);

export default router;

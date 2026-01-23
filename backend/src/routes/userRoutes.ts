import express from 'express';
import {
  register,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/requireAdmin';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter';
import { upload } from '../config/multer';

const router = express.Router();

// Public routes with rate limiting
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

// Protected routes (require authentication)
router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), uploadAvatar);
router.put('/change-password', authenticateToken, changePassword);

// Admin only routes
router.get('/', requireAdmin, getAllUsers);
router.get('/:id', requireAdmin, getUserById);
router.put('/:id', requireAdmin, updateUser);
router.delete('/:id', requireAdmin, deleteUser);

export default router;

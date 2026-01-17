import express from 'express';
import {
  getAllAboutSections,
  getAboutSectionById,
  getAboutSectionByKey,
  updateAboutSection,
} from '../controllers/aboutSectionController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllAboutSections);
router.get('/key/:key', getAboutSectionByKey);
router.get('/:id', getAboutSectionById);

// Protected routes (admin only)
router.put('/:id', authenticateToken, isAdmin, updateAboutSection);

export default router;

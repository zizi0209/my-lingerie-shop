import express from 'express';
import {
  getAllPageSections,
  getPageSectionById,
  getPageSectionByCode,
  createPageSection,
  updatePageSection,
  deletePageSection,
} from '../controllers/pageSectionController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllPageSections);
router.get('/code/:code', getPageSectionByCode);
router.get('/:id', getPageSectionById);

// Protected routes (admin only)
router.post('/', authenticateToken, isAdmin, createPageSection);
router.put('/:id', authenticateToken, isAdmin, updatePageSection);
router.delete('/:id', authenticateToken, isAdmin, deletePageSection);

export default router;

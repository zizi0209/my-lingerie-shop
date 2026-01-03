import express from 'express';
import {
  getAllColors,
  getColorsWithProducts,
  getColorById,
  createColor,
  updateColor,
  deleteColor,
  reorderColors,
} from '../controllers/colorController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllColors);
router.get('/filter', getColorsWithProducts); // For product filter
router.get('/:id', getColorById);

// Protected routes (admin only)
router.post('/', authenticateToken, isAdmin, createColor);
router.put('/reorder', authenticateToken, isAdmin, reorderColors);
router.put('/:id', authenticateToken, isAdmin, updateColor);
router.delete('/:id', authenticateToken, isAdmin, deleteColor);

export default router;

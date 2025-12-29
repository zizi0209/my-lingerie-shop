import express from 'express';
import {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  cancelOrder,
} from '../controllers/orderController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes (authenticated users can create orders)
router.post('/', createOrder);

// Protected routes (authentication required)
router.get('/', authenticateToken, getAllOrders);
router.get('/:id', authenticateToken, getOrderById);
router.put('/:id', authenticateToken, updateOrder);
router.put('/:id/cancel', authenticateToken, cancelOrder);

export default router;

import express from 'express';
import {
  getAllOrders,
  getOrderById,
  getOrderByNumber,
  createOrder,
  updateOrder,
  cancelOrder,
} from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.post('/', createOrder);
router.get('/track/:orderNumber', getOrderByNumber); // Public tracking

// Protected routes (authentication required)
router.get('/', authenticateToken, getAllOrders);
router.get('/:id', authenticateToken, getOrderById);
router.put('/:id', authenticateToken, updateOrder);
router.put('/:id/cancel', authenticateToken, cancelOrder);

export default router;

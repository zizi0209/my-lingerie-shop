import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  removeCoupon,
} from '../controllers/cartController';

const router = express.Router();

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:id', updateCartItem);
router.delete('/items/:id', removeFromCart);
router.delete('/:id/clear', clearCart);

// Coupon routes
router.post('/:id/apply-coupon', applyCoupon);
router.delete('/:id/remove-coupon', removeCoupon);

export default router;

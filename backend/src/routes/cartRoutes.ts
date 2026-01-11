import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  // Legacy coupon (backward compatible)
  applyCoupon,
  removeCoupon,
  // New voucher stacking
  applyDiscountCoupon,
  applyShippingCoupon,
  removeDiscountCoupon,
  removeShippingCoupon,
  updatePointsUsage,
  calculateCartTotal,
  getAvailableVouchers,
} from '../controllers/cartController';

const router = express.Router();

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:id', updateCartItem);
router.delete('/items/:id', removeFromCart);
router.delete('/:id/clear', clearCart);

// Legacy coupon routes (backward compatible)
router.post('/:id/apply-coupon', applyCoupon);
router.delete('/:id/remove-coupon', removeCoupon);

// Voucher Stacking: Tam giác giảm giá
router.post('/:id/apply-discount', applyDiscountCoupon);      // Mã giảm giá đơn hàng
router.post('/:id/apply-shipping', applyShippingCoupon);      // Mã freeship/giảm ship
router.delete('/:id/remove-discount', removeDiscountCoupon);  // Gỡ mã giảm giá
router.delete('/:id/remove-shipping', removeShippingCoupon);  // Gỡ mã ship
router.put('/:id/use-points', updatePointsUsage);             // Cập nhật điểm sử dụng
router.post('/:id/calculate', calculateCartTotal);            // Tính tổng đơn hàng
router.get('/:id/available-vouchers', getAvailableVouchers);  // Lấy danh sách mã khả dụng

export default router;

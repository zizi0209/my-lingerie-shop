import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkInWishlist,
  toggleWishlist,
} from '../controllers/wishlistController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /wishlist - Lấy danh sách yêu thích
router.get('/', getWishlist);

// POST /wishlist - Thêm sản phẩm vào wishlist
router.post('/', addToWishlist);

// POST /wishlist/toggle - Toggle sản phẩm trong wishlist
router.post('/toggle', toggleWishlist);

// GET /wishlist/check/:productId - Kiểm tra sản phẩm có trong wishlist
router.get('/check/:productId', checkInWishlist);

// DELETE /wishlist/:productId - Xóa sản phẩm khỏi wishlist
router.delete('/:productId', removeFromWishlist);

export default router;

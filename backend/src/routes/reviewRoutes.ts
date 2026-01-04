import express from 'express';
import {
  getProductReviews,
  getProductReviewStats,
  voteHelpful,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  getPendingReviews
} from '../controllers/reviewController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = express.Router();

// =============================================
// PUBLIC ROUTES
// =============================================

// GET /reviews/product/:slug - Lấy reviews của sản phẩm
router.get('/product/:slug', getProductReviews);

// GET /reviews/product/:slug/stats - Thống kê reviews
router.get('/product/:slug/stats', getProductReviewStats);

// POST /reviews/:id/helpful - Vote hữu ích (có thể là guest)
router.post('/:id/helpful', optionalAuth, voteHelpful);

// =============================================
// USER ROUTES (Authenticated)
// =============================================

// GET /reviews/me - Reviews của user hiện tại
router.get('/me', authenticateToken, getMyReviews);

// GET /reviews/pending - Sản phẩm chờ đánh giá
router.get('/pending', authenticateToken, getPendingReviews);

// POST /reviews - Tạo review mới
router.post('/', authenticateToken, createReview);

// PUT /reviews/:id - Sửa review của mình
router.put('/:id', authenticateToken, updateReview);

// DELETE /reviews/:id - Xóa review của mình
router.delete('/:id', authenticateToken, deleteReview);

export default router;

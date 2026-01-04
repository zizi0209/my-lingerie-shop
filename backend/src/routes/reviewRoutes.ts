import express from 'express';
import {
  getProductReviews,
  getProductReviewStats,
  voteHelpful,
  createReview
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

// POST /reviews - Tạo review mới
router.post('/', authenticateToken, createReview);

export default router;

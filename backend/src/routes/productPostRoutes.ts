import express from 'express';
import {
  linkProductToPost,
  unlinkProductFromPost,
  getPostProducts,
  getProductPosts,
  batchLinkProducts,
} from '../controllers/productPostController';
import { authenticateToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/posts/:postId/products', getPostProducts); // Get products in a post
router.get('/products/:productId/posts', getProductPosts); // Get posts featuring a product

// Admin routes
router.post('/link', authenticateToken, isAdmin, linkProductToPost);
router.delete('/unlink/:postId/:productId', authenticateToken, isAdmin, unlinkProductFromPost);
router.post('/batch-link', authenticateToken, isAdmin, batchLinkProducts);

export default router;

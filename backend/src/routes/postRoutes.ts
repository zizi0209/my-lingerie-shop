import express from 'express';
import {
  getAllPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController';
import {
  toggleLike,
  toggleBookmark,
  getBookmarkedPosts,
  getPostInteractionStatus,
} from '../controllers/postInteractionController';
import { authenticateToken, optionalAuth } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllPosts);
router.get('/slug/:slug', getPostBySlug);

// User bookmarks (requires auth)
router.get('/me/bookmarks', authenticateToken, getBookmarkedPosts);

// Post interactions
router.get('/:postId/interaction', optionalAuth, getPostInteractionStatus);
router.post('/:postId/like', authenticateToken, toggleLike);
router.post('/:postId/bookmark', authenticateToken, toggleBookmark);

// Admin routes
router.get('/:id', getPostById);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

export default router;

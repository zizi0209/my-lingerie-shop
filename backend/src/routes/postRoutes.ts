import express from 'express';
import {
  getAllPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/postController';

const router = express.Router();

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.get('/slug/:slug', getPostBySlug);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);

export default router;

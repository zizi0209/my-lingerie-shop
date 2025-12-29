import express from 'express';
import {
  getAllPostCategories,
  getPostCategoryById,
  getPostCategoryBySlug,
  createPostCategory,
  updatePostCategory,
  deletePostCategory,
} from '../controllers/postCategoryController';

const router = express.Router();

router.get('/', getAllPostCategories);
router.get('/:id', getPostCategoryById);
router.get('/slug/:slug', getPostCategoryBySlug);
router.post('/', createPostCategory);
router.put('/:id', updatePostCategory);
router.delete('/:id', deletePostCategory);

export default router;

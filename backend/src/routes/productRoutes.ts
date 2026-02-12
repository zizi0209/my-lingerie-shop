import express from 'express';
import {
  getAllProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductImages,
  getProductImageById,
  updateProductImage,
  addProductImages,
  deleteProductImage,
  getAllProductVariants,
  getProductVariantById,
  addProductVariants,
  updateProductVariant,
  deleteProductVariant,
} from '../controllers/productController';
import { authenticateToken, isAdmin } from '../middleware/auth';
import {
  getProductProcessingStatus,
  triggerImageProcessing,
  retryImageProcessing,
  processSingleImage,
  checkTripoSrStatus,
} from '../controllers/imageProcessingController';

const router = express.Router();

// Public routes
router.get('/', getAllProducts);
router.get('/slug/:slug', getProductBySlug);
router.get('/:id', getProductById);

// Protected routes - Product CRUD (admin only)
router.post('/', authenticateToken, isAdmin, createProduct);
router.put('/:id', authenticateToken, isAdmin, updateProduct);
router.delete('/:id', authenticateToken, isAdmin, deleteProduct);

// Public routes - Product Images
router.get('/:id/images', getAllProductImages);
router.get('/images/:imageId', getProductImageById);

// Protected routes - Product Images (admin only)
router.post('/:id/images', authenticateToken, isAdmin, addProductImages);
router.put('/images/:imageId', authenticateToken, isAdmin, updateProductImage);
router.delete('/images/:imageId', authenticateToken, isAdmin, deleteProductImage);

// Image processing routes (admin only)
router.get('/:id/processing-status', authenticateToken, isAdmin, getProductProcessingStatus);
router.post('/:id/process-images', authenticateToken, isAdmin, triggerImageProcessing);
router.post('/:id/retry-processing', authenticateToken, isAdmin, retryImageProcessing);
router.post('/images/:imageId/process', authenticateToken, isAdmin, processSingleImage);
router.get('/processing/triposr-status', authenticateToken, isAdmin, checkTripoSrStatus);

// Public routes - Product Variants
router.get('/:id/variants', getAllProductVariants);
router.get('/variants/:variantId', getProductVariantById);

// Protected routes - Product Variants (admin only)
router.post('/:id/variants', authenticateToken, isAdmin, addProductVariants);
router.put('/variants/:variantId', authenticateToken, isAdmin, updateProductVariant);
router.delete('/variants/:variantId', authenticateToken, isAdmin, deleteProductVariant);

export default router;

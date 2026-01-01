import express from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  getMediaList,
  getMediaById,
  deleteMedia,
} from '../controllers/mediaController';
import { upload } from '../config/multer';
import { requireAdmin } from '../middleware/requireAdmin';
import { uploadLimiter } from '../middleware/rateLimiter';
import { 
  validateFileUpload, 
  validateMultipleFileUploads,
  processUploadedImage 
} from '../middleware/fileUploadSecurity';

const router = express.Router();

// Upload single image (alias for backward compatibility)
router.post(
  '/upload', 
  uploadLimiter,
  requireAdmin,
  upload.single('file'), 
  validateFileUpload,
  processUploadedImage,
  uploadImage
);

// Upload single image
router.post(
  '/single', 
  uploadLimiter,
  requireAdmin,
  upload.single('image'), 
  validateFileUpload,
  processUploadedImage,
  uploadImage
);

// Upload multiple images (max 10 files)
router.post(
  '/multiple', 
  uploadLimiter,
  requireAdmin,
  upload.array('images', 10), 
  validateMultipleFileUploads,
  uploadMultipleImages
);

// Get media list with pagination (admin only)
router.get('/', requireAdmin, getMediaList);

// Get media by ID (admin only)
router.get('/:id', requireAdmin, getMediaById);

// Delete media (admin only)
router.delete('/:id', requireAdmin, deleteMedia);

export default router;
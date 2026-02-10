import express from 'express';
import { 
  removeBackgroundFromImage,
  checkBackgroundRemovalStatus,
} from '../controllers/backgroundRemovalController';
import { upload } from '../config/multer';
import { requireAdmin } from '../middleware/requireAdmin';
import { uploadLimiter } from '../middleware/rateLimiter';
import { 
  validateFileUpload,
  processUploadedImage 
} from '../middleware/fileUploadSecurity';

const router = express.Router();

// Check if background removal is available
router.get('/status', requireAdmin, checkBackgroundRemovalStatus);

// Remove background from image
router.post(
  '/remove',
  uploadLimiter,
  requireAdmin,
  upload.single('image'),
  validateFileUpload,
  processUploadedImage,
  removeBackgroundFromImage
);

export default router;

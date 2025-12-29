import express from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  getMediaList,
  getMediaById,
  deleteMedia,
} from '../controllers/mediaController';
import { upload } from '../config/multer';

const router = express.Router();

// Upload single image (alias for backward compatibility)
router.post('/upload', upload.single('file'), uploadImage);

// Upload single image
router.post('/single', upload.single('image'), uploadImage);

// Upload multiple images (max 10 files)
router.post('/multiple', upload.array('images', 10), uploadMultipleImages);

// Get media list with pagination
router.get('/', getMediaList);

// Get media by ID
router.get('/:id', getMediaById);

// Delete media
router.delete('/:id', deleteMedia);

export default router;
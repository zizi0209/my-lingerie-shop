import express from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  getMediaList,
  deleteMedia,
  upload
} from '../controllers/mediaController';

const router = express.Router();

// Upload single image
router.post('/single', upload.single('image'), uploadImage);

// Upload multiple images (max 10 files)
router.post('/multiple', upload.array('images', 10), uploadMultipleImages);

// Get media list with pagination
router.get('/', getMediaList);

// Delete media
router.delete('/:id', deleteMedia);

export default router;
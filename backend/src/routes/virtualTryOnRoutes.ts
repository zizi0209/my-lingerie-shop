 import express from 'express';
import {
  tryOn,
  getStatus,
  resetHealth,
  getHealthStats,
  getJobStatus,
  createUploadUrl,
  createTryOnJobAsync,
  processTryOnJob,
  getTryOnMetrics,
  generateVideoFromExistingImage,
} from '../controllers/virtualTryOnController';
import { apiLimiter, tryOnLimiter } from '../middleware/rateLimiter';
import { requireVtonAdmin } from '../middleware/requireVtonAdmin';
 
 const router = express.Router();
 
 // Check provider availability
 router.get('/status', getStatus);
 
 // Process virtual try-on (with rate limiting)
router.post('/process', apiLimiter, tryOn);

// Create signed upload URL (GCS)
router.post('/uploads/signed-url', tryOnLimiter, requireVtonAdmin, createUploadUrl);

// Create async try-on job
router.post('/jobs', tryOnLimiter, requireVtonAdmin, createTryOnJobAsync);

// Generate video from existing try-on image
router.post('/videos', tryOnLimiter, requireVtonAdmin, generateVideoFromExistingImage);

// Get try-on job status
router.get('/jobs/:id', tryOnLimiter, requireVtonAdmin, getJobStatus);

// Worker: process try-on job (Cloud Tasks/Run)
router.post('/jobs/:id/process', processTryOnJob);
 
// Get detailed health stats
router.get('/health', getHealthStats);

// Internal metrics endpoint
router.get('/metrics', getTryOnMetrics);

// Reset health stats (for testing/debugging)
router.post('/reset-health', resetHealth);

 export default router;

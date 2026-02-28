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
} from '../controllers/virtualTryOnController';
 import { apiLimiter } from '../middleware/rateLimiter';
 
 const router = express.Router();
 
 // Check provider availability
 router.get('/status', getStatus);
 
 // Process virtual try-on (with rate limiting)
 router.post('/process', apiLimiter, tryOn);

// Create signed upload URL (GCS)
router.post('/uploads/signed-url', createUploadUrl);

// Create async try-on job
router.post('/jobs', createTryOnJobAsync);

// Get try-on job status
router.get('/jobs/:id', getJobStatus);

// Worker: process try-on job (Cloud Tasks/Run)
router.post('/jobs/:id/process', processTryOnJob);
 
// Get detailed health stats
router.get('/health', getHealthStats);

// Reset health stats (for testing/debugging)
router.post('/reset-health', resetHealth);

 export default router;

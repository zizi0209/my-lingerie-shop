 import express from 'express';
import { tryOn, getStatus, resetHealth, getHealthStats, getJobStatus } from '../controllers/virtualTryOnController';
 import { apiLimiter } from '../middleware/rateLimiter';
 
 const router = express.Router();
 
 // Check provider availability
 router.get('/status', getStatus);
 
 // Process virtual try-on (with rate limiting)
 router.post('/process', apiLimiter, tryOn);

// Get try-on job status
router.get('/jobs/:id', getJobStatus);
 
// Get detailed health stats
router.get('/health', getHealthStats);

// Reset health stats (for testing/debugging)
router.post('/reset-health', resetHealth);

 export default router;

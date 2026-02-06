 import express from 'express';
 import { tryOn, getStatus } from '../controllers/virtualTryOnController';
 import { apiLimiter } from '../middleware/rateLimiter';
 
 const router = express.Router();
 
 // Check provider availability
 router.get('/status', getStatus);
 
 // Process virtual try-on (with rate limiting)
 router.post('/process', apiLimiter, tryOn);
 
 export default router;

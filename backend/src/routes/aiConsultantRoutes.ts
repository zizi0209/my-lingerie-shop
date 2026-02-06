 import { Router } from 'express';
 import * as aiConsultantController from '../controllers/aiConsultantController';
 import rateLimit from 'express-rate-limit';
 
 const router = Router();
 
 // Rate limiter specifically for AI endpoints
 // 20 requests per minute per IP to stay within Gemini free tier limits
 const aiRateLimiter = rateLimit({
   windowMs: 60 * 1000, // 1 minute
   max: process.env.NODE_ENV === 'test' ? 1000 : 20,
   message: {
     success: false,
     error: 'Quá nhiều yêu cầu. Vui lòng đợi một chút trước khi gửi tin nhắn tiếp.',
   },
   standardHeaders: true,
   legacyHeaders: false,
   skip: () => process.env.NODE_ENV === 'test',
 });
 
 // POST /api/ai-consultant/chat - Send message to AI consultant
 router.post('/chat', aiRateLimiter, aiConsultantController.chat);
 
 // DELETE /api/ai-consultant/session/:sessionId - Clear conversation session
 router.delete('/session/:sessionId', aiConsultantController.clearSession);
 
 export default router;

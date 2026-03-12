import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
 import * as aiConsultantController from '../controllers/aiConsultantController';
 import rateLimit from 'express-rate-limit';
 
 const router = Router();
 
const parseRateLimit = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
};

const createLimiter = (max: number) =>
  rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'test' ? 1000 : max,
    message: {
      success: false,
      error: 'Quá nhiều yêu cầu. Vui lòng đợi một chút trước khi gửi tin nhắn tiếp.',
      code: 'rate_limit',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
  });

const chatjptLimiter = createLimiter(
  parseRateLimit(process.env.AI_CHATJPT_RATE_LIMIT_PER_MIN, 60)
);
const otherProviderLimiter = createLimiter(
  parseRateLimit(process.env.AI_OTHER_RATE_LIMIT_PER_MIN, 20)
);

const isChatjptOnlyMode = (): boolean => process.env.AI_CHAT_TEST_FORCE_CHATJPT === 'true';

const resolveLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (isChatjptOnlyMode()) {
    return chatjptLimiter(req, res, next);
  }
  const preferredProvider = (req.body as { preferredProvider?: string } | undefined)?.preferredProvider;
  const limiter = preferredProvider && preferredProvider !== 'chatjpt'
    ? otherProviderLimiter
    : chatjptLimiter;
  return limiter(req, res, next);
};
 
 // POST /api/ai-consultant/chat - Send message to AI consultant
router.post('/chat', resolveLimiter, aiConsultantController.chat);
 
// GET /api/ai-consultant/providers - Provider health & metrics (no auth)
router.get('/providers', aiConsultantController.getProviders);

// GET /api/ai-consultant/models - Available model catalog
router.get('/models', aiConsultantController.getModels);

 // DELETE /api/ai-consultant/session/:sessionId - Clear conversation session
 router.delete('/session/:sessionId', aiConsultantController.clearSession);
 
 export default router;

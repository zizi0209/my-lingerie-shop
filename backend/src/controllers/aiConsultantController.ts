 import { Request, Response } from 'express';
import { aiConsultantService } from '../services/aiConsultantService';
import { getProvidersHealth, listAllModels } from '../services/llm/llmOrchestrator';
import { getAIMetricsSnapshot } from '../services/metrics/aiMetrics';
import { LLMProviderError } from '../services/llm/types';
 import { v4 as uuidv4 } from 'uuid';
 
 interface ChatRequestBody {
   message: string;
   sessionId?: string;
   context?: {
     currentProductSlug?: string;
     userMeasurements?: {
       bust?: number;
       waist?: number;
       hip?: number;
     };
    conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
   };
  preferredProvider?: 'chatjpt' | 'workers_ai' | 'gemini' | 'groq';
  preferredModel?: string;
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
 }
 
 // Content moderation - filter inappropriate content
 const BLOCKED_PATTERNS = [
   /sex/i,
   /porn/i,
   /nude/i,
   /khỏa thân/i,
   /khoả thân/i,
   /xxx/i,
   /18\+/i,
 ];
 
 function isInappropriateContent(text: string): boolean {
   return BLOCKED_PATTERNS.some(pattern => pattern.test(text));
 }

const AI_FRIENDLY_ERROR_MESSAGE = 'Trợ lý AI hiện đang bận. Vui lòng thử lại sau ít phút.';
const AI_RATE_LIMIT_MESSAGE = 'Trợ lý AI đang quá tải. Vui lòng thử lại sau ít phút.';
const AI_SERVICE_UNAVAILABLE_MESSAGE = 'Trợ lý AI đang bận. Vui lòng thử lại sau ít phút.';
const CHATJPT_FRIENDLY_ERROR_MESSAGE = 'ChatJPT hiện đang bận. Vui lòng thử lại sau ít phút.';

const isChatjptOnlyMode = (): boolean => process.env.AI_CHAT_TEST_FORCE_CHATJPT === 'true';

const resolveProvider = (preferred?: ChatRequestBody['preferredProvider']): ChatRequestBody['preferredProvider'] => {
  if (isChatjptOnlyMode()) {
    return 'chatjpt';
  }
  if (preferred && ['chatjpt', 'workers_ai', 'gemini', 'groq'].includes(preferred)) {
    return preferred;
  }
  return 'chatjpt';
};

const resolveProviderErrorResponse = (error: LLMProviderError) => {
  const friendlyMessage = isChatjptOnlyMode() ? CHATJPT_FRIENDLY_ERROR_MESSAGE : AI_FRIENDLY_ERROR_MESSAGE;
  const rateLimitMessage = isChatjptOnlyMode() ? CHATJPT_FRIENDLY_ERROR_MESSAGE : AI_RATE_LIMIT_MESSAGE;
  const unavailableMessage = isChatjptOnlyMode() ? CHATJPT_FRIENDLY_ERROR_MESSAGE : AI_SERVICE_UNAVAILABLE_MESSAGE;
  if (error.statusCode === 429) {
    return {
      status: 429,
      error: rateLimitMessage,
      code: 'provider_rate_limit',
    };
  }
  if (error.statusCode && error.statusCode >= 500) {
    return {
      status: 503,
      error: unavailableMessage,
      code: 'provider_unavailable',
    };
  }
  if (error.retryable) {
    return {
      status: 503,
      error: unavailableMessage,
      code: 'provider_retryable',
    };
  }
  return {
    status: 500,
    error: friendlyMessage,
    code: 'provider_error',
  };
};

export const chat = async (req: Request, res: Response): Promise<void> => {
   try {
     const { message, sessionId, context, preferredProvider, preferredModel, messages } =
       req.body as ChatRequestBody;
 
     // Validate message
     if (!message || typeof message !== 'string') {
       res.status(400).json({
         success: false,
         error: 'Tin nhắn không hợp lệ',
       });
       return;
     }
 
     // Check message length
     if (message.length > 1000) {
       res.status(400).json({
         success: false,
         error: 'Tin nhắn quá dài (tối đa 1000 ký tự)',
       });
       return;
     }
 
     // Content moderation
     if (isInappropriateContent(message)) {
       res.status(400).json({
         success: false,
         error: 'Nội dung không phù hợp. Vui lòng đặt câu hỏi liên quan đến sản phẩm.',
       });
       return;
     }
 
     // Generate or use existing session ID
     const currentSessionId = sessionId || uuidv4();
 
     // Call AI service
    const resolvedProvider = resolveProvider(preferredProvider);
     const resolvedModel = typeof preferredModel === 'string' ? preferredModel.trim() : undefined;

     const response = await aiConsultantService.chat(
       currentSessionId,
       message.trim(),
       context,
       {
         preferredProvider: resolvedProvider,
         preferredModel: resolvedModel,
         clientMessages: Array.isArray(messages) ? messages : undefined,
       }
     );
 
     res.json({
       success: true,
       data: {
         message: response.message,
         sessionId: currentSessionId,
         suggestedProducts: response.suggestedProducts,
         providerUsed: response.providerUsed,
         modelUsed: response.modelUsed,
       },
     });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Consultant Error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: (req.body as ChatRequestBody)?.sessionId || null,
      provider: error instanceof LLMProviderError ? error.provider : undefined,
      statusCode: error instanceof LLMProviderError ? error.statusCode : undefined,
    });

    if (error instanceof LLMProviderError) {
      const resolved = resolveProviderErrorResponse(error);
      res.status(resolved.status).json({
        success: false,
        error: resolved.error,
        code: resolved.code,
        provider: error.provider,
        statusCode: error.statusCode,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: isChatjptOnlyMode() ? CHATJPT_FRIENDLY_ERROR_MESSAGE : AI_FRIENDLY_ERROR_MESSAGE,
      code: 'internal_error',
    });
  }
 };
 
 export const clearSession = async (req: Request, res: Response): Promise<void> => {
   try {
     const { sessionId } = req.params;
 
     if (!sessionId) {
       res.status(400).json({
         success: false,
         error: 'Session ID is required',
       });
       return;
     }
 
     aiConsultantService.clearSession(sessionId);
 
     res.json({
       success: true,
       message: 'Session cleared',
     });
   } catch (error) {
     console.error('Clear session error:', error);
     res.status(500).json({
       success: false,
       error: 'Failed to clear session',
     });
   }
 };

export const getProviders = (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      providers: getProvidersHealth(),
      metrics: getAIMetricsSnapshot(),
    },
  });
};

export const getModels = (_req: Request, res: Response): void => {
  const chatjptOnly = isChatjptOnlyMode();
  res.json({
    success: true,
    data: {
      models: chatjptOnly
        ? listAllModels().filter((model) => model.provider === 'chatjpt')
        : listAllModels(),
    },
  });
};

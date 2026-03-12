import { Request, Response as ExpressResponse } from 'express';
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

const CHATJPT_FRIENDLY_ERROR_MESSAGE = 'ChatJPT hiện đang bận. Vui lòng thử lại sau ít phút.';
const CHATJPT_UNAVAILABLE_MESSAGE = 'Không thể kết nối với ChatJPT. Vui lòng thử lại sau.';

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
  const rateLimitMessage = CHATJPT_FRIENDLY_ERROR_MESSAGE;
  const unavailableMessage = CHATJPT_FRIENDLY_ERROR_MESSAGE;
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
    error: CHATJPT_FRIENDLY_ERROR_MESSAGE,
    code: 'provider_error',
  };
};

const resolveHealthUrl = (endpoint: string): string => {
  try {
    const url = new URL(endpoint);
    if (url.pathname.endsWith('/api/chat')) {
      url.pathname = url.pathname.replace(/\/api\/chat$/, '/health');
    } else if (url.pathname.endsWith('/')) {
      url.pathname = `${url.pathname}health`;
    } else {
      url.pathname = `${url.pathname}/health`;
    }
    return url.toString();
  } catch {
    return endpoint;
  }
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<globalThis.Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

export const chat = async (req: Request, res: ExpressResponse): Promise<void> => {
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
      error: CHATJPT_FRIENDLY_ERROR_MESSAGE,
      code: 'internal_error',
    });
  }
 };
 
export const clearSession = async (req: Request, res: ExpressResponse): Promise<void> => {
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

export const getProviders = (_req: Request, res: ExpressResponse): void => {
  res.json({
    success: true,
    data: {
      providers: getProvidersHealth(),
      metrics: getAIMetricsSnapshot(),
    },
  });
};

export const getModels = (_req: Request, res: ExpressResponse): void => {
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

export const getHealth = async (_req: Request, res: ExpressResponse): Promise<void> => {
  const primaryEndpoint = (process.env.CHATJPT_ENDPOINT || '').trim();
  const listRaw = (process.env.CHATJPT_ENDPOINTS || '').trim();
  const endpoints = listRaw
    ? listRaw.split(',').map((entry) => entry.trim()).filter(Boolean)
    : primaryEndpoint ? [primaryEndpoint] : [];

  if (endpoints.length === 0) {
    res.status(503).json({
      success: false,
      status: 'offline',
      error: 'CHATJPT_ENDPOINT chưa cấu hình',
    });
    return;
  }

  const results = await Promise.all(
    endpoints.map(async (endpoint) => {
      const healthUrl = resolveHealthUrl(endpoint);
      const startedAt = Date.now();
      try {
        const response = await fetchWithTimeout(healthUrl, 6000);
        const latencyMs = Math.max(1, Date.now() - startedAt);
        return {
          endpoint,
          healthUrl,
          status: response.ok ? 'online' : 'offline',
          latencyMs,
          httpStatus: response.status,
          error: response.ok ? null : `HTTP ${response.status}`,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : CHATJPT_UNAVAILABLE_MESSAGE;
        return {
          endpoint,
          healthUrl,
          status: 'offline',
          latencyMs: null,
          httpStatus: null,
          error: message,
        };
      }
    })
  );

  const onlineCount = results.filter((item) => item.status === 'online').length;
  const success = onlineCount > 0;
  res.status(success ? 200 : 503).json({
    success,
    status: success ? 'online' : 'offline',
    onlineCount,
    offlineCount: results.length - onlineCount,
    endpoints: results,
  });
};

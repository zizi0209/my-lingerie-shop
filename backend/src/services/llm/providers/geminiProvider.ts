import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider, LLMRequest, LLMResponse, LLMModelOption } from '../types';
import { LLMProviderError } from '../types';

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const DEFAULT_GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
const GEMINI_MODELS = (process.env.GEMINI_MODELS || '')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const RESOLVED_MODELS = GEMINI_MODELS.length > 0 ? GEMINI_MODELS : DEFAULT_GEMINI_MODELS;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

const resolveModel = (preferredModel?: string): string => {
  if (preferredModel && RESOLVED_MODELS.includes(preferredModel)) return preferredModel;
  return RESOLVED_MODELS[0];
};

const buildModels = (): LLMModelOption[] =>
  RESOLVED_MODELS.map((id, index) => ({
    id,
    label: id,
    provider: 'gemini',
    featured: index === 0,
  }));

export const geminiProvider: LLMProvider = {
  name: 'gemini',
  isConfigured: () => Boolean(genAI),
  listModels: () => buildModels(),
  generateResponse: async (request: LLMRequest): Promise<LLMResponse> => {
    if (!genAI) throw new LLMProviderError('Gemini chưa cấu hình', 'gemini', false);

    const modelName = resolveModel(request.preferredModel);
    const startedAt = Date.now();
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conversationParts: any[] = request.history.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({
        history: conversationParts,
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.7,
        },
      });

      const fullPrompt = `${request.systemPrompt}\n\nKhách hàng: ${request.userMessage}`;

      const result = await chat.sendMessage(fullPrompt);
      const message = result.response.text();
      const latencyMs = Date.now() - startedAt;
      if (!message) throw new LLMProviderError('Gemini response empty', 'gemini', false);
      return {
        message,
        provider: 'gemini',
        model: modelName,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Gemini request failed';
      const providerError = new LLMProviderError(message, 'gemini', true);
      (providerError as LLMProviderError & { latencyMs?: number }).latencyMs = latencyMs;
      throw providerError;
    }
  },
};

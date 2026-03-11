import type { LLMProvider, LLMRequest, LLMResponse, LLMModelOption } from '../types';
import { LLMProviderError } from '../types';

const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const GROQ_MODEL = (process.env.GROQ_MODEL || 'llama-3.1-8b-instant').trim();

const parseModels = (): LLMModelOption[] => {
  const raw = (process.env.GROQ_MODELS || '').trim();
  const models = raw
    ? raw.split(',').map((model) => model.trim()).filter(Boolean)
    : [GROQ_MODEL];
  return models.map((id, index) => ({
    id,
    label: id,
    provider: 'groq',
    featured: index === 0,
  }));
};

const resolveModel = (preferredModel?: string): string => {
  const models = parseModels();
  if (preferredModel && models.some((model) => model.id === preferredModel)) {
    return preferredModel;
  }
  return GROQ_MODEL || models[0]?.id || 'llama-3.1-8b-instant';
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export const groqProvider: LLMProvider = {
  name: 'groq',
  isConfigured: () => Boolean(GROQ_API_KEY),
  listModels: () => parseModels(),
  generateResponse: async (request: LLMRequest): Promise<LLMResponse> => {
    if (!GROQ_API_KEY) throw new LLMProviderError('Groq chưa cấu hình', 'groq', false);

    const model = resolveModel(request.preferredModel);
    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...request.history.map((msg) => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: request.userMessage },
    ];

    const startedAt = Date.now();
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      const errorText = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      throw new LLMProviderError(
        `Groq error ${response.status}: ${errorText.slice(0, 200)}`,
        'groq',
        retryable,
        response.status,
      );
    }

    const data = (await response.json()) as GroqResponse;
    const message = data.choices?.[0]?.message?.content?.trim() || '';
    if (!message) throw new LLMProviderError('Groq response empty', 'groq', false);

    return {
      message,
      provider: 'groq',
      model,
      latencyMs,
    };
  },
};

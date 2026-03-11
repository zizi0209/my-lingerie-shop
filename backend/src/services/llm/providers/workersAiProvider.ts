import type { LLMProvider, LLMRequest, LLMResponse, LLMModelOption } from '../types';
import { LLMProviderError } from '../types';

const WORKERS_AI_ACCOUNT_ID = (process.env.WORKERS_AI_ACCOUNT_ID || '').trim();
const WORKERS_AI_API_TOKEN = (process.env.WORKERS_AI_API_TOKEN || '').trim();
const WORKERS_AI_MODEL = (process.env.WORKERS_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct').trim();

const DEFAULT_MODELS: LLMModelOption[] = [
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    label: 'Llama 3.1 8B Instruct',
    provider: 'workers_ai',
    contextWindowTokens: 128000,
    featured: true,
  },
  {
    id: '@cf/meta/llama-3.1-70b-instruct',
    label: 'Llama 3.1 70B Instruct',
    provider: 'workers_ai',
    contextWindowTokens: 128000,
    featured: true,
  },
  {
    id: '@cf/google/gemma-2-9b-it',
    label: 'Gemma 2 9B IT',
    provider: 'workers_ai',
    contextWindowTokens: 8192,
    featured: false,
  },
];

const parseModelsFromEnv = (): LLMModelOption[] => {
  const raw = (process.env.WORKERS_AI_MODELS || '').trim();
  if (!raw) return DEFAULT_MODELS;
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => ({
      id,
      label: id,
      provider: 'workers_ai',
      featured: id === WORKERS_AI_MODEL,
    }));
};

const resolveModel = (preferredModel?: string): string => {
  const models = parseModelsFromEnv();
  if (preferredModel && models.some((model) => model.id === preferredModel)) {
    return preferredModel;
  }
  return WORKERS_AI_MODEL || models[0]?.id || '@cf/meta/llama-3.1-8b-instruct';
};

const extractText = (payload: unknown): string => {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';

  const record = payload as Record<string, unknown>;
  const direct = ['response', 'output_text', 'text', 'content'];
  for (const key of direct) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  const result = record.result;
  if (result && typeof result === 'object') {
    const resultRecord = result as Record<string, unknown>;
    const resultText = extractText(resultRecord);
    if (resultText) return resultText;
  }

  const choices = record.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (message && typeof message.content === 'string') return message.content.trim();
  }

  return '';
};

export const workersAiProvider: LLMProvider = {
  name: 'workers_ai',
  isConfigured: () => Boolean(WORKERS_AI_ACCOUNT_ID && WORKERS_AI_API_TOKEN),
  listModels: () => parseModelsFromEnv(),
  generateResponse: async (request: LLMRequest): Promise<LLMResponse> => {
    if (!WORKERS_AI_ACCOUNT_ID || !WORKERS_AI_API_TOKEN) {
      throw new LLMProviderError('Workers AI chưa cấu hình', 'workers_ai', false);
    }

    const model = resolveModel(request.preferredModel);
    const url = `https://api.cloudflare.com/client/v4/accounts/${WORKERS_AI_ACCOUNT_ID}/ai/run/${model}`;
    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...request.history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: request.userMessage },
    ];

    const startedAt = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WORKERS_AI_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      const errorText = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      throw new LLMProviderError(
        `Workers AI error ${response.status}: ${errorText.slice(0, 200)}`,
        'workers_ai',
        retryable,
        response.status,
      );
    }

    const payload = (await response.json()) as unknown;
    const message = extractText(payload);
    if (!message) {
      throw new LLMProviderError('Workers AI response empty', 'workers_ai', false);
    }

    return {
      message,
      provider: 'workers_ai',
      model,
      latencyMs,
    };
  },
};

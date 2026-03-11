import type { LLMProvider, LLMRequest, LLMResponse, LLMModelOption } from '../types';
import { LLMProviderError } from '../types';

type ChatJPTModelDefinition = {
  id: string;
  label: string;
  model: string;
  contextWindowTokens?: number;
  featured?: boolean;
};

const CHATJPT_ENDPOINT = (process.env.CHATJPT_ENDPOINT || 'https://chatjpt.rina.work/api/chat').trim();

const DEFAULT_MODELS: ChatJPTModelDefinition[] = [
  {
    id: 'chatjpt-default',
    label: 'ChatJPT Default',
    model: 'gpt-4o-mini',
    contextWindowTokens: 128000,
    featured: true,
  },
  {
    id: 'chatjpt-pro',
    label: 'ChatJPT Pro',
    model: 'gpt-4o',
    contextWindowTokens: 128000,
    featured: false,
  },
];

const parseModelsFromEnv = (): ChatJPTModelDefinition[] => {
  const raw = (process.env.CHATJPT_MODELS || '').trim();
  if (!raw) return DEFAULT_MODELS;
  return raw
    .split(',')
    .map((entry, index) => {
      const [aliasRaw, modelRaw] = entry.split('=').map((part) => part.trim());
      const alias = modelRaw ? aliasRaw : aliasRaw;
      const model = modelRaw || aliasRaw;
      return {
        id: alias,
        label: alias === model ? alias : `${alias} (${model})`,
        model,
        featured: index === 0,
      } satisfies ChatJPTModelDefinition;
    });
};

const resolveModel = (preferredModel?: string): ChatJPTModelDefinition => {
  const models = parseModelsFromEnv();
  if (preferredModel) {
    const matched = models.find((model) => model.id === preferredModel);
    if (matched) return matched;
  }
  return models[0] || DEFAULT_MODELS[0];
};

const extractMessage = (payload: unknown): string => {
  if (typeof payload === 'string') return payload.trim();
  if (!payload || typeof payload !== 'object') return '';

  const record = payload as Record<string, unknown>;
  const directKeys = ['response', 'output_text', 'text', 'content', 'message'];
  for (const key of directKeys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  const data = record.data;
  if (data && typeof data === 'object') {
    const inner = extractMessage(data as Record<string, unknown>);
    if (inner) return inner;
  }

  const choices = record.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (message && typeof message.content === 'string') return message.content.trim();
  }

  return '';
};

export const chatjptProvider: LLMProvider = {
  name: 'chatjpt',
  isConfigured: () => Boolean(CHATJPT_ENDPOINT),
  listModels: (): LLMModelOption[] =>
    parseModelsFromEnv().map((model) => ({
      id: model.id,
      label: model.label,
      provider: 'chatjpt',
      contextWindowTokens: model.contextWindowTokens,
      featured: model.featured,
    })),
  generateResponse: async (request: LLMRequest): Promise<LLMResponse> => {
    if (!CHATJPT_ENDPOINT) {
      throw new LLMProviderError('ChatJPT endpoint chưa cấu hình', 'chatjpt', false);
    }

    const resolvedModel = resolveModel(request.preferredModel);
    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...request.history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: request.userMessage },
    ];

    const startedAt = Date.now();
    const response = await fetch(CHATJPT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel.model,
        messages,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      const errorText = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      throw new LLMProviderError(
        `ChatJPT error ${response.status}: ${errorText.slice(0, 200)}`,
        'chatjpt',
        retryable,
        response.status,
      );
    }

    const payload = (await response.json()) as unknown;
    const message = extractMessage(payload);
    if (!message) {
      throw new LLMProviderError('ChatJPT response empty', 'chatjpt', false);
    }

    return {
      message,
      provider: 'chatjpt',
      model: resolvedModel.model,
      latencyMs,
    };
  },
};

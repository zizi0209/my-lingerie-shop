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
const CHATJPT_ENDPOINTS = (process.env.CHATJPT_ENDPOINTS || '').trim();
const ENDPOINT_COOLDOWN_MS = Number(process.env.CHATJPT_ENDPOINT_COOLDOWN_MS || 30000);

type EndpointState = {
  url: string;
  failures: number;
  lastFailureAt: number | null;
};

const endpointStates: EndpointState[] = [];

const resolveEndpoints = (): EndpointState[] => {
  const endpoints = CHATJPT_ENDPOINTS
    ? CHATJPT_ENDPOINTS.split(',').map((entry) => entry.trim()).filter(Boolean)
    : [CHATJPT_ENDPOINT].filter(Boolean);
  for (const url of endpoints) {
    if (!endpointStates.some((state) => state.url === url)) {
      endpointStates.push({ url, failures: 0, lastFailureAt: null });
    }
  }
  return endpointStates.filter((state) => endpoints.includes(state.url));
};

const isEndpointAvailable = (state: EndpointState): boolean => {
  if (!state.lastFailureAt) return true;
  return Date.now() - state.lastFailureAt >= ENDPOINT_COOLDOWN_MS;
};

const markFailure = (state: EndpointState): void => {
  state.failures += 1;
  state.lastFailureAt = Date.now();
};

const markSuccess = (state: EndpointState): void => {
  state.failures = 0;
  state.lastFailureAt = null;
};

const pickEndpointOrder = (): EndpointState[] => {
  const states = resolveEndpoints();
  const available = states.filter((state) => isEndpointAvailable(state));
  if (available.length > 0) {
    return [...available].sort((a, b) => a.failures - b.failures);
  }
  return [...states].sort((a, b) => a.failures - b.failures);
};

const DEFAULT_MODELS: ChatJPTModelDefinition[] = [
  {
    id: 'gpt-oss-120b',
    label: 'GPT-OSS 120B',
    model: '@cf/openai/gpt-oss-120b',
    contextWindowTokens: 128000,
    featured: true,
  },
  {
    id: 'llama-3.3-70b-fp8-fast',
    label: 'Llama 3.3 70B FP8 Fast',
    model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    contextWindowTokens: 128000,
  },
  {
    id: 'llama-4-scout-17b-16e',
    label: 'Llama 4 Scout 17B 16E',
    model: '@cf/meta/llama-4-scout-17b-16e-instruct',
    contextWindowTokens: 128000,
  },
  {
    id: 'gemma-3-12b-it',
    label: 'Gemma 3 12B IT',
    model: '@cf/google/gemma-3-12b-it',
    contextWindowTokens: 128000,
  },
  {
    id: 'deepseek-r1-distill-qwen-32b',
    label: 'DeepSeek R1 Distill Qwen 32B',
    model: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
    contextWindowTokens: 128000,
  },
  {
    id: 'qwen3-30b-a3b-fp8',
    label: 'Qwen3 30B A3B FP8',
    model: '@cf/qwen/qwen3-30b-a3b-fp8',
    contextWindowTokens: 128000,
  },
  {
    id: 'qwq-32b',
    label: 'QwQ 32B',
    model: '@cf/qwen/qwq-32b',
    contextWindowTokens: 128000,
  },
  {
    id: 'mistral-7b-instruct-v0.1',
    label: 'Mistral 7B Instruct v0.1',
    model: '@cf/mistral/mistral-7b-instruct-v0.1',
    contextWindowTokens: 32000,
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

const extractMessageFromStream = (raw: string): string => {
  const normalized = raw.replace(/\r/g, '');
  const matches = [...normalized.matchAll(/"response"\s*:\s*"((?:\\.|[^"\\])*)"/g)];
  if (matches.length === 0) return '';
  let output = '';
  for (const match of matches) {
    const piece = match[1];
    if (!piece) continue;
    try {
      output += JSON.parse(`"${piece}"`);
    } catch {
      output += piece;
    }
  }
  return output.trim();
};

const extractMessageFromRaw = (raw: string, contentType: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return extractMessage(parsed) || JSON.stringify(parsed);
    } catch {
      return '';
    }
  }
  if (contentType.includes('text/event-stream')) {
    return extractMessageFromStream(trimmed);
  }
  return trimmed;
};

export const chatjptProvider: LLMProvider = {
  name: 'chatjpt',
  isConfigured: () => resolveEndpoints().length > 0,
  listModels: (): LLMModelOption[] =>
    parseModelsFromEnv().map((model) => ({
      id: model.id,
      label: model.label,
      provider: 'chatjpt',
      contextWindowTokens: model.contextWindowTokens,
      featured: model.featured,
    })),
  generateResponse: async (request: LLMRequest): Promise<LLMResponse> => {
    if (resolveEndpoints().length === 0) {
      throw new LLMProviderError('ChatJPT endpoint chưa cấu hình', 'chatjpt', false);
    }

    const resolvedModel = resolveModel(request.preferredModel);
    const messages = [
      { role: 'system', content: request.systemPrompt },
      ...request.history.map((item) => ({ role: item.role, content: item.content })),
      { role: 'user', content: request.userMessage },
    ];

    const endpoints = pickEndpointOrder();
    let lastError: LLMProviderError | null = null;

    for (const endpoint of endpoints) {
      const startedAt = Date.now();
      try {
        const response = await fetch(endpoint.url, {
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
          const error = new LLMProviderError(
            `ChatJPT error ${response.status}: ${errorText.slice(0, 200)}`,
            'chatjpt',
            retryable,
            response.status,
          );
          markFailure(endpoint);
          lastError = error;
          if (!retryable) break;
          continue;
        }

        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const raw = await response.text();
        const message = extractMessageFromRaw(raw, contentType);
        if (!message) {
          const error = new LLMProviderError('ChatJPT response empty', 'chatjpt', false);
          markFailure(endpoint);
          lastError = error;
          break;
        }

        markSuccess(endpoint);
        return {
          message,
          provider: 'chatjpt',
          model: resolvedModel.model,
          latencyMs,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ChatJPT request failed';
        const providerError = new LLMProviderError(message, 'chatjpt', true);
        markFailure(endpoint);
        lastError = providerError;
      }
    }

    throw lastError || new LLMProviderError('ChatJPT request failed', 'chatjpt', true);
  },
};

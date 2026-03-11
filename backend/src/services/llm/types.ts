export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LLMProviderName = 'chatjpt' | 'workers_ai' | 'gemini' | 'groq';

export type LLMModelOption = {
  id: string;
  label: string;
  provider: LLMProviderName;
  contextWindowTokens?: number;
  featured?: boolean;
};

export type LLMRequest = {
  systemPrompt: string;
  userMessage: string;
  history: ChatMessage[];
  requestId: string;
  preferredModel?: string;
};

export type LLMResponse = {
  message: string;
  provider: LLMProviderName;
  model: string;
  latencyMs: number;
};

export type LLMProvider = {
  name: LLMProviderName;
  isConfigured: () => boolean;
  listModels: () => LLMModelOption[];
  generateResponse: (request: LLMRequest) => Promise<LLMResponse>;
};

export type ProviderHealth = {
  provider: LLMProviderName;
  configured: boolean;
  circuitState: 'closed' | 'open' | 'half_open';
  openUntil?: number | null;
  lastError?: string | null;
  lastLatencyMs?: number | null;
};

export class LLMProviderError extends Error {
  provider: LLMProviderName;
  retryable: boolean;
  statusCode?: number;

  constructor(message: string, provider: LLMProviderName, retryable = false, statusCode?: number) {
    super(message);
    this.name = 'LLMProviderError';
    this.provider = provider;
    this.retryable = retryable;
    this.statusCode = statusCode;
  }
}

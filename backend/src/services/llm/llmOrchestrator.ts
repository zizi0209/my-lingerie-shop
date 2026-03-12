import type {
  LLMProvider,
  LLMProviderName,
  LLMRequest,
  LLMResponse,
  ProviderHealth,
  LLMModelOption,
} from './types';
import { LLMProviderError } from './types';
import { recordFallbackDepth, recordProviderAttempt, recordRequestResult } from '../metrics/aiMetrics';
import { chatjptProvider } from './providers/chatjptProvider';
import { geminiProvider } from './providers/geminiProvider';
import { groqProvider } from './providers/groqProvider';
import { workersAiProvider } from './providers/workersAiProvider';

type CircuitState = {
  state: 'closed' | 'open' | 'half_open';
  failures: number;
  successes: number;
  openedAt: number | null;
  lastError: string | null;
  lastLatencyMs: number | null;
};

const DEFAULT_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 12000);
const DEFAULT_RETRY = Number(process.env.AI_PROVIDER_MAX_RETRIES || 0);
const FAILURE_THRESHOLD = Number(process.env.AI_CIRCUIT_FAILURE_THRESHOLD || 3);
const COOLDOWN_MS = Number(process.env.AI_CIRCUIT_COOLDOWN_MS || 30000);
const HALF_OPEN_SUCCESS_THRESHOLD = Number(process.env.AI_CIRCUIT_HALF_OPEN_SUCCESS_THRESHOLD || 2);

const buildState = (): CircuitState => ({
  state: 'closed',
  failures: 0,
  successes: 0,
  openedAt: null,
  lastError: null,
  lastLatencyMs: null,
});

const circuitStates: Record<LLMProviderName, CircuitState> = {
  chatjpt: buildState(),
  workers_ai: buildState(),
  gemini: buildState(),
  groq: buildState(),
};

const providers: LLMProvider[] = [chatjptProvider, workersAiProvider, geminiProvider, groqProvider];

const isChatjptOnlyMode = (): boolean => process.env.AI_CHAT_TEST_FORCE_CHATJPT === 'true';

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('timeout'));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const resolveProviders = (preferredProvider?: LLMProviderName): LLMProvider[] => {
  if (isChatjptOnlyMode()) {
    return [chatjptProvider];
  }
  if (!preferredProvider) return providers;
  const preferred = providers.find((provider) => provider.name === preferredProvider);
  if (!preferred) return providers;
  return [preferred, ...providers.filter((provider) => provider.name !== preferredProvider)];
};

const canAttempt = (provider: LLMProvider): boolean => {
  if (!provider.isConfigured()) return false;
  const state = circuitStates[provider.name];
  if (state.state === 'closed') return true;
  if (state.state === 'open') {
    if (state.openedAt && Date.now() - state.openedAt >= COOLDOWN_MS) {
      state.state = 'half_open';
      state.successes = 0;
      return true;
    }
    return false;
  }
  return true;
};

const recordSuccess = (providerName: LLMProviderName, latencyMs: number): void => {
  const state = circuitStates[providerName];
  state.lastError = null;
  state.lastLatencyMs = latencyMs;

  if (state.state === 'half_open') {
    state.successes += 1;
    if (state.successes >= HALF_OPEN_SUCCESS_THRESHOLD) {
      state.state = 'closed';
      state.failures = 0;
      state.openedAt = null;
    }
    return;
  }

  state.failures = 0;
  state.state = 'closed';
};

const recordFailure = (providerName: LLMProviderName, error: string): void => {
  const state = circuitStates[providerName];
  state.lastError = error;
  state.failures += 1;
  if (state.state === 'half_open') {
    state.state = 'open';
    state.openedAt = Date.now();
    state.successes = 0;
    return;
  }

  if (state.failures >= FAILURE_THRESHOLD) {
    state.state = 'open';
    state.openedAt = Date.now();
  }
};

export const getProvidersHealth = (): ProviderHealth[] =>
  providers.map((provider) => {
    const state = circuitStates[provider.name];
    const openUntil = state.state === 'open' && state.openedAt
      ? state.openedAt + COOLDOWN_MS
      : null;
    return {
      provider: provider.name,
      configured: provider.isConfigured(),
      circuitState: state.state,
      openUntil,
      lastError: state.lastError,
      lastLatencyMs: state.lastLatencyMs,
    };
  });

export const listAllModels = (): LLMModelOption[] =>
  providers.flatMap((provider) => provider.listModels());

export const generateWithFallback = async (
  request: LLMRequest,
  preferredProvider?: LLMProviderName,
): Promise<LLMResponse> => {
  const orderedProviders = resolveProviders(preferredProvider);
  let lastError: Error | null = null;
  let fallbackDepth = 0;

  for (const provider of orderedProviders) {
    if (!canAttempt(provider)) continue;

    const providerName = provider.name;
    const attempts = Math.max(0, DEFAULT_RETRY) + 1;
    let attempted = false;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      attempted = true;
      const startedAt = Date.now();
      try {
        const response = await withTimeout(provider.generateResponse(request), DEFAULT_TIMEOUT_MS);
        const latencyMs = response.latencyMs || Date.now() - startedAt;
        recordProviderAttempt(providerName, true, latencyMs);
        recordSuccess(providerName, latencyMs);
        recordFallbackDepth(fallbackDepth);
        recordRequestResult(true);
        return response;
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        const message = error instanceof Error ? error.message : 'Unknown provider error';
        const retryable = error instanceof LLMProviderError ? error.retryable : false;
        recordProviderAttempt(providerName, false, latencyMs, message);
        recordFailure(providerName, message);
        lastError = error instanceof Error ? error : new Error(message);
        if (!retryable) break;
      }
    }

    if (attempted) fallbackDepth += 1;
  }

  recordFallbackDepth(fallbackDepth);
  recordRequestResult(false);
  throw lastError || new Error('All providers failed');
};

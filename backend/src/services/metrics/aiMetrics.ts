import type { LLMProviderName } from '../llm/types';

type ProviderMetrics = {
  attempts: number;
  successes: number;
  failures: number;
  lastLatencyMs: number | null;
  lastError: string | null;
};

type AIMetricsSnapshot = {
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  fallbackDepths: Record<string, number>;
  providers: Record<LLMProviderName, ProviderMetrics>;
  lastRequestAt: number | null;
};

const createProviderMetrics = (): ProviderMetrics => ({
  attempts: 0,
  successes: 0,
  failures: 0,
  lastLatencyMs: null,
  lastError: null,
});

const providerMetrics: Record<LLMProviderName, ProviderMetrics> = {
  chatjpt: createProviderMetrics(),
  workers_ai: createProviderMetrics(),
  gemini: createProviderMetrics(),
  groq: createProviderMetrics(),
};

const fallbackDepths: Record<string, number> = {};

let totalRequests = 0;
let totalFailures = 0;
let totalSuccesses = 0;
let lastRequestAt: number | null = null;

export const recordProviderAttempt = (
  provider: LLMProviderName,
  success: boolean,
  latencyMs: number | null,
  error?: string
): void => {
  const metrics = providerMetrics[provider];
  metrics.attempts += 1;
  if (success) {
    metrics.successes += 1;
  } else {
    metrics.failures += 1;
  }
  metrics.lastLatencyMs = latencyMs;
  metrics.lastError = error || null;
};

export const recordRequestResult = (success: boolean): void => {
  totalRequests += 1;
  lastRequestAt = Date.now();
  if (success) totalSuccesses += 1;
  else totalFailures += 1;
};

export const recordFallbackDepth = (depth: number): void => {
  const key = String(depth);
  fallbackDepths[key] = (fallbackDepths[key] || 0) + 1;
};

export const getAIMetricsSnapshot = (): AIMetricsSnapshot => ({
  totalRequests,
  totalFailures,
  totalSuccesses,
  fallbackDepths: { ...fallbackDepths },
  providers: { ...providerMetrics },
  lastRequestAt,
});

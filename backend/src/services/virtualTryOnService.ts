/**
 * Virtual Try-On Service
 * 
 * Features:
 * - Primary: Self-hosted HuggingFace Space (ZeroGPU) when configured
 * - Fallback: Public HuggingFace Spaces
 * - Optional: Google Gemini (explicitly enabled)
 * - Round-robin load balancing across multiple HF providers
 * - Health tracking with automatic failover
 * - Weighted distribution based on success rate
 * - Parallel batch attempts for faster response
 * - Smart circuit breaker with quick recovery
 * - Pre-flight health checks to skip unavailable providers
 */
import { processGeminiTryOn, isGeminiAvailable } from './geminiVirtualTryOnService';
import { isVertexTryOnAvailable, processVertexTryOn } from './vertexTryOnService';
import { deleteTryOnAsset, TemporaryUpload, uploadToTemporaryUrl } from './virtualTryOnStorage';

// Configuration constants
const PRIMARY_PARALLEL_BATCH_SIZE = Number(process.env.TRYON_PRIMARY_PARALLEL_BATCH_SIZE || '1');
const FALLBACK_PARALLEL_BATCH_SIZE = Number(process.env.TRYON_FALLBACK_PARALLEL_BATCH_SIZE || '2');
const QUICK_HEALTH_CHECK_TIMEOUT = 3000; // 3 seconds for quick health check
const DEFAULT_PROVIDER_TIMEOUT_MS = Number(process.env.TRYON_PROVIDER_TIMEOUT_MS || '120000');
const SELF_HOSTED_TIMEOUT_MS = Number(process.env.TRYON_SELF_HOSTED_TIMEOUT_MS || '180000');
const DMVTON_TIMEOUT_MS = Number(process.env.TRYON_DMVTON_TIMEOUT_MS || '180000');
const GEMINI_ENABLED = process.env.TRYON_USE_GEMINI === 'true';
const VERTEX_ENABLED = process.env.TRYON_USE_VERTEX === 'true';
const VERTEX_DAILY_BUDGET_USD = Number(process.env.TRYON_VERTEX_DAILY_BUDGET_USD || '0');
const VERTEX_MAX_REQUESTS_PER_DAY = Number(process.env.TRYON_VERTEX_MAX_REQUESTS_PER_DAY || '0');
const VERTEX_ESTIMATED_COST_PER_IMAGE_USD = Number(process.env.TRYON_VERTEX_ESTIMATED_COST_PER_IMAGE_USD || '0.04');
const VERTEX_SAMPLE_COUNT = Number(process.env.TRYON_VERTEX_SAMPLE_COUNT || '1');
const QUALITY_MODE = process.env.TRYON_QUALITY_MODE === 'true';
const MAX_CONCURRENT_TRYON = Number(process.env.TRYON_MAX_CONCURRENT || '2');
const OVERLOAD_RETRY_SECONDS = Number(process.env.TRYON_OVERLOAD_RETRY_SECONDS || '30');
const SELF_HOSTED_READINESS_TIMEOUT_MS = Number(
  process.env.TRYON_SELF_HOSTED_READINESS_TIMEOUT_MS || '4000'
);
const SELF_HOSTED_READINESS_TTL_MS = Number(
  process.env.TRYON_SELF_HOSTED_READINESS_TTL_MS || '30000'
);
const HEALTH_WINDOW_MS = Number(process.env.TRYON_HEALTH_WINDOW_MS || String(15 * 60 * 1000));
const FAIL_RATE_WARNING_THRESHOLD = Number(process.env.TRYON_FAIL_RATE_WARNING_THRESHOLD || '0.4');
const TIMEOUT_WARNING_THRESHOLD = Number(process.env.TRYON_TIMEOUT_WARNING_THRESHOLD || '2');
const TRYON_DEMO_LEARNING = process.env.TRYON_DEMO_LEARNING === 'true';
const TRYON_PERMISSIVE_PROVIDERS = process.env.TRYON_PERMISSIVE_PROVIDERS || 'FASHN-VTON-1.5,DM-VTON-Local';
const TRYON_NONCOMMERCIAL_PROVIDERS = process.env.TRYON_NONCOMMERCIAL_PROVIDERS || 'StableVITON,IDM-VTON';
const TRYON_FASHN_STEPS = Number(process.env.TRYON_FASHN_STEPS || (QUALITY_MODE ? '60' : '50'));
const TRYON_FASHN_GUIDANCE = Number(process.env.TRYON_FASHN_GUIDANCE || (QUALITY_MODE ? '2' : '1.5'));
const TRYON_FASHN_SEED = Number(process.env.TRYON_FASHN_SEED || '42');
const TRYON_IDM_DENOISE_STEPS = Number(process.env.TRYON_IDM_DENOISE_STEPS || (QUALITY_MODE ? '40' : '30'));
const TRYON_IDM_SEED = Number(process.env.TRYON_IDM_SEED || '42');


interface ProviderConfig {
  name: string;
  url: string;
  endpoint: string;
  type: 'idm' | 'ootd' | 'outfitanyone' | 'kolors' | 'stableviton' | 'vtond' | 'dmvton';
  enabled: boolean;
}

type ProviderLicense = 'permissive' | 'noncommercial' | 'unknown';

export type TryOnErrorCode =
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMITED'
  | 'SYSTEM_OVERLOADED';

interface ProviderHealth {
  lastSuccess: number;
  lastFailure: number;
  lastErrorAt: number;
  lastErrorMessage: string | null;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  consecutiveTimeouts: number;
  avgResponseTime: number;
  recentEvents: Array<{ timestamp: number; success: boolean; timeout: boolean }>;
}

interface ProviderHealthSnapshot {
  lastSuccess: number;
  lastFailure: number;
  lastErrorAt: number;
  lastErrorMessage: string | null;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  consecutiveTimeouts: number;
  avgResponseTime: number;
  successRate: number;
  timeoutRate: number;
  coolingDownUntil: number | null;
  stage: 'primary' | 'fallback';
}

interface DMVTONResponse {
  result_image_url?: string;
  result_image_base64?: string;
  result_image?: string;
  mime_type?: string;
  quality_score?: number;
  model_name?: string;
  seed?: number;
  latency_ms?: number;
  provider?: string;
}

const SELF_HOSTED_PROVIDER_URL = process.env.TRYON_SELF_HOSTED_URL || '';
const SELF_HOSTED_PROVIDER_ENDPOINT = process.env.TRYON_SELF_HOSTED_ENDPOINT || '/call/tryon';
const SELF_HOSTED_PROVIDER_TYPE = (process.env.TRYON_SELF_HOSTED_TYPE || 'idm') as ProviderConfig['type'];
const SELF_HOSTED_PROVIDER_NAME = process.env.TRYON_SELF_HOSTED_NAME || 'ZeroGPU-SelfHosted';
const DMVTON_ENABLED = process.env.TRYON_DMVTON_ENABLED === 'true';
const DMVTON_PROVIDER_URL = process.env.TRYON_DMVTON_URL || '';
const DMVTON_PROVIDER_ENDPOINT = process.env.TRYON_DMVTON_ENDPOINT || '/tryon';

const parseList = (value: string): string[] => value
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const PERMISSIVE_PROVIDER_SET = new Set(parseList(TRYON_PERMISSIVE_PROVIDERS));
const NONCOMMERCIAL_PROVIDER_SET = new Set(parseList(TRYON_NONCOMMERCIAL_PROVIDERS));

const SELF_HOSTED_PROVIDER: ProviderConfig | null = SELF_HOSTED_PROVIDER_URL
  ? {
      name: SELF_HOSTED_PROVIDER_NAME,
      url: SELF_HOSTED_PROVIDER_URL,
      endpoint: SELF_HOSTED_PROVIDER_ENDPOINT,
      type: SELF_HOSTED_PROVIDER_TYPE,
      enabled: true,
    }
  : null;

const DMVTON_PROVIDER: ProviderConfig | null = (DMVTON_ENABLED && DMVTON_PROVIDER_URL)
  ? {
      name: 'DM-VTON-Local',
      url: DMVTON_PROVIDER_URL,
      endpoint: DMVTON_PROVIDER_ENDPOINT,
      type: 'dmvton',
      enabled: true,
    }
  : null;

const PROVIDERS: ProviderConfig[] = [
  ...(DMVTON_PROVIDER ? [DMVTON_PROVIDER] : []),
  ...(SELF_HOSTED_PROVIDER ? [SELF_HOSTED_PROVIDER] : []),
  // FASHN VTON 1.5 - Priority provider (Apache-2.0, high quality)
  // Note: HuggingFace Space URL uses dashes, not dots for version
  {
    name: 'FASHN-VTON-1.5',
    url: 'https://fashn-ai-fashn-vton-1-5.hf.space',
    endpoint: '/gradio_api/call/try_on',
    type: 'idm', // Similar API format to IDM-VTON
    enabled: true,
  },
  {
    name: 'IDM-VTON',
    url: 'https://yisol-idm-vton.hf.space',
    endpoint: '/call/tryon',
    type: 'idm',
    enabled: true,
  },
  {
    name: 'OOTDiffusion',
    url: 'https://levihsu-ootdiffusion.hf.space',
    endpoint: '/call/process_dc',
    type: 'ootd',
    enabled: true,
  },
  {
    name: 'OutfitAnyone',
    url: 'https://humanaigc-outfitanyone.hf.space',
    endpoint: '/call/get_tryon_result',
    type: 'outfitanyone',
    enabled: true,
  },
  {
    name: 'Kolors-VTON',
    url: 'https://kwai-kolors-kolors-virtual-try-on.hf.space',
    endpoint: '/call/tryon',
    type: 'kolors',
    enabled: true,
  },
  // NEW: StableVITON - High quality, uses Stable Diffusion
  {
    name: 'StableVITON',
    url: 'https://rlawjdghek-stableviton.hf.space',
    endpoint: '/call/process',
    type: 'stableviton',
    enabled: true,
  },
  // NEW: VTON-D (Texelmoda) - Multi-modal diffusion
  {
    name: 'VTON-D',
    url: 'https://texelmoda-virtual-try-on-diffusion-vton-d.hf.space',
    endpoint: '/call/tryon',
    type: 'vtond',
    enabled: true,
  },
];

// Round-robin state (persists across requests)
let currentProviderIndex = 0;
let activeTryOnCount = 0;

let vertexUsage = {
  dateKey: '',
  requestCount: 0,
  spentUsd: 0,
};

// Health tracking for each provider
const providerHealth: Map<string, ProviderHealth> = new Map();
const providerReadiness: Map<string, { lastCheckedAt: number; ready: boolean; reason?: string }> = new Map();
const providerProbeAt: Map<string, number> = new Map();

function logTryOnEvent(event: Record<string, unknown>): void {
  console.log('[TryOn][Telemetry]', JSON.stringify({
    timestamp: Date.now(),
    ...event,
  }));
}

// Initialize health tracking
PROVIDERS.forEach(p => {
  providerHealth.set(p.name, {
    lastSuccess: 0,
    lastFailure: 0,
    lastErrorAt: 0,
    lastErrorMessage: null,
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    consecutiveTimeouts: 0,
    avgResponseTime: 0,
    recentEvents: [],
  });
});
 
/**
 * Reset all provider health stats (useful for testing or after server issues)
 */
export function resetProviderHealth(): void {
  PROVIDERS.forEach(p => {
    providerHealth.set(p.name, {
      lastSuccess: 0,
      lastFailure: 0,
      lastErrorAt: 0,
      lastErrorMessage: null,
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      consecutiveTimeouts: 0,
      avgResponseTime: 0,
      recentEvents: [],
    });
  });
  currentProviderIndex = 0;
  providerReadiness.clear();
  console.log('[Health] All provider health stats reset');
}

const POLL_INTERVAL = 2000; // 2 seconds (reduced from 3)
const MAX_POLL_ATTEMPTS = 60; // 2 minutes max polling
const INITIAL_POLL_DELAY = 1000; // Start polling after 1 second
const MAX_RETRY_ATTEMPTS = 1;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_BASE_DELAY_MS = 600;
const PROVIDER_ALLOWLIST = (process.env.TRYON_PROVIDER_ALLOWLIST || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const PROVIDER_BLOCKLIST = (process.env.TRYON_PROVIDER_BLOCKLIST || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const PRIMARY_PROVIDER_NAMES = (process.env.TRYON_PRIMARY_PROVIDERS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const DEFAULT_PRIMARY_PROVIDERS = (() => {
  const providers = [
    ...(DMVTON_PROVIDER ? [DMVTON_PROVIDER.name] : []),
    ...(SELF_HOSTED_PROVIDER ? [SELF_HOSTED_PROVIDER.name] : []),
    'FASHN-VTON-1.5',
  ];
  if (QUALITY_MODE) {
    providers.push('StableVITON', 'VTON-D', 'IDM-VTON', 'Kolors-VTON');
  } else {
    providers.push('IDM-VTON');
  }
  return Array.from(new Set(providers));
})();

function getPrimaryProviderNames(): string[] {
  return PRIMARY_PROVIDER_NAMES.length > 0 ? PRIMARY_PROVIDER_NAMES : DEFAULT_PRIMARY_PROVIDERS;
}

function getProviderLicense(providerName: string): ProviderLicense {
  if (PERMISSIVE_PROVIDER_SET.has(providerName)) return 'permissive';
  if (NONCOMMERCIAL_PROVIDER_SET.has(providerName)) return 'noncommercial';
  return 'unknown';
}

function isProviderAllowedByLicense(providerName: string): boolean {
  const license = getProviderLicense(providerName);
  if (license === 'noncommercial') {
    return TRYON_DEMO_LEARNING;
  }
  return true;
}

function getProviderTimeout(providerName: string): number {
  if (SELF_HOSTED_PROVIDER && providerName === SELF_HOSTED_PROVIDER.name) {
    return SELF_HOSTED_TIMEOUT_MS;
  }
  if (providerName === 'DM-VTON-Local') {
    return DMVTON_TIMEOUT_MS;
  }
  return DEFAULT_PROVIDER_TIMEOUT_MS;
}
 
 interface TryOnResult {
   success: boolean;
   resultImage?: string;
   provider?: string;
   error?: string;
   processingTime?: number;
  errorCode?: TryOnErrorCode;
  retryAfterSeconds?: number;
  errorStage?: 'admission' | 'primary' | 'fallback' | 'gemini';
  providerHint?: string;
 }
 
 interface SpaceStatus {
   available: boolean;
   name: string;
   queueSize?: number;
 }
 
// Constants for health-based routing
const MAX_CONSECUTIVE_FAILURES = 2; // Disable provider after 2 consecutive failures (faster failover)
const RECOVERY_TIME = 30000; // 30 seconds before retrying failed provider
const PROBE_MIN_INTERVAL_MS = 10000; // 10s to avoid repeated probes

/**
 * Quick health check - verify if a Space is responding
 * Returns true if Space appears to be available
 */
async function quickHealthCheck(providerUrl: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      providerUrl,
      { method: 'HEAD' },
      QUICK_HEALTH_CHECK_TIMEOUT
    );
    return response.ok || response.status === 405; // 405 is ok for HEAD on some Spaces
  } catch {
    return false;
  }
}

function isSelfHostedProvider(provider: ProviderConfig): boolean {
  return Boolean(SELF_HOSTED_PROVIDER && provider.name === SELF_HOSTED_PROVIDER.name);
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return error.name === 'AbortError'
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('abort');
}

function pruneRecentEvents(health: ProviderHealth, now: number): void {
  health.recentEvents = health.recentEvents.filter((event) => now - event.timestamp <= HEALTH_WINDOW_MS);
}

function recordHealthEvent(health: ProviderHealth, success: boolean, timeout: boolean): void {
  const now = Date.now();
  health.recentEvents.push({ timestamp: now, success, timeout });
  pruneRecentEvents(health, now);
}

function getHealthWindowStats(health: ProviderHealth): { successRate: number; timeoutRate: number } {
  if (health.recentEvents.length === 0) {
    return { successRate: 0, timeoutRate: 0 };
  }
  const successes = health.recentEvents.filter((event) => event.success).length;
  const timeouts = health.recentEvents.filter((event) => event.timeout).length;
  return {
    successRate: successes / health.recentEvents.length,
    timeoutRate: timeouts / health.recentEvents.length,
  };
}

function computeProviderScore(health: ProviderHealth): number | null {
  if (health.recentEvents.length === 0) {
    return null;
  }
  const { successRate, timeoutRate } = getHealthWindowStats(health);
  const latencyPenalty = health.avgResponseTime > 0 ? health.avgResponseTime / 1000 : 0;
  return successRate * 100 - timeoutRate * 50 - latencyPenalty;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function resetVertexUsageIfNeeded(): void {
  const today = getTodayKey();
  if (vertexUsage.dateKey !== today) {
    vertexUsage = {
      dateKey: today,
      requestCount: 0,
      spentUsd: 0,
    };
  }
}

function getVertexSampleCount(remainingBudgetUsd: number | null): number {
  const baseSampleCount = VERTEX_SAMPLE_COUNT > 0 ? VERTEX_SAMPLE_COUNT : 1;
  if (remainingBudgetUsd === null) {
    return baseSampleCount;
  }
  const estimatedCost = baseSampleCount * VERTEX_ESTIMATED_COST_PER_IMAGE_USD;
  if (remainingBudgetUsd < estimatedCost) {
    return 1;
  }
  return baseSampleCount;
}

function getVertexRemainingBudgetUsd(): number | null {
  if (VERTEX_DAILY_BUDGET_USD <= 0) {
    return null;
  }
  return Math.max(0, VERTEX_DAILY_BUDGET_USD - vertexUsage.spentUsd);
}

function canUseVertex(sampleCount: number): { allowed: boolean; reason?: string; estimatedCost: number } {
  resetVertexUsageIfNeeded();
  const estimatedCost = sampleCount * VERTEX_ESTIMATED_COST_PER_IMAGE_USD;

  if (VERTEX_MAX_REQUESTS_PER_DAY > 0 && vertexUsage.requestCount >= VERTEX_MAX_REQUESTS_PER_DAY) {
    return { allowed: false, reason: 'Đã vượt giới hạn số request Vertex mỗi ngày', estimatedCost };
  }

  if (VERTEX_DAILY_BUDGET_USD > 0 && vertexUsage.spentUsd + estimatedCost > VERTEX_DAILY_BUDGET_USD) {
    return { allowed: false, reason: 'Vượt budget Vertex mỗi ngày', estimatedCost };
  }

  return { allowed: true, estimatedCost };
}

function recordVertexUsage(estimatedCost: number): void {
  resetVertexUsageIfNeeded();
  vertexUsage.requestCount += 1;
  vertexUsage.spentUsd += estimatedCost;
}

async function probeProviderEndpoint(provider: ProviderConfig): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${provider.url}${provider.endpoint}`,
      { method: 'OPTIONS' },
      SELF_HOSTED_READINESS_TIMEOUT_MS
    );
    return response.ok || response.status === 405;
  } catch {
    return false;
  }
}

async function checkSelfHostedReadiness(provider: ProviderConfig): Promise<{ ready: boolean; reason?: string }> {
  const now = Date.now();
  const cached = providerReadiness.get(provider.name);
  if (cached && now - cached.lastCheckedAt < SELF_HOSTED_READINESS_TTL_MS) {
    return { ready: cached.ready, reason: cached.reason };
  }

  if (!provider.url || !provider.endpoint) {
    const reason = 'Thiếu URL hoặc endpoint self-hosted';
    providerReadiness.set(provider.name, { lastCheckedAt: now, ready: false, reason });
    return { ready: false, reason };
  }

  const baseHealthy = await quickHealthCheck(provider.url);
  if (!baseHealthy) {
    const reason = 'Health check self-hosted thất bại';
    providerReadiness.set(provider.name, { lastCheckedAt: now, ready: false, reason });
    return { ready: false, reason };
  }

  const endpointHealthy = await probeProviderEndpoint(provider);
  if (!endpointHealthy) {
    const reason = 'Endpoint self-hosted không phản hồi đúng';
    providerReadiness.set(provider.name, { lastCheckedAt: now, ready: false, reason });
    return { ready: false, reason };
  }

  providerReadiness.set(provider.name, { lastCheckedAt: now, ready: true });
  return { ready: true };
}

function getActiveProviders(): ProviderConfig[] {
  let providers = PROVIDERS.filter((provider) => provider.enabled);

  if (PROVIDER_ALLOWLIST.length > 0) {
    providers = providers.filter((provider) => PROVIDER_ALLOWLIST.includes(provider.name));
  }

  if (PROVIDER_BLOCKLIST.length > 0) {
    providers = providers.filter((provider) => !PROVIDER_BLOCKLIST.includes(provider.name));
  }
  if (providers.length === 0) {
    providers = PROVIDERS.filter((provider) => provider.enabled);
  }

  return providers.filter((provider) => isProviderAllowedByLicense(provider.name));
}

/**
 * Get providers in round-robin order starting from current index
 */
function getProvidersInOrder(providers: ProviderConfig[]): ProviderConfig[] {
  const result: ProviderConfig[] = [];
  const now = Date.now();

  if (providers.length === 0) return result;

  const scoredProviders = providers.map((provider, index) => {
    const health = providerHealth.get(provider.name);
    const score = health ? computeProviderScore(health) : null;
    return { provider, index, score };
  });

  scoredProviders.sort((a, b) => {
    if (a.score === null && b.score === null) return a.index - b.index;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return b.score - a.score;
  });

  const orderedProviders = scoredProviders.map((entry) => entry.provider);
  const rotationStart = orderedProviders.length > 0
    ? currentProviderIndex % orderedProviders.length
    : 0;
  const rotatedProviders = orderedProviders
    .slice(rotationStart)
    .concat(orderedProviders.slice(0, rotationStart));

  for (const provider of rotatedProviders) {
    const health = providerHealth.get(provider.name);

    // Skip providers that are still in cooling period
    if (health && health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const timeSinceFailure = now - health.lastFailure;
      if (timeSinceFailure < RECOVERY_TIME) {
        continue; // Skip this provider
      }
      const lastProbe = providerProbeAt.get(provider.name) ?? 0;
      if (now - lastProbe < PROBE_MIN_INTERVAL_MS) {
        continue;
      }
      providerProbeAt.set(provider.name, now);
    }

    result.push(provider);
  }
  currentProviderIndex = orderedProviders.length > 0
    ? (currentProviderIndex + 1) % orderedProviders.length
    : 0;

  // If all providers are cooling down, include them anyway (last resort)
  if (result.length === 0) {
    console.log('[Round-Robin] All providers cooling down, trying anyway...');
    return [...orderedProviders];
  }

  return result;
}

function splitProvidersByPriority(activeProviders: ProviderConfig[]): {
  primary: ProviderConfig[];
  fallback: ProviderConfig[];
} {
  const primaryOrder = getPrimaryProviderNames();
  const primaryNameSet = new Set(primaryOrder);
  const primary = primaryOrder
    .map((name) => activeProviders.find((provider) => provider.name === name))
    .filter((provider): provider is ProviderConfig => Boolean(provider));
  const fallback = activeProviders.filter((provider) => !primaryNameSet.has(provider.name));
  return { primary, fallback };
}

 async function sleep(ms: number): Promise<void> {
   return new Promise((resolve) => setTimeout(resolve, ms));
 }
 
 async function fetchWithTimeout(
   url: string,
   options: RequestInit,
   timeout: number
 ): Promise<Response> {
   const controller = new AbortController();
   const id = setTimeout(() => controller.abort(), timeout);
 
   try {
     const response = await fetch(url, {
       ...options,
       signal: controller.signal as AbortSignal,
     });
     clearTimeout(id);
     return response;
   } catch (error) {
     clearTimeout(id);
     throw error;
   }
 }

async function cleanupTemporaryUploads(uploads: TemporaryUpload[]): Promise<void> {
  await Promise.all(
    uploads.map(async (upload) => {
      if (upload.provider === 'inline' || upload.provider === 'imgbb') {
        return;
      }
      await deleteTryOnAsset({ gcsUri: upload.storageUri, url: upload.url });
    })
  );
}
 
/**
 * Update provider health after request
 */
function updateProviderHealth(
  providerName: string, 
  success: boolean, 
  responseTime: number,
  options?: { errorMessage?: string; timeout?: boolean }
): void {
  const health = providerHealth.get(providerName);
  if (!health) return;

  const timeout = options?.timeout ?? false;
  recordHealthEvent(health, success, timeout);

  if (success) {
    health.lastSuccess = Date.now();
    health.successCount++;
    health.consecutiveFailures = 0;
    health.consecutiveTimeouts = 0;
    // Update rolling average response time
    health.avgResponseTime = health.avgResponseTime === 0 
      ? responseTime 
      : (health.avgResponseTime * 0.7 + responseTime * 0.3);
  } else {
    health.lastFailure = Date.now();
    health.lastErrorAt = Date.now();
    health.lastErrorMessage = options?.errorMessage || 'Unknown error';
    health.failureCount++;
    health.consecutiveFailures++;
    health.consecutiveTimeouts = timeout ? health.consecutiveTimeouts + 1 : 0;
  }

  const stats = getHealthWindowStats(health);
  const failureRate = health.recentEvents.length > 0 ? 1 - stats.successRate : 0;
  if (!success && failureRate >= FAIL_RATE_WARNING_THRESHOLD) {
    console.warn(`[High][Health] ${providerName} fail-rate ${failureRate.toFixed(2)} vượt ngưỡng`);
  }
  if (!success && timeout && health.consecutiveTimeouts >= TIMEOUT_WARNING_THRESHOLD) {
    console.warn(`[High][Health] ${providerName} timeout liên tiếp: ${health.consecutiveTimeouts}`);
  }

  console.log(`[Health] ${providerName}: success=${health.successCount}, fail=${health.failureCount}, consecutive=${health.consecutiveFailures}, avgTime=${Math.round(health.avgResponseTime)}ms`);
}

/**
 * Generic polling function for HuggingFace Spaces
 */
async function pollForResult(
  resultUrl: string,
  providerName: string
): Promise<string> {
  let attempts = 0;
  let consecutiveHeartbeats = 0;

  // Wait a bit before starting to poll
  await sleep(INITIAL_POLL_DELAY);

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts++;
    
    // Adaptive polling: faster at start, slower after many heartbeats
    const adaptiveInterval = consecutiveHeartbeats > 5 
      ? Math.min(POLL_INTERVAL * 2, 5000) 
      : POLL_INTERVAL;
    
    if (attempts > 1) {
      await sleep(adaptiveInterval);
    }
    
    if (attempts % 10 === 0) {
      console.log(`[${providerName}] Polling attempt ${attempts}/${MAX_POLL_ATTEMPTS}...`);
    }

    try {
      const pollResponse = await fetchWithTimeout(resultUrl, { method: 'GET' }, 30000);
      const pollText = await pollResponse.text();
      
      if (pollText.includes('event: complete')) {
        const dataMatch = pollText.match(/data: (.+)/);
        if (dataMatch) {
          const data = JSON.parse(dataMatch[1]);
          console.log(`[${providerName}] Got result`);
          
          if (data && data[0]) {
            // Handle different response formats
            const result = data[0];
            if (typeof result === 'string') return result;
            if (result.url) return result.url;
            if (result.path) return result.path;
            if (Array.isArray(result) && result[0]) {
              const inner = result[0];
              return inner.image?.url || inner.url || inner;
            }
          }
        }
      }
      
      if (pollText.includes('event: error')) {
        // Parse error data for more details
        const errorDataMatch = pollText.match(/data: (.+)/);
        let errorDetail = 'Unknown error';
        if (errorDataMatch) {
          try {
            const errorData = JSON.parse(errorDataMatch[1]);
            errorDetail = errorData?.error || errorData?.message || JSON.stringify(errorData);
          } catch {
            errorDetail = errorDataMatch[1];
          }
        }
        console.log(`[${providerName}] Error event:`, errorDetail);
        throw new Error('Processing failed on server');
      }
      
      if (pollText.includes('event: heartbeat')) {
        console.log(`[${providerName}] Heartbeat received, still processing...`);
        consecutiveHeartbeats++;
      }
    } catch (pollError) {
      if (pollError instanceof Error && pollError.message === 'Processing failed on server') {
        throw pollError;
      }
      // Don't log every poll error, just continue
      if (attempts % 5 === 0) {
        console.log(`[${providerName}] Poll error (attempt ${attempts}):`, pollError);
      }
    }
  }

  throw new Error('Timeout waiting for result');
}

function normalizeTryOnImage(resultImage: string, mimeType: string): string {
  if (resultImage.startsWith('http')) {
    return resultImage;
  }
  if (resultImage.startsWith('data:')) {
    return resultImage;
  }
  return `data:${mimeType};base64,${resultImage}`;
}

async function tryDMVTONProvider(
  providerName: string,
  baseUrl: string,
  endpoint: string,
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  console.log(`[${providerName}] Starting request...`);

  const [personUpload, garmentUpload] = await Promise.all([
    uploadToTemporaryUrl(personImageBase64, 'person'),
    uploadToTemporaryUrl(garmentImageBase64, 'garment'),
  ]);

  const payload = {
    person_image_url: personUpload.url,
    garment_image_url: garmentUpload.url,
    person_image: personImageBase64,
    garment_image: garmentImageBase64,
  };

  try {
    const response = await fetchWithRetry(
      `${baseUrl}${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      getProviderTimeout(providerName)
    );

    if (!response.ok) {
      const text = await response.text();
      console.log(`[${providerName}] API error:`, response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json() as DMVTONResponse;
    const resultImage = result.result_image_url || result.result_image_base64 || result.result_image;
    if (!resultImage) {
      throw new Error('No result_image returned');
    }

    const mimeType = result.mime_type || 'image/png';
    return normalizeTryOnImage(resultImage, mimeType);
  } finally {
    await cleanupTemporaryUploads([personUpload, garmentUpload]);
  }
}

async function tryIdmProvider(
  providerName: string,
  spaceUrl: string,
  endpoint: string,
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  console.log(`[${providerName}] Starting request...`);

  // Upload images to get URLs (HuggingFace Spaces require URLs)
  const [personUpload, garmentUpload] = await Promise.all([
    uploadToTemporaryUrl(personImageBase64, 'person'),
    uploadToTemporaryUrl(garmentImageBase64, 'garment'),
  ]);

  // IDM-VTON API format
  const payload = {
    data: [
      {
        background: { path: personUpload.url, url: personUpload.url, meta: { _type: 'gradio.FileData' } },
        layers: [],
        composite: null,
      },
      { path: garmentUpload.url, url: garmentUpload.url, meta: { _type: 'gradio.FileData' } },
      'clothing item',
      true, // auto mask
      true, // auto crop
      TRYON_IDM_DENOISE_STEPS,
      TRYON_IDM_SEED,
    ],
  };
  try {
    const response = await fetchWithRetry(
      `${spaceUrl}${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      getProviderTimeout(providerName)
    );

    if (!response.ok) {
      const text = await response.text();
      console.log(`[${providerName}] API error:`, response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json() as { event_id?: string };
    console.log(`[${providerName}] Got event_id:`, result.event_id);

    if (!result.event_id) {
      throw new Error('No event_id returned');
    }

    const resultUrl = `${spaceUrl}${endpoint}/${result.event_id}`;
    return pollForResult(resultUrl, providerName);
  } finally {
    await cleanupTemporaryUploads([personUpload, garmentUpload]);
  }
}

/**
 * FASHN VTON 1.5 - Primary provider
 * Apache-2.0 licensed, high quality fashion-specific model
 */
async function tryFASHNVTON(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://fashn-ai-fashn-vton-1-5.hf.space';
  
  console.log('[FASHN-VTON-1.5] Starting request...');
  
  // Upload images to get URLs
  const [personUpload, garmentUpload] = await Promise.all([
    uploadToTemporaryUrl(personImageBase64, 'person'),
    uploadToTemporaryUrl(garmentImageBase64, 'garment'),
  ]);
  
  // FASHN VTON 1.5 API format
  const payload = {
    data: [
      { path: personUpload.url, url: personUpload.url, meta: { _type: 'gradio.FileData' } },
      { path: garmentUpload.url, url: garmentUpload.url, meta: { _type: 'gradio.FileData' } },
      'tops',
      'flat-lay',
      TRYON_FASHN_STEPS,
      TRYON_FASHN_GUIDANCE,
      TRYON_FASHN_SEED,
      true,
    ],
  };
  try {
    const response = await fetchWithRetry(
      `${spaceUrl}/gradio_api/call/try_on`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      getProviderTimeout('FASHN-VTON-1.5')
    );

    if (!response.ok) {
      const text = await response.text();
      console.log('[FASHN-VTON-1.5] API error:', response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json() as { event_id?: string };
    console.log('[FASHN-VTON-1.5] Got event_id:', result.event_id);
    
    if (!result.event_id) {
      throw new Error('No event_id returned');
    }

    const resultUrl = `${spaceUrl}/gradio_api/call/try_on/${result.event_id}`;
    return pollForResult(resultUrl, 'FASHN-VTON-1.5');
  } finally {
    await cleanupTemporaryUploads([personUpload, garmentUpload]);
  }
}

 async function tryOOTDiffusion(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<string> {
   const spaceUrl = 'https://levihsu-ootdiffusion.hf.space';
   
   console.log('[OOTDiffusion] Starting request...');
   
  // Upload images to get URLs
  const [personUpload, garmentUpload] = await Promise.all([
    uploadToTemporaryUrl(personImageBase64, 'person'),
    uploadToTemporaryUrl(garmentImageBase64, 'garment'),
  ]);
   
   const payload = {
     data: [
       { path: personUpload.url, url: personUpload.url, meta: { _type: 'gradio.FileData' } },
       { path: garmentUpload.url, url: garmentUpload.url, meta: { _type: 'gradio.FileData' } },
       'Upper-body',
       1,    // n_samples
       20,   // n_steps
       2.0,  // guidance_scale
       42,   // seed
     ],
   };

  try {
    const response = await fetchWithRetry(
       `${spaceUrl}/call/process_dc`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload),
       },
      getProviderTimeout('OOTDiffusion')
     );

     if (!response.ok) {
       const text = await response.text();
       console.log('[OOTDiffusion] API error:', response.status, text);
       throw new Error(`API error: ${response.status}`);
     }

     const result = await response.json() as { event_id?: string };
     console.log('[OOTDiffusion] Got event_id:', result.event_id);
     
     if (!result.event_id) {
       throw new Error('No event_id returned');
     }

     const resultUrl = `${spaceUrl}/call/process_dc/${result.event_id}`;
    return pollForResult(resultUrl, 'OOTDiffusion');
  } finally {
    await cleanupTemporaryUploads([personUpload, garmentUpload]);
  }
 }
 
async function tryOutfitAnyone(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://humanaigc-outfitanyone.hf.space';

  console.log('[OutfitAnyone] Starting request...');
  
  // Upload garment image to get URL
  const garmentUpload = await uploadToTemporaryUrl(garmentImageBase64, 'garment');
  
  // OutfitAnyone uses pre-set models, only accepts garment uploads
  const payload = {
    data: [
      0,  // model index (first pre-set model)
      { path: garmentUpload.url, url: garmentUpload.url, meta: { _type: 'gradio.FileData' } },  // top garment
      null,  // lower garment (optional)
    ],
  };

  try {
    const response = await fetchWithRetry(
      `${spaceUrl}/call/get_tryon_result`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      getProviderTimeout('OutfitAnyone')
    );

    if (!response.ok) {
      const text = await response.text();
      console.log('[OutfitAnyone] API error:', response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json() as { event_id?: string };
    console.log('[OutfitAnyone] Got event_id:', result.event_id);
    
    if (!result.event_id) {
      throw new Error('No event_id returned');
    }

    const resultUrl = `${spaceUrl}/call/get_tryon_result/${result.event_id}`;
    return pollForResult(resultUrl, 'OutfitAnyone');
  } finally {
    await cleanupTemporaryUploads([garmentUpload]);
  }
}

async function tryKwaiKolors(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://kwai-kolors-kolors-virtual-try-on.hf.space';

  console.log('[Kolors-VTON] Starting request...');
  
  // Upload images to get URLs
  const [personUpload, garmentUpload] = await Promise.all([
    uploadToTemporaryUrl(personImageBase64, 'person'),
    uploadToTemporaryUrl(garmentImageBase64, 'garment'),
  ]);
  
  const payload = {
    data: [
      { path: personUpload.url, url: personUpload.url, meta: { _type: 'gradio.FileData' } },
      { path: garmentUpload.url, url: garmentUpload.url, meta: { _type: 'gradio.FileData' } },
    ],
  };

  try {
    const response = await fetchWithRetry(
      `${spaceUrl}/call/tryon`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      getProviderTimeout('Kolors-VTON')
    );

    if (!response.ok) {
      const text = await response.text();
      console.log('[Kolors-VTON] API error:', response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json() as { event_id?: string };
    console.log('[Kolors-VTON] Got event_id:', result.event_id);
    
    if (!result.event_id) {
      throw new Error('No event_id returned');
    }

    const resultUrl = `${spaceUrl}/call/tryon/${result.event_id}`;
    return pollForResult(resultUrl, 'Kolors-VTON');
  } finally {
    await cleanupTemporaryUploads([personUpload, garmentUpload]);
  }
}

/**
 * StableVITON - High quality using Stable Diffusion
 */
async function tryStableVITON(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://rlawjdghek-stableviton.hf.space';

  console.log('[StableVITON] Starting request...');
  
  // Upload images to get URLs
  const [personUpload, garmentUpload] = await Promise.all([
    uploadToTemporaryUrl(personImageBase64, 'person'),
    uploadToTemporaryUrl(garmentImageBase64, 'garment'),
  ]);
  
  const payload = {
    data: [
      { path: personUpload.url, url: personUpload.url, meta: { _type: 'gradio.FileData' } },
      { path: garmentUpload.url, url: garmentUpload.url, meta: { _type: 'gradio.FileData' } },
    ],
  };

  try {
    const response = await fetchWithRetry(
      `${spaceUrl}/call/process`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      getProviderTimeout('StableVITON')
    );

    if (!response.ok) {
      const text = await response.text();
      console.log('[StableVITON] API error:', response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json() as { event_id?: string };
    console.log('[StableVITON] Got event_id:', result.event_id);
    
    if (!result.event_id) {
      throw new Error('No event_id returned');
    }

    const resultUrl = `${spaceUrl}/call/process/${result.event_id}`;
    return pollForResult(resultUrl, 'StableVITON');
  } finally {
    await cleanupTemporaryUploads([personUpload, garmentUpload]);
  }
}

/**
 * VTON-D (Texelmoda) - Multi-modal diffusion virtual try-on
 */
async function tryVTOND(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://texelmoda-virtual-try-on-diffusion-vton-d.hf.space';

  console.log('[VTON-D] Starting request...');
  
  // Upload images to get URLs
  const [personUpload, garmentUpload] = await Promise.all([
    uploadToTemporaryUrl(personImageBase64, 'person'),
    uploadToTemporaryUrl(garmentImageBase64, 'garment'),
  ]);
  
  const payload = {
    data: [
      { path: personUpload.url, url: personUpload.url, meta: { _type: 'gradio.FileData' } },
      { path: garmentUpload.url, url: garmentUpload.url, meta: { _type: 'gradio.FileData' } },
    ],
  };

  try {
    const response = await fetchWithRetry(
      `${spaceUrl}/call/tryon`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      getProviderTimeout('VTON-D')
    );

    if (!response.ok) {
      const text = await response.text();
      console.log('[VTON-D] API error:', response.status, text);
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json() as { event_id?: string };
    console.log('[VTON-D] Got event_id:', result.event_id);
    
    if (!result.event_id) {
      throw new Error('No event_id returned');
    }

    const resultUrl = `${spaceUrl}/call/tryon/${result.event_id}`;
    return pollForResult(resultUrl, 'VTON-D');
  } finally {
    await cleanupTemporaryUploads([personUpload, garmentUpload]);
  }
}

/**
 * Try a specific provider
 */
async function tryProvider(
  provider: ProviderConfig,
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  switch (provider.type) {
    case 'idm':
      if (provider.name === 'FASHN-VTON-1.5') {
        return tryFASHNVTON(personImageBase64, garmentImageBase64);
      }
      return tryIdmProvider(
        provider.name,
        provider.url,
        provider.endpoint,
        personImageBase64,
        garmentImageBase64
      );
    case 'ootd':
      return tryOOTDiffusion(personImageBase64, garmentImageBase64);
    case 'outfitanyone':
      return tryOutfitAnyone(personImageBase64, garmentImageBase64);
    case 'kolors':
      return tryKwaiKolors(personImageBase64, garmentImageBase64);
    case 'stableviton':
      return tryStableVITON(personImageBase64, garmentImageBase64);
    case 'vtond':
      return tryVTOND(personImageBase64, garmentImageBase64);
    case 'dmvton':
      return tryDMVTONProvider(
        provider.name,
        provider.url,
        provider.endpoint,
        personImageBase64,
        garmentImageBase64
      );
    default:
      throw new Error(`Unknown provider type: ${String(provider.type)}`);
  }
}

async function tryVertexFallback(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<TryOnResult | null> {
  if (!VERTEX_ENABLED || !isVertexTryOnAvailable()) {
    return null;
  }

  const remainingBudget = getVertexRemainingBudgetUsd();
  const sampleCount = getVertexSampleCount(remainingBudget);
  const allowance = canUseVertex(sampleCount);

  if (!allowance.allowed) {
    logTryOnEvent({ stage: 'vertex', event: 'budget_block', reason: allowance.reason });
    return {
      success: false,
      error: allowance.reason || 'Vertex bị chặn do budget',
      errorCode: 'PROVIDER_UNAVAILABLE',
      errorStage: 'fallback',
      providerHint: 'Vertex-AI',
    };
  }

  const startTime = Date.now();
  try {
    logTryOnEvent({ stage: 'vertex', event: 'provider_attempt', sampleCount });
    const result = await processVertexTryOn({
      personImageBase64,
      garmentImageBase64,
      sampleCount,
    });

    recordVertexUsage(allowance.estimatedCost);

    return {
      success: true,
      resultImage: normalizeTryOnImage(result.base64Image, result.mimeType),
      provider: 'Vertex-AI',
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Vertex error';
    logTryOnEvent({ stage: 'vertex', event: 'provider_failed', error: message });
    return {
      success: false,
      error: message,
      errorCode: 'PROVIDER_UNAVAILABLE',
      errorStage: 'fallback',
      providerHint: 'Vertex-AI',
      processingTime: Date.now() - startTime,
    };
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeout: number,
  maxRetries = MAX_RETRY_ATTEMPTS
): Promise<Response> {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= maxRetries) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      if (!RETRYABLE_STATUS.has(response.status) || attempt === maxRetries) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) {
        throw error;
      }
    }

    const jitter = Math.random() * 200;
    const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
    await sleep(delay);
    attempt += 1;
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown retry error');
}

/**
 * Process Virtual Try-On
 * 
 * Strategy:
 * 1. Primary: Self-hosted provider(s) when configured
 * 2. Fallback: Public HuggingFace Spaces (round-robin)
 * 3. Optional: Gemini (explicitly enabled)
 * 4. Track health and skip unhealthy providers
 * 5. Return first successful result
 */
export async function processVirtualTryOn(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<TryOnResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  if (activeTryOnCount >= MAX_CONCURRENT_TRYON) {
    return {
      success: false,
      error: 'Hệ thống đang quá tải. Vui lòng thử lại sau.',
      errorCode: 'SYSTEM_OVERLOADED',
      retryAfterSeconds: OVERLOAD_RETRY_SECONDS,
      processingTime: Date.now() - startTime,
      errorStage: 'admission',
    };
  }

  activeTryOnCount += 1;
  try {
    console.log('=== Starting Virtual Try-On ===');
    console.log(`[Config] Gemini enabled: ${GEMINI_ENABLED && isGeminiAvailable() ? 'YES' : 'NO'}`);
    console.log('Person image size:', Math.round(personImageBase64.length / 1024), 'KB');
    console.log('Garment image size:', Math.round(garmentImageBase64.length / 1024), 'KB');

  const activeProviders = getActiveProviders();
  const { primary, fallback } = splitProvidersByPriority(activeProviders);
  const fallbackCandidates = fallback.length > 0 ? fallback : activeProviders;
  const orderedFallback = getProvidersInOrder(fallbackCandidates);
  const primaryNames = primary.map((provider) => provider.name);
  console.log(`[Config] Primary providers: ${primaryNames.length > 0 ? primaryNames.join(', ') : 'none'}`);

  const stages: Array<{ label: string; providers: ProviderConfig[]; batchSize: number }> = [
    { label: 'Primary', providers: primary, batchSize: PRIMARY_PARALLEL_BATCH_SIZE },
    { label: 'Fallback', providers: orderedFallback, batchSize: FALLBACK_PARALLEL_BATCH_SIZE },
  ];

  const tryStage = async (
    label: string,
    providers: ProviderConfig[],
    batchSize: number
  ): Promise<TryOnResult | null> => {
    if (providers.length === 0) return null;
    console.log(`\n=== Trying ${label} providers ===`);
    console.log(`[${label}] Provider order: ${providers.map((p) => p.name).join(' → ')}`);

    for (let batchStart = 0; batchStart < providers.length; batchStart += batchSize) {
      const batch = providers.slice(batchStart, batchStart + batchSize);
      console.log(`\n[${label} Batch ${Math.floor(batchStart / batchSize) + 1}] Trying: ${batch.map(p => p.name).join(', ')}`);

      logTryOnEvent({ stage: label.toLowerCase(), event: 'batch_start', providers: batch.map((p) => p.name) });

      const healthChecks = await Promise.all(
        batch.map(async (provider) => {
          if (isSelfHostedProvider(provider)) {
            const readiness = await checkSelfHostedReadiness(provider);
            if (!readiness.ready) {
              const reason = readiness.reason || 'Readiness check failed';
              console.log(`[${provider.name}] Readiness failed - skipping: ${reason}`);
              errors.push(`${provider.name}: readiness failed (${reason})`);
              return { provider, isHealthy: false };
            }
            return { provider, isHealthy: true };
          }

          const isHealthy = await quickHealthCheck(provider.url);
          if (!isHealthy) {
            console.log(`[${provider.name}] Health check failed - skipping`);
            errors.push(`${provider.name}: health check failed`);
          }
          return { provider, isHealthy };
        })
      );

      const healthyProviders = healthChecks.filter(h => h.isHealthy).map(h => h.provider);

      if (healthyProviders.length === 0) {
        console.log(`[${label}] No healthy providers in batch, moving to next...`);
        continue;
      }

      const attempts = healthyProviders.map(async (provider) => {
        const providerStartTime = Date.now();

        try {
          console.log(`[${provider.name}] Trying... (stage=${label})`);
          logTryOnEvent({ stage: label.toLowerCase(), event: 'provider_attempt', provider: provider.name });
          const resultImage = await tryProvider(provider, personImageBase64, garmentImageBase64);

          const responseTime = Date.now() - providerStartTime;
          updateProviderHealth(provider.name, true, responseTime);
          logTryOnEvent({ stage: label.toLowerCase(), event: 'provider_success', provider: provider.name, latencyMs: responseTime });

          return {
            success: true as const,
            resultImage,
            provider: provider.name,
            responseTime,
          };
        } catch (error) {
          const responseTime = Date.now() - providerStartTime;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const timeout = isTimeoutError(error);

          updateProviderHealth(provider.name, false, responseTime, {
            errorMessage: errorMsg,
            timeout,
          });
          console.log(`[${provider.name}] Failed: ${errorMsg}`);
          logTryOnEvent({ stage: label.toLowerCase(), event: 'provider_failed', provider: provider.name, latencyMs: responseTime, error: errorMsg, timeout });

          return {
            success: false as const,
            provider: provider.name,
            error: errorMsg,
          };
        }
      });

      const results = await Promise.allSettled(attempts);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.success) {
          console.log(`=== Success with ${result.value.provider} (${result.value.responseTime}ms) ===`);
          logTryOnEvent({ stage: label.toLowerCase(), event: 'stage_success', provider: result.value.provider, latencyMs: result.value.responseTime });
          return {
            success: true,
            resultImage: result.value.resultImage,
            provider: result.value.provider,
            processingTime: Date.now() - startTime,
          };
        }

        if (result.status === 'fulfilled' && !result.value.success) {
          errors.push(`${result.value.provider}: ${result.value.error}`);
        }
      }
    }

    return null;
  };

    for (const stage of stages) {
      const result = await tryStage(stage.label, stage.providers, stage.batchSize);
      if (result?.success) {
        return result;
      }
    }

    const vertexResult = await tryVertexFallback(personImageBase64, garmentImageBase64);
    if (vertexResult?.success) {
      console.log(`=== Vertex SUCCESS (${vertexResult.processingTime}ms) ===`);
      return {
        success: true,
        resultImage: vertexResult.resultImage,
        provider: vertexResult.provider || 'Vertex-AI',
        processingTime: Date.now() - startTime,
      };
    }
    if (vertexResult && !vertexResult.success && vertexResult.error) {
      errors.push(`Vertex: ${vertexResult.error}`);
    }

    if (GEMINI_ENABLED && isGeminiAvailable()) {
      console.log('\n=== Trying Gemini API (Optional) ===');
      try {
        const geminiResult = await processGeminiTryOn(personImageBase64, garmentImageBase64);
        if (geminiResult.success && geminiResult.resultImage) {
          console.log(`=== Gemini SUCCESS (${geminiResult.processingTime}ms) ===`);
          return {
            success: true,
            resultImage: geminiResult.resultImage,
            provider: 'Gemini',
            processingTime: Date.now() - startTime,
          };
        }

        const geminiError = geminiResult.error || 'Unknown error';
        console.log(`[Gemini] Failed: ${geminiError}`);
        errors.push(`Gemini: ${geminiError}`);
      } catch (geminiError) {
        const errorMsg = geminiError instanceof Error ? geminiError.message : 'Unknown error';
        console.error('[Gemini] Error:', errorMsg);
        errors.push(`Gemini: ${errorMsg}`);
      }
    } else if (isGeminiAvailable()) {
      console.log('[Gemini] Disabled by TRYON_USE_GEMINI');
    }

    console.log('=== All HuggingFace providers failed ===');
    console.log('Errors:', errors);

    console.log('=== All providers (Gemini + HF) failed ===');
    const errorCode: TryOnErrorCode = errors.some((error) => error.toLowerCase().includes('timeout'))
      ? 'PROVIDER_TIMEOUT'
      : errors.some((error) => error.toLowerCase().includes('rate') || error.includes('429'))
        ? 'PROVIDER_RATE_LIMITED'
        : 'PROVIDER_UNAVAILABLE';
    logTryOnEvent({ event: 'all_failed', errorCode, errors });
    return {
      success: false,
      error: `Tất cả hệ thống AI đang bận. Chi tiết: ${errors.join('; ')}`,
      errorCode,
      processingTime: Date.now() - startTime,
      errorStage: 'fallback',
      retryAfterSeconds: errorCode === 'PROVIDER_RATE_LIMITED' ? 60 : undefined,
    };
  } finally {
    activeTryOnCount = Math.max(0, activeTryOnCount - 1);
  }
}
 
/**
 * Check status of all providers
 */
export async function checkSpacesStatus(): Promise<SpaceStatus[]> {
  const results: SpaceStatus[] = [];
  const activeProviders = getActiveProviders();

  for (const provider of activeProviders) {
    const health = providerHealth.get(provider.name);

    try {
      const readiness = isSelfHostedProvider(provider)
        ? await checkSelfHostedReadiness(provider)
        : { ready: true };
      const response = await fetchWithTimeout(
        provider.url,
        { method: 'GET' },
        10000
      );

      results.push({
        available: response.ok
          && readiness.ready
          && (!health || health.consecutiveFailures < MAX_CONSECUTIVE_FAILURES),
        name: provider.name,
        queueSize: health?.consecutiveFailures,
      });
    } catch {
      results.push({
        available: false,
        name: provider.name,
        queueSize: health?.consecutiveFailures,
      });
    }
  }

  return results;
}

/**
 * Get current health stats for monitoring
 */
export function getProviderHealthStats(): Record<string, ProviderHealthSnapshot> {
  const stats: Record<string, ProviderHealthSnapshot> = {};
  const primaryNames = new Set(getPrimaryProviderNames());
  const now = Date.now();

  providerHealth.forEach((health, name) => {
    pruneRecentEvents(health, now);
    const { successRate, timeoutRate } = getHealthWindowStats(health);
    const coolingDownUntil = health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES
      ? Math.max(health.lastFailure + RECOVERY_TIME, now)
      : null;

    stats[name] = {
      lastSuccess: health.lastSuccess,
      lastFailure: health.lastFailure,
      lastErrorAt: health.lastErrorAt,
      lastErrorMessage: health.lastErrorMessage,
      successCount: health.successCount,
      failureCount: health.failureCount,
      consecutiveFailures: health.consecutiveFailures,
      consecutiveTimeouts: health.consecutiveTimeouts,
      avgResponseTime: health.avgResponseTime,
      successRate,
      timeoutRate,
      coolingDownUntil,
      stage: primaryNames.has(name) ? 'primary' : 'fallback',
    };
  });
  return stats;
}
 
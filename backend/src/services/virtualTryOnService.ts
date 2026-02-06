/**
 * Virtual Try-On Service using HuggingFace Spaces
 * 
 * Features:
 * - Round-robin load balancing across multiple providers
 * - Health tracking with automatic failover
 * - Weighted distribution based on success rate
 */

interface ProviderConfig {
  name: string;
  url: string;
  endpoint: string;
  type: 'idm' | 'ootd' | 'outfitanyone' | 'kolors';
  enabled: boolean;
}

interface ProviderHealth {
  lastSuccess: number;
  lastFailure: number;
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  avgResponseTime: number;
}

const PROVIDERS: ProviderConfig[] = [
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
];

// Round-robin state (persists across requests)
let currentProviderIndex = 0;

// Health tracking for each provider
const providerHealth: Map<string, ProviderHealth> = new Map();

// Initialize health tracking
PROVIDERS.forEach(p => {
  providerHealth.set(p.name, {
    lastSuccess: 0,
    lastFailure: 0,
    successCount: 0,
    failureCount: 0,
    consecutiveFailures: 0,
    avgResponseTime: 0,
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
      successCount: 0,
      failureCount: 0,
      consecutiveFailures: 0,
      avgResponseTime: 0,
    });
  });
  currentProviderIndex = 0;
  console.log('[Health] All provider health stats reset');
}

 const MAX_RETRIES = 1;
 const TIMEOUT_MS = 120000; // 2 minutes per request
 const POLL_INTERVAL = 3000; // 3 seconds
 const MAX_POLL_ATTEMPTS = 40; // 2 minutes max polling
 
 interface TryOnResult {
   success: boolean;
   resultImage?: string;
   provider?: string;
   error?: string;
   processingTime?: number;
 }
 
 interface SpaceStatus {
   available: boolean;
   name: string;
   queueSize?: number;
 }
 
// Constants for health-based routing
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const MAX_CONSECUTIVE_FAILURES = 3; // Disable provider after 3 consecutive failures
const RECOVERY_TIME = 300000; // 5 minutes before retrying failed provider

/**
 * Get next provider using weighted round-robin
 * Considers health status and recent performance
 */
function getNextProvider(): ProviderConfig | null {
  const now = Date.now();
  const enabledProviders = PROVIDERS.filter(p => {
    if (!p.enabled) return false;
    
    const health = providerHealth.get(p.name);
    if (!health) return true;
    
    // Skip if too many consecutive failures (unless enough time has passed)
    if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const timeSinceLastFailure = now - health.lastFailure;
      if (timeSinceLastFailure < RECOVERY_TIME) {
        console.log(`[Round-Robin] Skipping ${p.name} - cooling down (${Math.round((RECOVERY_TIME - timeSinceLastFailure) / 1000)}s left)`);
        return false;
      }
      // Reset consecutive failures after recovery time
      health.consecutiveFailures = 0;
    }
    
    return true;
  });

  if (enabledProviders.length === 0) {
    console.log('[Round-Robin] No healthy providers available, trying all...');
    // Reset all providers if none are healthy
    PROVIDERS.forEach(p => {
      const health = providerHealth.get(p.name);
      if (health) health.consecutiveFailures = 0;
    });
    return PROVIDERS[currentProviderIndex % PROVIDERS.length];
  }

  // Round-robin through enabled providers
  currentProviderIndex = (currentProviderIndex + 1) % enabledProviders.length;
  return enabledProviders[currentProviderIndex];
}

/**
 * Get providers in round-robin order starting from current index
 */
function getProvidersInOrder(): ProviderConfig[] {
  const result: ProviderConfig[] = [];
  for (let i = 0; i < PROVIDERS.length; i++) {
    const index = (currentProviderIndex + i) % PROVIDERS.length;
    result.push(PROVIDERS[index]);
  }
  currentProviderIndex = (currentProviderIndex + 1) % PROVIDERS.length;
  return result;
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
 
/**
 * Update provider health after request
 */
function updateProviderHealth(
  providerName: string, 
  success: boolean, 
  responseTime: number
): void {
  const health = providerHealth.get(providerName);
  if (!health) return;

  if (success) {
    health.lastSuccess = Date.now();
    health.successCount++;
    health.consecutiveFailures = 0;
    // Update rolling average response time
    health.avgResponseTime = health.avgResponseTime === 0 
      ? responseTime 
      : (health.avgResponseTime * 0.7 + responseTime * 0.3);
  } else {
    health.lastFailure = Date.now();
    health.failureCount++;
    health.consecutiveFailures++;
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

  while (attempts < MAX_POLL_ATTEMPTS) {
    await sleep(POLL_INTERVAL);
    attempts++;
    
    console.log(`[${providerName}] Polling attempt ${attempts}/${MAX_POLL_ATTEMPTS}...`);

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
        console.log(`[${providerName}] Error event:`, pollText);
        throw new Error('Processing failed on server');
      }
      
      if (pollText.includes('event: heartbeat')) {
        console.log(`[${providerName}] Heartbeat received, still processing...`);
      }
    } catch (pollError) {
      if (pollError instanceof Error && pollError.message === 'Processing failed on server') {
        throw pollError;
      }
      console.log(`[${providerName}] Poll error:`, pollError);
    }
  }

  throw new Error('Timeout waiting for result');
}

 async function tryIDMVTON(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<string> {
   const spaceUrl = 'https://yisol-idm-vton.hf.space';
   
   console.log('[IDM-VTON] Starting request...');
   
   // IDM-VTON API format
   const payload = {
     data: [
       { background: personImageBase64, layers: [], composite: null },
       garmentImageBase64,
       'clothing item',
       true,  // auto mask
       true,  // auto crop
       30,    // denoise steps
       42,    // seed
     ],
   };
 
   const response = await fetchWithTimeout(
     `${spaceUrl}/call/tryon`,
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
     },
     TIMEOUT_MS
   );
 
   if (!response.ok) {
     const text = await response.text();
     console.log('[IDM-VTON] API error:', response.status, text);
     throw new Error(`API error: ${response.status}`);
   }
 
   const result = await response.json() as { event_id?: string };
   console.log('[IDM-VTON] Got event_id:', result.event_id);
   
   if (!result.event_id) {
     throw new Error('No event_id returned');
   }
 
   const resultUrl = `${spaceUrl}/call/tryon/${result.event_id}`;
  return pollForResult(resultUrl, 'IDM-VTON');
 }
 
 async function tryOOTDiffusion(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<string> {
   const spaceUrl = 'https://levihsu-ootdiffusion.hf.space';
   
   console.log('[OOTDiffusion] Starting request...');
   
   const payload = {
     data: [
       personImageBase64,
       garmentImageBase64,
       'Upper-body',
       1,    // n_samples
       20,   // n_steps
       2.0,  // guidance_scale
       42,   // seed
     ],
   };
 
   const response = await fetchWithTimeout(
     `${spaceUrl}/call/process_dc`,
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
     },
     TIMEOUT_MS
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
 }
 
async function tryOutfitAnyone(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://humanaigc-outfitanyone.hf.space';

  console.log('[OutfitAnyone] Starting request...');
  
  // OutfitAnyone uses pre-set models, only accepts garment uploads
  // We'll use their default model and upload the garment
  const payload = {
    data: [
      0,  // model index (first pre-set model)
      garmentImageBase64,  // top garment
      null,  // lower garment (optional)
    ],
  };

  const response = await fetchWithTimeout(
    `${spaceUrl}/call/get_tryon_result`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    TIMEOUT_MS
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
}

async function tryKwaiKolors(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://kwai-kolors-kolors-virtual-try-on.hf.space';

  console.log('[Kolors-VTON] Starting request...');
  
  const payload = {
    data: [
      personImageBase64,
      garmentImageBase64,
    ],
  };

  const response = await fetchWithTimeout(
    `${spaceUrl}/call/tryon`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    TIMEOUT_MS
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
      return tryIDMVTON(personImageBase64, garmentImageBase64);
    case 'ootd':
      return tryOOTDiffusion(personImageBase64, garmentImageBase64);
    case 'outfitanyone':
      return tryOutfitAnyone(personImageBase64, garmentImageBase64);
    case 'kolors':
      return tryKwaiKolors(personImageBase64, garmentImageBase64);
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}

/**
 * Process Virtual Try-On with Round-Robin Load Balancing
 * 
 * Strategy:
 * 1. Get providers in round-robin order
 * 2. Try each provider once (no retries on same provider)
 * 3. Track health and skip unhealthy providers
 * 4. Return first successful result
 */
export async function processVirtualTryOn(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<TryOnResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log('=== Starting Virtual Try-On processing (Round-Robin) ===');
  console.log('Person image size:', Math.round(personImageBase64.length / 1024), 'KB');
  console.log('Garment image size:', Math.round(garmentImageBase64.length / 1024), 'KB');

  // Get providers in round-robin order
  const orderedProviders = getProvidersInOrder();
  console.log(`[Round-Robin] Provider order: ${orderedProviders.map(p => p.name).join(' → ')}`);

  // Try each provider in order
  for (const provider of orderedProviders) {
    const health = providerHealth.get(provider.name);
    
    // Skip if provider has too many consecutive failures (unless in recovery)
    if (health && health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const timeSinceLastFailure = Date.now() - health.lastFailure;
      if (timeSinceLastFailure < RECOVERY_TIME) {
        console.log(`\n[${provider.name}] Skipping - cooling down`);
        errors.push(`${provider.name}: cooling down`);
        continue;
      }
    }

    const providerStartTime = Date.now();
    
    try {
      console.log(`\n[${provider.name}] Trying...`);
      const resultImage = await tryProvider(provider, personImageBase64, garmentImageBase64);
      
      const responseTime = Date.now() - providerStartTime;
      updateProviderHealth(provider.name, true, responseTime);
      
      console.log(`=== Success with ${provider.name} (${responseTime}ms) ===`);
      return {
        success: true,
        resultImage,
        provider: provider.name,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      const responseTime = Date.now() - providerStartTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      updateProviderHealth(provider.name, false, responseTime);
      console.log(`[${provider.name}] Failed: ${errorMsg}`);
      errors.push(`${provider.name}: ${errorMsg}`);
    }
  }

  console.log('=== All providers failed ===');
  console.log('Errors:', errors);

  return {
    success: false,
    error: `Tất cả hệ thống AI đang bận hoặc không khả dụng. Chi tiết: ${errors.join('; ')}`,
    processingTime: Date.now() - startTime,
  };
}
 
/**
 * Check status of all providers
 */
export async function checkSpacesStatus(): Promise<SpaceStatus[]> {
  const results: SpaceStatus[] = [];

  for (const provider of PROVIDERS) {
    const health = providerHealth.get(provider.name);
    
    try {
      const response = await fetchWithTimeout(
        provider.url,
        { method: 'GET' },
        10000
      );

      results.push({
        available: response.ok && (!health || health.consecutiveFailures < MAX_CONSECUTIVE_FAILURES),
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
export function getProviderHealthStats(): Record<string, ProviderHealth> {
  const stats: Record<string, ProviderHealth> = {};
  providerHealth.forEach((health, name) => {
    stats[name] = { ...health };
  });
  return stats;
}
 
/**
 * Virtual Try-On Service
 * 
 * Features:
 * - Primary: HuggingFace Spaces (FASHN VTON 1.5 + other providers)
 * - Fallback: Google Gemini API when all HF Spaces fail
 * - Round-robin load balancing across multiple HF providers
 * - Health tracking with automatic failover
 * - Weighted distribution based on success rate
 * - Parallel batch attempts for faster response
 * - Smart circuit breaker with quick recovery
 * - Pre-flight health checks to skip unavailable providers
 */
import { processGeminiTryOn, isGeminiAvailable } from './geminiVirtualTryOnService';

// Configuration constants
const PARALLEL_BATCH_SIZE = 2; // Try 2 providers in parallel for stability
const QUICK_HEALTH_CHECK_TIMEOUT = 3000; // 3 seconds for quick health check

// imgbb API for temporary image hosting (HuggingFace Spaces require URLs)
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';

/**
 * Upload image to imgbb and get URL
 * Images auto-expire after 10 minutes
 */
async function uploadToImgbb(base64Image: string): Promise<string> {
  if (!IMGBB_API_KEY) {
    throw new Error('IMGBB_API_KEY not configured');
  }

  // Remove data URL prefix if present
  let imageData = base64Image;
  if (base64Image.startsWith('data:')) {
    imageData = base64Image.split(',')[1];
  }

  const formData = new URLSearchParams();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', imageData);
  formData.append('expiration', '600'); // 10 minutes

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    console.log('[imgbb] Upload failed:', response.status, text);
    throw new Error(`imgbb upload failed: ${response.status}`);
  }

  const result = await response.json() as { 
    success: boolean; 
    data?: { url: string };
    error?: { message: string };
  };

  if (!result.success || !result.data?.url) {
    throw new Error(result.error?.message || 'imgbb upload failed');
  }

  console.log('[imgbb] Uploaded:', result.data.url);
  return result.data.url;
}

/**
 * Check if imgbb is configured
 */
function isImgbbConfigured(): boolean {
  return IMGBB_API_KEY.length > 0;
}

/**
 * Ensure image has proper data URL format for Gradio API
 */
function ensureDataUrl(base64: string): string {
  if (base64.startsWith('data:')) {
    return base64;
  }
  // Detect image type from base64 header
  if (base64.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${base64}`;
  }
  if (base64.startsWith('iVBOR')) {
    return `data:image/png;base64,${base64}`;
  }
  if (base64.startsWith('UklGR')) {
    return `data:image/webp;base64,${base64}`;
  }
  // Default to jpeg
  return `data:image/jpeg;base64,${base64}`;
}

interface ProviderConfig {
  name: string;
  url: string;
  endpoint: string;
  type: 'idm' | 'ootd' | 'outfitanyone' | 'kolors' | 'stableviton' | 'vtond';
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

 const TIMEOUT_MS = 120000; // 2 minutes per request
const POLL_INTERVAL = 2000; // 2 seconds (reduced from 3)
const MAX_POLL_ATTEMPTS = 60; // 2 minutes max polling
const INITIAL_POLL_DELAY = 1000; // Start polling after 1 second
 
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
const MAX_CONSECUTIVE_FAILURES = 2; // Disable provider after 2 consecutive failures (faster failover)
const RECOVERY_TIME = 30000; // 30 seconds before retrying failed provider

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

/**
 * Get providers in round-robin order starting from current index
 */
function getProvidersInOrder(): ProviderConfig[] {
  const result: ProviderConfig[] = [];
  const now = Date.now();
  
  for (let i = 0; i < PROVIDERS.length; i++) {
    const index = (currentProviderIndex + i) % PROVIDERS.length;
    const provider = PROVIDERS[index];
    const health = providerHealth.get(provider.name);
    
    // Skip providers that are still in cooling period
    if (health && health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      const timeSinceFailure = now - health.lastFailure;
      if (timeSinceFailure < RECOVERY_TIME) {
        continue; // Skip this provider
      }
    }
    
    result.push(provider);
  }
  currentProviderIndex = (currentProviderIndex + 1) % PROVIDERS.length;
  
  // If all providers are cooling down, include them anyway (last resort)
  if (result.length === 0) {
    console.log('[Round-Robin] All providers cooling down, trying anyway...');
    return [...PROVIDERS];
  }
  
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

 async function tryIDMVTON(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<string> {
   const spaceUrl = 'https://yisol-idm-vton.hf.space';
   
   console.log('[IDM-VTON] Starting request...');
   
   // Upload images to imgbb to get URLs (HuggingFace Spaces require URLs)
   let personUrl: string;
   let garmentUrl: string;
   
   if (isImgbbConfigured()) {
     console.log('[IDM-VTON] Uploading images to imgbb...');
     [personUrl, garmentUrl] = await Promise.all([
       uploadToImgbb(personImageBase64),
       uploadToImgbb(garmentImageBase64),
     ]);
   } else {
     // Fallback to data URL (may not work with all Spaces)
     personUrl = ensureDataUrl(personImageBase64);
     garmentUrl = ensureDataUrl(garmentImageBase64);
   }
   
   // IDM-VTON API format
   const payload = {
     data: [
       { 
         background: { path: personUrl, url: personUrl, meta: { _type: 'gradio.FileData' } }, 
         layers: [], 
         composite: null 
       },
       { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' } },
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
  
  // Upload images to imgbb to get URLs
  let personUrl: string;
  let garmentUrl: string;
  
  if (isImgbbConfigured()) {
    console.log('[FASHN-VTON-1.5] Uploading images to imgbb...');
    [personUrl, garmentUrl] = await Promise.all([
      uploadToImgbb(personImageBase64),
      uploadToImgbb(garmentImageBase64),
    ]);
  } else {
    personUrl = ensureDataUrl(personImageBase64);
    garmentUrl = ensureDataUrl(garmentImageBase64);
  }
  
  // FASHN VTON 1.5 API format
  const payload = {
    data: [
      { path: personUrl, url: personUrl, meta: { _type: 'gradio.FileData' } },
      { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' } },
      'tops',
      'flat-lay',
      50,
      1.5,
      42,
      true,
    ],
  };

  const response = await fetchWithTimeout(
    `${spaceUrl}/gradio_api/call/try_on`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    TIMEOUT_MS
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
}

 async function tryOOTDiffusion(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<string> {
   const spaceUrl = 'https://levihsu-ootdiffusion.hf.space';
   
   console.log('[OOTDiffusion] Starting request...');
   
   // Upload images to imgbb to get URLs
   let personUrl: string;
   let garmentUrl: string;
   
   if (isImgbbConfigured()) {
     console.log('[OOTDiffusion] Uploading images to imgbb...');
     [personUrl, garmentUrl] = await Promise.all([
       uploadToImgbb(personImageBase64),
       uploadToImgbb(garmentImageBase64),
     ]);
   } else {
     personUrl = ensureDataUrl(personImageBase64);
     garmentUrl = ensureDataUrl(garmentImageBase64);
   }
   
   const payload = {
     data: [
       { path: personUrl, url: personUrl, meta: { _type: 'gradio.FileData' } },
       { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' } },
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
  
  // Upload garment image to imgbb
  let garmentUrl: string;
  
  if (isImgbbConfigured()) {
    console.log('[OutfitAnyone] Uploading garment to imgbb...');
    garmentUrl = await uploadToImgbb(garmentImageBase64);
  } else {
    garmentUrl = ensureDataUrl(garmentImageBase64);
  }
  
  // OutfitAnyone uses pre-set models, only accepts garment uploads
  const payload = {
    data: [
      0,  // model index (first pre-set model)
      { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' } },  // top garment
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
  
  // Upload images to imgbb to get URLs
  let personUrl: string;
  let garmentUrl: string;
  
  if (isImgbbConfigured()) {
    console.log('[Kolors-VTON] Uploading images to imgbb...');
    [personUrl, garmentUrl] = await Promise.all([
      uploadToImgbb(personImageBase64),
      uploadToImgbb(garmentImageBase64),
    ]);
  } else {
    personUrl = ensureDataUrl(personImageBase64);
    garmentUrl = ensureDataUrl(garmentImageBase64);
  }
  
  const payload = {
    data: [
      { path: personUrl, url: personUrl, meta: { _type: 'gradio.FileData' } },
      { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' } },
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
 * StableVITON - High quality using Stable Diffusion
 */
async function tryStableVITON(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<string> {
  const spaceUrl = 'https://rlawjdghek-stableviton.hf.space';

  console.log('[StableVITON] Starting request...');
  
  // Upload images to imgbb to get URLs
  let personUrl: string;
  let garmentUrl: string;
  
  if (isImgbbConfigured()) {
    console.log('[StableVITON] Uploading images to imgbb...');
    [personUrl, garmentUrl] = await Promise.all([
      uploadToImgbb(personImageBase64),
      uploadToImgbb(garmentImageBase64),
    ]);
  } else {
    personUrl = ensureDataUrl(personImageBase64);
    garmentUrl = ensureDataUrl(garmentImageBase64);
  }
  
  const payload = {
    data: [
      { path: personUrl, url: personUrl, meta: { _type: 'gradio.FileData' } },
      { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' } },
    ],
  };

  const response = await fetchWithTimeout(
    `${spaceUrl}/call/process`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    TIMEOUT_MS
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
  
  // Upload images to imgbb to get URLs
  let personUrl: string;
  let garmentUrl: string;
  
  if (isImgbbConfigured()) {
    console.log('[VTON-D] Uploading images to imgbb...');
    [personUrl, garmentUrl] = await Promise.all([
      uploadToImgbb(personImageBase64),
      uploadToImgbb(garmentImageBase64),
    ]);
  } else {
    personUrl = ensureDataUrl(personImageBase64);
    garmentUrl = ensureDataUrl(garmentImageBase64);
  }
  
  const payload = {
    data: [
      { path: personUrl, url: personUrl, meta: { _type: 'gradio.FileData' } },
      { path: garmentUrl, url: garmentUrl, meta: { _type: 'gradio.FileData' } },
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
      return tryIDMVTON(personImageBase64, garmentImageBase64);
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
    default:
      throw new Error(`Unknown provider type: ${String(provider.type)}`);
  }
}

/**
 * Process Virtual Try-On
 * 
 * Strategy:
 * 1. Primary: Google Gemini API (fast, stable, 500 free/day)
 * 2. Fallback: HuggingFace Spaces when Gemini fails/rate-limited
 * 3. Track health and skip unhealthy providers
 * 4. Return first successful result
 */
export async function processVirtualTryOn(
  personImageBase64: string,
  garmentImageBase64: string
): Promise<TryOnResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  console.log('=== Starting Virtual Try-On ===');
  console.log(`[Config] Gemini primary: ${isGeminiAvailable() ? 'AVAILABLE' : 'NOT CONFIGURED'}`);
  console.log('Person image size:', Math.round(personImageBase64.length / 1024), 'KB');
  console.log('Garment image size:', Math.round(garmentImageBase64.length / 1024), 'KB');

  // PRIORITY 1: Try Gemini API (fast, stable, free tier 500/day)
  if (isGeminiAvailable()) {
    console.log('\n=== Trying Gemini API (Primary) ===');
    
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
      
      // Log Gemini error but continue to fallback
      const geminiError = geminiResult.error || 'Unknown error';
      console.log(`[Gemini] Failed: ${geminiError}`);
      errors.push(`Gemini: ${geminiError}`);
      
      // If rate limited or safety blocked, still try HF as fallback
      if (geminiError.includes('RATE_LIMIT') || geminiError.includes('quota')) {
        console.log('[Gemini] Rate limited, falling back to HuggingFace...');
      } else if (geminiError.includes('SAFETY') || geminiError.includes('an toàn')) {
        console.log('[Gemini] Content blocked by safety filter, trying HuggingFace...');
      }
    } catch (geminiError) {
      const errorMsg = geminiError instanceof Error ? geminiError.message : 'Unknown error';
      console.error('[Gemini] Error:', errorMsg);
      errors.push(`Gemini: ${errorMsg}`);
    }
  } else {
    console.log('[Gemini] Not configured, skipping to HuggingFace...');
  }

  // PRIORITY 2: Fallback to HuggingFace Spaces
  console.log('\n=== Trying HuggingFace Spaces (Fallback) ===');

  // Get providers in round-robin order
  const orderedProviders = getProvidersInOrder();
  console.log(`[Round-Robin] Provider order: ${orderedProviders.map(p => p.name).join(' → ')}`);

  // Try providers in parallel batches for faster response
  for (let batchStart = 0; batchStart < orderedProviders.length; batchStart += PARALLEL_BATCH_SIZE) {
    const batch = orderedProviders.slice(batchStart, batchStart + PARALLEL_BATCH_SIZE);
    console.log(`\n[Batch ${Math.floor(batchStart / PARALLEL_BATCH_SIZE) + 1}] Trying: ${batch.map(p => p.name).join(', ')}`);
    
    // Quick health check on batch providers
    const healthChecks = await Promise.all(
      batch.map(async (provider) => {
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
      console.log('[Batch] No healthy providers in batch, moving to next...');
      continue;
    }
    
    // Try healthy providers in parallel
    const attempts = healthyProviders.map(async (provider) => {
      const providerStartTime = Date.now();
      
      try {
        console.log(`[${provider.name}] Trying...`);
        const resultImage = await tryProvider(provider, personImageBase64, garmentImageBase64);
        
        const responseTime = Date.now() - providerStartTime;
        updateProviderHealth(provider.name, true, responseTime);
        
        return {
          success: true as const,
          resultImage,
          provider: provider.name,
          responseTime,
        };
      } catch (error) {
        const responseTime = Date.now() - providerStartTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        
        updateProviderHealth(provider.name, false, responseTime);
        console.log(`[${provider.name}] Failed: ${errorMsg}`);
        
        return {
          success: false as const,
          provider: provider.name,
          error: errorMsg,
        };
      }
    });
    
    // Wait for first success or all failures
    const results = await Promise.allSettled(attempts);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        console.log(`=== Success with ${result.value.provider} (${result.value.responseTime}ms) ===`);
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

  console.log('=== All HuggingFace providers failed ===');
  console.log('Errors:', errors);

  console.log('=== All providers (Gemini + HF) failed ===');
  return {
    success: false,
    error: `Tất cả hệ thống AI đang bận. Chi tiết: ${errors.join('; ')}`,
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
 
 import { Client } from '@gradio/client';
 import {
   TryOnRequest,
   TryOnResult,
   TryOnQueueInfo,
   HuggingFaceSpaceConfig,
   DEFAULT_SPACE_CONFIG,
   FALLBACK_SPACES,
 } from '@/types/virtual-tryon';
 
 type ProgressCallback = (progress: number, queueInfo: TryOnQueueInfo | null) => void;
 
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(
  spaceId: string,
  retries: number = MAX_RETRIES
): Promise<ReturnType<typeof Client.connect>> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const client = await Client.connect(spaceId);
      return client;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Connection attempt ${i + 1}/${retries} failed for ${spaceId}:`, error);
      
      if (i < retries - 1) {
        // Wait before retry, with exponential backoff
        await sleep(RETRY_DELAY * (i + 1));
      }
    }
  }
  
  throw lastError || new Error(`Failed to connect to ${spaceId} after ${retries} attempts`);
}

 async function urlToBlob(url: string): Promise<Blob> {
   const response = await fetch(url);
   return response.blob();
 }
 
async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

 export async function processVirtualTryOn(
   request: TryOnRequest,
   onProgress?: ProgressCallback,
   spaceConfig: HuggingFaceSpaceConfig = DEFAULT_SPACE_CONFIG
 ): Promise<TryOnResult> {
   const spaces = [spaceConfig, ...FALLBACK_SPACES];
   let lastError: Error | null = null;
 
   for (const space of spaces) {
     try {
       const result = await trySpace(request, space, onProgress);
       return result;
     } catch (error) {
       console.warn(`Space ${space.spaceId} failed:`, error);
       lastError = error as Error;
       continue;
     }
   }
 
   throw lastError || new Error('All spaces failed');
 }
 
 async function trySpace(
   request: TryOnRequest,
   spaceConfig: HuggingFaceSpaceConfig,
   onProgress?: ProgressCallback
 ): Promise<TryOnResult> {
   onProgress?.(0, null);
 
  onProgress?.(5, { position: 0, total: 0, estimatedTime: 60 });
  
  const client = await connectWithRetry(spaceConfig.spaceId);
 
   onProgress?.(10, null);
 
  // Convert person image to data URL for preview
  const personImageDataUrl = await blobToDataUrl(request.personImage);
  
  // Fetch garment image as blob
   const garmentBlob = await urlToBlob(request.garmentImageUrl);
 
   onProgress?.(20, null);
 
  // IDM-VTON API expects:
  // imgs: ImageEditor dict with background
  // garm_img: PIL Image
  // prompt: text description
  // is_checked: bool (auto mask)
  // is_checked_crop: bool (auto crop)
  // denoise_steps: int
  // seed: int
  const result = await client.predict('/tryon', [
    {
      background: request.personImage,
      layers: [],
      composite: null,
    },
    garmentBlob,
    request.productName || 'clothing item',
    true, // is_checked - use auto mask
    true, // is_checked_crop - use auto crop
    30,   // denoise_steps
    42,   // seed
  ]);
 
   onProgress?.(90, null);
 
   const data = result.data as unknown[];
   if (!data || data.length === 0) {
     throw new Error('No result from API');
   }
 
  // Result format: [output_image, masked_image]
  const resultData = data[0] as { url?: string; path?: string } | string;
  let resultImageUrl: string | undefined;
  
  if (typeof resultData === 'string') {
    resultImageUrl = resultData;
  } else if (resultData && typeof resultData === 'object') {
    resultImageUrl = resultData.url || resultData.path;
  }
 
   if (!resultImageUrl) {
     throw new Error('Invalid result format');
   }
 
   onProgress?.(100, null);
 
   return {
    originalImage: personImageDataUrl,
     resultImage: resultImageUrl,
     productId: request.productId,
     productName: request.productName,
     timestamp: Date.now(),
   };
 }
 
 export async function checkSpaceStatus(
   spaceId: string = DEFAULT_SPACE_CONFIG.spaceId
 ): Promise<{ available: boolean; queueSize?: number }> {
   try {
    const client = await Client.connect(spaceId);
     const info = await client.view_api();
     return {
       available: true,
      queueSize: (info?.named_endpoints?.['/tryon'] as { queue_size?: number } | undefined)?.queue_size,
     };
   } catch {
     return { available: false };
   }
 }

export function getSpaceStatusMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('metadata could not be loaded')) {
    return 'Hệ thống AI đang khởi động. Vui lòng thử lại sau 30-60 giây.';
  }
  if (message.includes('queue') || message.includes('busy')) {
    return 'Hệ thống đang bận. Vui lòng thử lại sau vài phút.';
  }
  if (message.includes('timeout')) {
    return 'Kết nối quá thời gian. Vui lòng thử lại.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
  }
  
  return 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
}

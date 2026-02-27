 // Virtual Try-On TypeScript Interfaces
 
 export type TryOnStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';

export type TryOnErrorCode =
  | 'INPUT_GARMENT_INVALID'
  | 'INPUT_GARMENT_MODEL_WORN'
  | 'INPUT_GARMENT_TOO_SMALL'
  | 'USER_IMAGE_INVALID'
  | 'USER_IMAGE_TOO_SMALL'
  | 'USER_IMAGE_ASPECT_RATIO'
  | 'INPUT_IMAGE_UNSUPPORTED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'PROVIDER_RATE_LIMITED';
 
 export interface TryOnResult {
   originalImage: string;
   resultImage: string;
   productId: string;
   productName: string;
   timestamp: number;
  provider?: string;
 }
 
 export interface TryOnQueueInfo {
   position: number;
   total: number;
   estimatedTime: number; // in seconds
 }
 
 export interface TryOnState {
   status: TryOnStatus;
   progress: number; // 0-100
   queueInfo: TryOnQueueInfo | null;
   result: TryOnResult | null;
   error: string | null;
 }
 
 export interface TryOnRequest {
   personImage: File | Blob;
   garmentImageUrl: string;
   productId: string;
   productName: string;
 }
 
 export interface HuggingFaceSpaceConfig {
   spaceId: string;
   apiEndpoint?: string;
   timeout?: number;
 }
 
 /**
  * Provider configuration managed by backend
  * 
  * Current providers (in priority order):
  * 1. FASHN-VTON-1.5 (Primary - Apache 2.0, high quality)
  * 2. IDM-VTON
  * 3. OOTDiffusion
  * 4. OutfitAnyone
  * 5. Kolors-VTON
  * 6. Gemini API (Fallback)
  * 
  * See: backend/src/services/virtualTryOnService.ts
  */
 export const VIRTUAL_TRYON_CONFIG = {
   timeout: 120000, // 2 minutes per provider
   maxRetries: 1,
   providers: [
     'FASHN-VTON-1.5',
     'IDM-VTON',
     'OOTDiffusion',
     'OutfitAnyone',
     'Kolors-VTON',
     'Gemini (Fallback)',
   ],
 } as const;

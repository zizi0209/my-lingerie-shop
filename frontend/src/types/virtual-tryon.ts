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
  | 'PROVIDER_RATE_LIMITED'
  | 'SYSTEM_OVERLOADED'
  | 'REMOTE_DISABLED';
 
 export interface TryOnResult {
   originalImage: string;
   resultImage: string;
  resultVideo?: string;
  resultImageGcsUri?: string;
  resultVideoGcsUri?: string;
  processingTime?: number;
  jobId?: string;
  source?: 'cloud' | 'local';
   productId: string;
   productName: string;
   timestamp: number;
  provider?: string;
  qualityScore?: number;
  modelName?: string;
  seed?: number;
  latencyMs?: number;
  fallbackReason?: string;
 }

export interface SignedUploadResponse {
  uploadUrl: string;
  uploadMethod?: 'PUT' | 'POST';
  uploadFields?: Record<string, string>;
  provider?: 'gcs' | 'cloudinary';
  gcsUri?: string;
  objectPath?: string;
  expiresInSeconds: number;
}

export type TryOnJobApiStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'expired';

export interface CreateTryOnJobResponse {
  jobId: string;
  status: TryOnJobApiStatus;
  wantsVideo?: boolean;
  videoDurationSeconds?: number;
  productId?: string;
  personImageGcsUri?: string;
  garmentImageGcsUri?: string;
}

export interface TryOnJobStatusResponse {
  jobId: string;
  status: TryOnJobApiStatus;
  errorMessage?: string;
  processingTime?: number;
  provider?: string;
  resultImage?: string;
  resultImageGcsUri?: string;
  resultVideo?: string;
  resultVideoGcsUri?: string;
  qualityScore?: number;
  modelName?: string;
  seed?: number;
  latencyMs?: number;
  fallbackReason?: string;
  etaMs?: number;
  attemptCount?: number;
  nextRetryAt?: number;
  queuedDurationMs?: number;
  processingDurationMs?: number;
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

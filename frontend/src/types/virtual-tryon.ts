 // Virtual Try-On TypeScript Interfaces
 
 export type TryOnStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'error';
 
 export interface TryOnResult {
   originalImage: string;
   resultImage: string;
   productId: string;
   productName: string;
   timestamp: number;
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

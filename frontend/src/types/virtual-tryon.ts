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
 
 export const DEFAULT_SPACE_CONFIG: HuggingFaceSpaceConfig = {
   spaceId: 'yisol/IDM-VTON',
   timeout: 600000, // 10 minutes
 };
 
 export const FALLBACK_SPACES: HuggingFaceSpaceConfig[] = [
   { spaceId: 'zhengchong/CatVTON' },
   { spaceId: 'texelmoda/vton-d' },
 ];

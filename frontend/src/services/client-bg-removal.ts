 import { removeBackground, Config } from '@imgly/background-removal';
 
 let isModelLoaded = false;
 let isLoading = false;
 
 const defaultConfig: Config = {
  model: 'isnet_quint8',
   output: {
     format: 'image/png',
     quality: 0.9,
   },
 };
 
 /**
  * Preload AI model để giảm latency lần đầu
  */
 export async function preloadBgRemovalModel(): Promise<void> {
   if (isModelLoaded || isLoading) return;
   isLoading = true;
   try {
     const tinyBlob = new Blob(
       [new Uint8Array([
         0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
         0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
         0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
         0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
         0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
         0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
         0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
         0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
         0x44, 0xAE, 0x42, 0x60, 0x82,
       ])],
       { type: 'image/png' }
     );
     await removeBackground(tinyBlob, defaultConfig);
     isModelLoaded = true;
     console.log('[BgRemoval] AI model preloaded');
   } catch (err) {
     console.warn('[BgRemoval] Preload failed:', err);
   } finally {
     isLoading = false;
   }
 }
 
 /**
  * Xóa nền ảnh sản phẩm bằng AI (client-side)
  * Trả về object URL của ảnh đã xóa nền
  */
 export async function removeBackgroundClient(
   imageUrl: string,
   onProgress?: (progress: number) => void
 ): Promise<string> {
   onProgress?.(5);
 
   const response = await fetch(imageUrl, { cache: 'no-store' });
   if (!response.ok) {
     throw new Error(`Không thể tải ảnh sản phẩm (${response.status})`);
   }
   const blob = await response.blob();
   onProgress?.(20);
 
   const config: Config = {
     ...defaultConfig,
     progress: (key: string, current: number, total: number) => {
       if (total > 0) {
         const pct = 20 + Math.round((current / total) * 70);
         onProgress?.(Math.min(pct, 90));
       }
     },
   };
 
   const resultBlob = await removeBackground(blob, config);
   onProgress?.(95);
 
   const objectUrl = URL.createObjectURL(resultBlob);
   onProgress?.(100);
 
   return objectUrl;
 }

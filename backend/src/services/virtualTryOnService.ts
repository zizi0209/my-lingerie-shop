// Virtual Try-On Service using HuggingFace Spaces
 
 const SPACES = [
   {
     id: 'yisol/IDM-VTON',
     name: 'IDM-VTON',
     type: 'idm',
   },
   {
     id: 'levihsu/OOTDiffusion',
     name: 'OOTDiffusion',
     type: 'ootd',
   },
 ];
 
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
 
   // Poll for result
   const resultUrl = `${spaceUrl}/call/tryon/${result.event_id}`;
   let attempts = 0;
 
   while (attempts < MAX_POLL_ATTEMPTS) {
     await sleep(POLL_INTERVAL);
     attempts++;
     
     console.log(`[IDM-VTON] Polling attempt ${attempts}/${MAX_POLL_ATTEMPTS}...`);
 
     try {
       const pollResponse = await fetchWithTimeout(resultUrl, { method: 'GET' }, 30000);
       const pollText = await pollResponse.text();
       
       if (pollText.includes('event: complete')) {
         const dataMatch = pollText.match(/data: (.+)/);
         if (dataMatch) {
           const data = JSON.parse(dataMatch[1]);
           console.log('[IDM-VTON] Got result:', typeof data[0]);
           if (data && data[0]) {
             const result = typeof data[0] === 'string' ? data[0] : data[0].url || data[0].path;
             return result;
           }
         }
       }
       
       if (pollText.includes('event: error')) {
         console.log('[IDM-VTON] Error event:', pollText);
         throw new Error('Processing failed on server');
       }
       
       if (pollText.includes('event: heartbeat')) {
         console.log('[IDM-VTON] Heartbeat received, still processing...');
       }
     } catch (pollError) {
       console.log('[IDM-VTON] Poll error:', pollError);
       // Continue polling on timeout
     }
   }
 
   throw new Error('Timeout waiting for result');
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
   let attempts = 0;
 
   while (attempts < MAX_POLL_ATTEMPTS) {
     await sleep(POLL_INTERVAL);
     attempts++;
     
     console.log(`[OOTDiffusion] Polling attempt ${attempts}/${MAX_POLL_ATTEMPTS}...`);
 
     try {
       const pollResponse = await fetchWithTimeout(resultUrl, { method: 'GET' }, 30000);
       const pollText = await pollResponse.text();
       
       if (pollText.includes('event: complete')) {
         const dataMatch = pollText.match(/data: (.+)/);
         if (dataMatch) {
           const data = JSON.parse(dataMatch[1]);
           console.log('[OOTDiffusion] Got result');
           if (data && data[0]) {
             // OOTDiffusion returns gallery format
             const gallery = data[0];
             if (Array.isArray(gallery) && gallery[0]) {
               return gallery[0].image?.url || gallery[0].url || gallery[0];
             }
             return typeof gallery === 'string' ? gallery : gallery.url || gallery.path;
           }
         }
       }
       
       if (pollText.includes('event: error')) {
         console.log('[OOTDiffusion] Error event:', pollText);
         throw new Error('Processing failed on server');
       }
     } catch (pollError) {
       console.log('[OOTDiffusion] Poll error:', pollError);
     }
   }
 
   throw new Error('Timeout waiting for result');
 }
 
 export async function processVirtualTryOn(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<TryOnResult> {
   const startTime = Date.now();
   const errors: string[] = [];
 
   console.log('=== Starting Virtual Try-On processing ===');
   console.log('Person image size:', Math.round(personImageBase64.length / 1024), 'KB');
   console.log('Garment image size:', Math.round(garmentImageBase64.length / 1024), 'KB');
 
   // Try IDM-VTON first
   for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
     try {
       console.log(`\n[IDM-VTON] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
       const resultImage = await tryIDMVTON(personImageBase64, garmentImageBase64);
       
       console.log('=== Success with IDM-VTON ===');
       return {
         success: true,
         resultImage,
         provider: 'IDM-VTON',
         processingTime: Date.now() - startTime,
       };
     } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
       console.log(`[IDM-VTON] Failed: ${errorMsg}`);
       errors.push(`IDM-VTON: ${errorMsg}`);
     }
   }
 
   // Try OOTDiffusion as fallback
   for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
     try {
       console.log(`\n[OOTDiffusion] Attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
       const resultImage = await tryOOTDiffusion(personImageBase64, garmentImageBase64);
       
       console.log('=== Success with OOTDiffusion ===');
       return {
         success: true,
         resultImage,
         provider: 'OOTDiffusion',
         processingTime: Date.now() - startTime,
       };
     } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
       console.log(`[OOTDiffusion] Failed: ${errorMsg}`);
       errors.push(`OOTDiffusion: ${errorMsg}`);
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
 
 export async function checkSpacesStatus(): Promise<SpaceStatus[]> {
   const results: SpaceStatus[] = [];
 
   for (const space of SPACES) {
     try {
       const spaceUrl = `https://${space.id.toLowerCase().replace('/', '-')}.hf.space`;
       const response = await fetchWithTimeout(
         spaceUrl,
         { method: 'GET' },
         10000
       );
 
       results.push({
         available: response.ok,
         name: space.name,
       });
     } catch {
       results.push({
         available: false,
         name: space.name,
       });
     }
   }
 
   return results;
 }
 
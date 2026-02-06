// Using global fetch (Node.js 18+)
 // HuggingFace Spaces configuration
 const SPACES = [
   {
     id: 'Zheng-Chong/CatVTON',
     name: 'CatVTON',
     endpoint: 'https://zheng-chong-catvton.hf.space/api/predict',
     type: 'catvton',
   },
   {
     id: 'levihsu/OOTDiffusion',
     name: 'OOTDiffusion',
     endpoint: 'https://levihsu-ootdiffusion.hf.space/api/predict',
     type: 'ootd',
   },
   {
     id: 'yisol/IDM-VTON',
     name: 'IDM-VTON',
     endpoint: 'https://yisol-idm-vton.hf.space/api/predict',
     type: 'idm',
   },
 ];
 
 const MAX_RETRIES = 2;
 const TIMEOUT_MS = 300000; // 5 minutes
 
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
     return response as unknown as Response;
   } catch (error) {
     clearTimeout(id);
     throw error;
   }
 }
 
 async function trySpaceCatVTON(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<string> {
   const endpoint = 'https://zheng-chong-catvton.hf.space/call/submit';
   
   // CatVTON API format
   const payload = {
     data: [
       personImageBase64,  // person_image
       garmentImageBase64, // garment_image
       'upper_body',       // cloth_type
       30,                 // num_inference_steps
       2.5,                // guidance_scale
       42,                 // seed
     ],
   };
 
   const response = await fetchWithTimeout(
     endpoint,
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
     },
     TIMEOUT_MS
   );
 
   if (!response.ok) {
     throw new Error(`CatVTON API error: ${response.status}`);
   }
 
   const result = await response.json() as { event_id?: string };
   
   if (!result.event_id) {
     throw new Error('No event_id returned');
   }
 
   // Poll for result
   const resultUrl = `https://zheng-chong-catvton.hf.space/call/${result.event_id}`;
   let attempts = 0;
   const maxAttempts = 60; // 5 minutes with 5s intervals
 
   while (attempts < maxAttempts) {
     await sleep(5000);
     attempts++;
 
     const pollResponse = await fetch(resultUrl);
     const pollText = await pollResponse.text();
     
     // Parse SSE format
     if (pollText.includes('event: complete')) {
       const dataMatch = pollText.match(/data: (.+)/);
       if (dataMatch) {
         const data = JSON.parse(dataMatch[1]);
         if (data && data[0]) {
           return data[0].url || data[0];
         }
       }
     }
     
     if (pollText.includes('event: error')) {
       throw new Error('Processing failed');
     }
   }
 
   throw new Error('Timeout waiting for result');
 }
 
 async function trySpaceGradio(
   spaceUrl: string,
   personImageBase64: string,
   garmentImageBase64: string,
   spaceType: string
 ): Promise<string> {
   // Generic Gradio Space API call
   const endpoint = `${spaceUrl}/call/tryon`;
   
   let payload;
   
   if (spaceType === 'idm') {
     // IDM-VTON format
     payload = {
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
   } else {
     // OOTDiffusion format
     payload = {
       data: [
         personImageBase64,
         garmentImageBase64,
         'upper',
         20,
         2.0,
       ],
     };
   }
 
   const response = await fetchWithTimeout(
     endpoint,
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(payload),
     },
     TIMEOUT_MS
   );
 
   if (!response.ok) {
     const text = await response.text();
     throw new Error(`API error: ${response.status} - ${text}`);
   }
 
   const result = await response.json() as { event_id?: string };
   
   if (!result.event_id) {
     throw new Error('No event_id returned');
   }
 
   // Poll for result
   const resultUrl = `${spaceUrl}/call/${result.event_id}`;
   let attempts = 0;
   const maxAttempts = 60;
 
   while (attempts < maxAttempts) {
     await sleep(5000);
     attempts++;
 
     const pollResponse = await fetch(resultUrl);
     const pollText = await pollResponse.text();
     
     if (pollText.includes('event: complete')) {
       const dataMatch = pollText.match(/data: (.+)/);
       if (dataMatch) {
         const data = JSON.parse(dataMatch[1]);
         if (data && data[0]) {
           return typeof data[0] === 'string' ? data[0] : data[0].url || data[0].path;
         }
       }
     }
     
     if (pollText.includes('event: error')) {
       const errorMatch = pollText.match(/data: (.+)/);
       throw new Error(errorMatch ? errorMatch[1] : 'Processing failed');
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
 
   // Try each space in order
   for (const space of SPACES) {
     console.log(`Trying Virtual Try-On with ${space.name}...`);
     
     for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
       try {
         let resultImage: string;
 
         if (space.type === 'catvton') {
           resultImage = await trySpaceCatVTON(personImageBase64, garmentImageBase64);
         } else {
           const spaceUrl = `https://${space.id.toLowerCase().replace('/', '-')}.hf.space`;
           resultImage = await trySpaceGradio(
             spaceUrl,
             personImageBase64,
             garmentImageBase64,
             space.type
           );
         }
 
         return {
           success: true,
           resultImage,
           provider: space.name,
           processingTime: Date.now() - startTime,
         };
       } catch (error) {
         const errorMsg = error instanceof Error ? error.message : 'Unknown error';
         console.warn(`${space.name} attempt ${attempt + 1} failed:`, errorMsg);
         errors.push(`${space.name}: ${errorMsg}`);
         
         if (attempt < MAX_RETRIES - 1) {
           await sleep(2000);
         }
       }
     }
   }
 
   return {
     success: false,
     error: `All providers failed. Errors: ${errors.join('; ')}`,
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

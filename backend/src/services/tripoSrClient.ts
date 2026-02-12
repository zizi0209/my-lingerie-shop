 /**
  * TripoSR Client Service
  *
  * Gọi TripoSR model qua HuggingFace Spaces Gradio API
  * để tạo 3D model (.glb) từ ảnh sản phẩm đã xóa nền.
  *
  * Deployment options:
  * 1. HuggingFace Spaces (free GPU T4) - default
  * 2. Self-hosted FastAPI (local/VPS)
  */
 
 const TRIPOSR_ENDPOINT = process.env.TRIPOSR_ENDPOINT || 'https://stabilityai-triposr.hf.space';
 const TRIPOSR_TIMEOUT_MS = Number(process.env.TRIPOSR_TIMEOUT_MS) || 120_000;
 
 interface TripoSrResult {
   success: boolean;
   glbBuffer: Buffer | null;
   error?: string;
 }
 
 /**
  * Gọi TripoSR Gradio API để tạo 3D mesh từ ảnh
  * @param imageBuffer - Buffer ảnh đã xóa nền (PNG transparent)
  * @returns GLB buffer hoặc error
  */
 export async function generateModel3D(imageBuffer: Buffer): Promise<TripoSrResult> {
   try {
     const base64Image = imageBuffer.toString('base64');
     const dataUri = `data:image/png;base64,${base64Image}`;
 
     // Step 1: Upload image via Gradio API
     const uploadRes = await fetch(`${TRIPOSR_ENDPOINT}/api/predict`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         data: [
           dataUri,    // input image
           true,       // do_remove_background (false since already removed)
           256,        // mc_resolution (marching cubes resolution)
         ],
         fn_index: 1,  // generate 3D model function
       }),
       signal: AbortSignal.timeout(TRIPOSR_TIMEOUT_MS),
     });
 
     if (!uploadRes.ok) {
       const errText = await uploadRes.text();
       return { success: false, glbBuffer: null, error: `TripoSR API error: ${uploadRes.status} - ${errText}` };
     }
 
     const result = await uploadRes.json() as { data?: string[] };
 
     if (!result.data || result.data.length === 0) {
       return { success: false, glbBuffer: null, error: 'TripoSR returned empty result' };
     }
 
     // Step 2: Download the GLB file from result
     const glbPath = result.data[0];
     const glbUrl = glbPath.startsWith('http') ? glbPath : `${TRIPOSR_ENDPOINT}/file=${glbPath}`;
 
     const glbRes = await fetch(glbUrl, {
       signal: AbortSignal.timeout(TRIPOSR_TIMEOUT_MS),
     });
 
     if (!glbRes.ok) {
       return { success: false, glbBuffer: null, error: `Failed to download GLB: ${glbRes.status}` };
     }
 
     const arrayBuffer = await glbRes.arrayBuffer();
     const glbBuffer = Buffer.from(arrayBuffer);
 
     if (glbBuffer.length < 100) {
       return { success: false, glbBuffer: null, error: 'GLB file too small, likely invalid' };
     }
 
     return { success: true, glbBuffer };
   } catch (err) {
     const message = err instanceof Error ? err.message : 'Unknown TripoSR error';
     console.error('[TripoSR] Generation failed:', message);
     return { success: false, glbBuffer: null, error: message };
   }
 }
 
 /**
  * Kiểm tra TripoSR service có available không
  */
 export async function isTripoSrAvailable(): Promise<boolean> {
   try {
     const res = await fetch(`${TRIPOSR_ENDPOINT}/api/`, {
       signal: AbortSignal.timeout(10_000),
     });
     return res.ok;
   } catch {
     return false;
   }
 }

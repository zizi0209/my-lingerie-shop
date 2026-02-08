 /**
  * Gemini Virtual Try-On Service
  * 
  * Fallback service sử dụng Google Gemini API.
  * 
  * Lưu ý: Gemini 2.0 Flash có thể hỗ trợ image generation,
  * nhưng không chuyên biệt cho virtual try-on như các model VTON.
  * Service này cung cấp fallback khi tất cả HuggingFace Spaces fail.
  * 
  * Free Tier: 500 images/ngày
  * 
  * Reference: https://github.com/oyeolamilekan/gemini-ai-tryon
  */
 
 import { GoogleGenerativeAI, Part, GenerateContentResult } from '@google/generative-ai';
 
 const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
 
 const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
 
// Models that support image generation (updated Feb 2026)
// Only these models can generate images as output
const GEMINI_MODELS = [
  'gemini-2.5-flash-image',      // Stable - supports image generation
  'gemini-3-pro-image-preview',  // Preview - latest with image generation
];
 const TIMEOUT_MS = 60000; // 1 minute timeout
 
 interface GeminiTryOnResult {
   success: boolean;
   resultImage?: string;
   provider: 'gemini';
   error?: string;
   processingTime?: number;
 }
 
 interface TryOnAttemptResult {
   success: boolean;
   resultImage?: string;
   error?: string;
   modelUsed?: string;
 }
 
 /**
  * Extract base64 data from data URL or return as-is
  */
 function extractBase64(dataUrl: string): string {
   if (dataUrl.startsWith('data:')) {
     const base64Index = dataUrl.indexOf(',');
     if (base64Index !== -1) {
       return dataUrl.substring(base64Index + 1);
     }
   }
   return dataUrl;
 }
 
 /**
  * Get MIME type from data URL or default to image/jpeg
  */
 function getMimeType(dataUrl: string): string {
   if (dataUrl.startsWith('data:')) {
     const mimeMatch = dataUrl.match(/data:([^;]+);/);
     if (mimeMatch) {
       return mimeMatch[1];
     }
   }
   return 'image/jpeg';
 }
 
 /**
  * Build image part for Gemini API
  */
 function buildImagePart(imageBase64: string): Part {
   return {
     inlineData: {
       mimeType: getMimeType(imageBase64),
       data: extractBase64(imageBase64),
     },
   };
 }
 
 const VIRTUAL_TRYON_PROMPT = `You are an AI fashion stylist specializing in virtual try-on.
 
 I have two images:
 1. Person photo - the model who will wear the clothing
 2. Clothing item - lingerie/fashion item to try on
 
 Your task: Generate a realistic virtual try-on image showing the person wearing the clothing.
 
 Requirements:
 - Keep the person's face, body shape, and pose exactly as in the original photo
 - Realistically overlay the clothing item on the person
 - Maintain proper proportions and lighting
 - Look natural and professional
 
 IMPORTANT: Output ONLY the generated image, no text.`;
 
 /**
  * Check if Gemini API is configured and available
  */
 export function isGeminiAvailable(): boolean {
   return Boolean(genAI && GEMINI_API_KEY);
 }
 
 /**
  * Try a single model for image generation
  */
 async function tryModel(
   modelName: string,
   personImagePart: Part,
   garmentImagePart: Part
 ): Promise<TryOnAttemptResult> {
   if (!genAI) {
     return { success: false, error: 'API not configured' };
   }
 
   try {
     console.log(`[Gemini] Trying model: ${modelName}`);
     
     const model = genAI.getGenerativeModel({
       model: modelName,
       generationConfig: {
         temperature: 0.4,
         topP: 1,
         topK: 32,
         maxOutputTokens: 4096,
       },
     });
 
     const result: GenerateContentResult = await model.generateContent([
       { text: VIRTUAL_TRYON_PROMPT },
       { text: 'Person photo:' },
       personImagePart,
       { text: 'Clothing item:' },
       garmentImagePart,
     ]);
 
     const response = result.response;
     const candidates = response.candidates;
 
     if (!candidates || candidates.length === 0) {
       return { success: false, error: 'No response from model' };
     }
 
     // Check for image in response
     const parts = candidates[0].content?.parts || [];
     
     for (const part of parts) {
       if ('inlineData' in part && part.inlineData) {
         const base64Image = part.inlineData.data;
         const mimeType = part.inlineData.mimeType || 'image/png';
         const resultImage = `data:${mimeType};base64,${base64Image}`;
 
         console.log(`[Gemini] ${modelName} generated image successfully`);
         return {
           success: true,
           resultImage,
           modelUsed: modelName,
         };
       }
     }
 
     // Model returned text, not image
     const textContent = response.text();
     console.log(`[Gemini] ${modelName} returned text:`, textContent.substring(0, 100));
     return {
       success: false,
       error: 'Model không hỗ trợ tạo ảnh',
       modelUsed: modelName,
     };
 
   } catch (error) {
     const errorMessage = error instanceof Error ? error.message : 'Unknown error';
     console.error(`[Gemini] ${modelName} error:`, errorMessage);
     return { success: false, error: errorMessage, modelUsed: modelName };
   }
 }
 
 /**
  * Process Virtual Try-On using Gemini API
  * 
  * Tries multiple Gemini models in order.
  * Note: Not all models support image generation.
  */
 export async function processGeminiTryOn(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<GeminiTryOnResult> {
   const startTime = Date.now();
 
   console.log('[Gemini] Starting virtual try-on fallback...');
 
   if (!genAI) {
     console.log('[Gemini] API not configured');
     return {
       success: false,
       provider: 'gemini',
       error: 'Gemini API chưa được cấu hình (GEMINI_API_KEY)',
       processingTime: Date.now() - startTime,
     };
   }
 
   // Build image parts
   const personImagePart = buildImagePart(personImageBase64);
   const garmentImagePart = buildImagePart(garmentImageBase64);
 
   const errors: string[] = [];
 
   // Try each model with timeout
   for (const modelName of GEMINI_MODELS) {
     try {
       const timeoutPromise = new Promise<TryOnAttemptResult>((resolve) => {
         setTimeout(() => resolve({ success: false, error: 'Timeout' }), TIMEOUT_MS);
       });
 
       const result = await Promise.race([
         tryModel(modelName, personImagePart, garmentImagePart),
         timeoutPromise,
       ]);
 
       if (result.success && result.resultImage) {
         return {
           success: true,
           resultImage: result.resultImage,
           provider: 'gemini' as const,
           processingTime: Date.now() - startTime,
         };
       }
       
       errors.push(`${modelName}: ${result.error}`);
     } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
       errors.push(`${modelName}: ${errorMsg}`);
     }
   }
 
   // Handle specific error cases
   const allErrors = errors.join('; ');
 
   if (allErrors.includes('SAFETY')) {
     return {
       success: false,
       provider: 'gemini',
       error: 'Nội dung ảnh không phù hợp với chính sách an toàn của Google.',
       processingTime: Date.now() - startTime,
     };
   }
 
   if (allErrors.includes('RATE_LIMIT') || allErrors.includes('quota')) {
     return {
       success: false,
       provider: 'gemini',
       error: 'Đã vượt quá giới hạn API Gemini. Vui lòng thử lại sau.',
       processingTime: Date.now() - startTime,
     };
   }
 
   // All models failed to generate image
   console.log('[Gemini] All models failed:', errors);
   return {
     success: false,
     provider: 'gemini',
     error: `Gemini không thể tạo ảnh. Chi tiết: ${allErrors}`,
     processingTime: Date.now() - startTime,
   };
 }
 
 /**
  * Use Gemini for outfit compatibility analysis
  * This always works as it only needs vision, not image generation
  */
 export async function analyzeOutfitCompatibility(
   personImageBase64: string,
   garmentImageBase64: string
 ): Promise<{ compatible: boolean; feedback: string }> {
   if (!genAI) {
     return {
       compatible: true,
       feedback: 'Không thể phân tích (API không khả dụng)',
     };
   }
 
   try {
     const model = genAI.getGenerativeModel({ model: GEMINI_MODELS[0] });
 
     const result = await model.generateContent([
       {
         text: `Analyze if this clothing item would look good on this person.
 Consider: body type, proportions, style compatibility.
 Response in Vietnamese, be brief (max 50 words).
 Format: "Phù hợp: [Có/Không]. [Lý do ngắn gọn]"`,
       },
       buildImagePart(personImageBase64),
       buildImagePart(garmentImageBase64),
     ]);
 
     const response = result.response.text();
     const compatible = response.toLowerCase().includes('phù hợp: có') ||
                        response.toLowerCase().includes('có');
 
     return { compatible, feedback: response };
   } catch (error) {
     console.error('[Gemini] Analysis error:', error);
     return {
       compatible: true,
       feedback: 'Không thể phân tích',
     };
   }
 }

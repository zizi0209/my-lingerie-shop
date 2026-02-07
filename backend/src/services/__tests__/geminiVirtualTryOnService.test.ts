 /**
  * GEMINI VIRTUAL TRY-ON SERVICE - UNIT TESTS
  *
  * Tests for Gemini API fallback service
  */
 
 import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
 
 // Store original env
 const originalEnv = process.env;
 
 describe('GeminiVirtualTryOnService', () => {
   beforeEach(() => {
     vi.resetModules();
     process.env = { ...originalEnv };
   });
 
   afterEach(() => {
     process.env = originalEnv;
     vi.restoreAllMocks();
   });
 
   describe('isGeminiAvailable', () => {
     it('should return false when GEMINI_API_KEY is not set', async () => {
       process.env.GEMINI_API_KEY = '';
       process.env.GOOGLE_API_KEY = '';
 
       const { isGeminiAvailable } = await import('../geminiVirtualTryOnService');
 
       expect(isGeminiAvailable()).toBe(false);
     });
 
     it('should return true when GEMINI_API_KEY is set', async () => {
       process.env.GEMINI_API_KEY = 'test-api-key';
 
       const { isGeminiAvailable } = await import('../geminiVirtualTryOnService');
 
       expect(isGeminiAvailable()).toBe(true);
     });
 
     it('should return true when GOOGLE_API_KEY is set', async () => {
       process.env.GEMINI_API_KEY = '';
       process.env.GOOGLE_API_KEY = 'test-google-key';
 
       const { isGeminiAvailable } = await import('../geminiVirtualTryOnService');
 
       expect(isGeminiAvailable()).toBe(true);
     });
   });
 
   describe('processGeminiTryOn', () => {
     it('should return error when API is not configured', async () => {
       process.env.GEMINI_API_KEY = '';
       process.env.GOOGLE_API_KEY = '';
 
       const { processGeminiTryOn } = await import('../geminiVirtualTryOnService');
 
       const result = await processGeminiTryOn(
         'data:image/jpeg;base64,test',
         'data:image/jpeg;base64,test'
       );
 
       expect(result.success).toBe(false);
       expect(result.provider).toBe('gemini');
       expect(result.error).toContain('GEMINI_API_KEY');
     });
 
     it('should return result with processing time', async () => {
       process.env.GEMINI_API_KEY = '';
 
       const { processGeminiTryOn } = await import('../geminiVirtualTryOnService');
 
       const result = await processGeminiTryOn(
         'data:image/jpeg;base64,test',
         'data:image/jpeg;base64,test'
       );
 
       expect(result.processingTime).toBeDefined();
       expect(typeof result.processingTime).toBe('number');
       expect(result.processingTime).toBeGreaterThanOrEqual(0);
     });
   });
 
   describe('analyzeOutfitCompatibility', () => {
     it('should return default response when API is not configured', async () => {
       process.env.GEMINI_API_KEY = '';
       process.env.GOOGLE_API_KEY = '';
 
       const { analyzeOutfitCompatibility } = await import('../geminiVirtualTryOnService');
 
       const result = await analyzeOutfitCompatibility(
         'data:image/jpeg;base64,test',
         'data:image/jpeg;base64,test'
       );
 
       expect(result.compatible).toBe(true);
       expect(result.feedback).toContain('không khả dụng');
     });
   });
 
   describe('Helper Functions', () => {
     it('should handle base64 data URLs correctly', async () => {
       // Test via processGeminiTryOn since helpers are not exported
       process.env.GEMINI_API_KEY = '';
 
       const { processGeminiTryOn } = await import('../geminiVirtualTryOnService');
 
       // Should not throw with valid data URL
       const result = await processGeminiTryOn(
         'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
         'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
       );
 
       // Should return error for unconfigured API, not crash
       expect(result.success).toBe(false);
       expect(result.provider).toBe('gemini');
     });
 
     it('should handle raw base64 strings', async () => {
       process.env.GEMINI_API_KEY = '';
 
       const { processGeminiTryOn } = await import('../geminiVirtualTryOnService');
 
       // Raw base64 without data: prefix
       const result = await processGeminiTryOn(
         'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk',
         '/9j/4AAQSkZJRgABAQEASABIAAD'
       );
 
       expect(result.success).toBe(false);
       expect(result.provider).toBe('gemini');
     });
   });
 });

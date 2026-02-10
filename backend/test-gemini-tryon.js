 /**
  * Test script for Gemini Virtual Try-On (Primary Provider)
  * 
  * Usage:
  *   bun run test-gemini-tryon.js
  * 
  * Tests:
  * 1. Gemini API availability
  * 2. Image generation capability
  */
 
require('dotenv').config({ override: true });
 
 const { GoogleGenerativeAI } = require('@google/generative-ai');
 
 const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

// Debug: Show which key is being used
console.log('DEBUG: Raw GEMINI_API_KEY from env:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...${process.env.GEMINI_API_KEY.substring(process.env.GEMINI_API_KEY.length - 4)}` : 'NOT SET');
 
 async function testGeminiAvailability() {
   console.log('╔═══════════════════════════════════════════════════════════╗');
   console.log('║        Gemini Virtual Try-On Integration Test             ║');
   console.log('╚═══════════════════════════════════════════════════════════╝\n');
 
   // Check API Key
   console.log('1️⃣  Checking Gemini API Key...');
   if (!GEMINI_API_KEY) {
     console.log('   ❌ GEMINI_API_KEY not configured!');
     console.log('   💡 Set GEMINI_API_KEY or GOOGLE_API_KEY in .env file');
     return false;
   }
  console.log(`   ✅ API Key found (${GEMINI_API_KEY.substring(0, 5)}***...)`);
 
   // Initialize Gemini
   console.log('\n2️⃣  Initializing Gemini API...');
   const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
   console.log('   ✅ GoogleGenerativeAI initialized');
 
   // Test model access
   console.log('\n3️⃣  Testing model access...');
   const models = [
     'gemini-2.5-flash-preview-04-17',
     'gemini-2.0-flash',
     'gemini-1.5-flash',
   ];
 
   for (const modelName of models) {
     try {
       const model = genAI.getGenerativeModel({ model: modelName });
       const result = await model.generateContent('Say "Hello" in one word');
       const text = result.response.text();
       console.log(`   ✅ ${modelName}: ${text.trim().substring(0, 20)}`);
     } catch (error) {
      console.log(`   ⚠️  ${modelName}: ${error.message}`);
     }
   }
 
   // Test image generation models
   console.log('\n4️⃣  Testing image generation models...');
   const imageModels = [
     'gemini-2.5-flash-image',
     'gemini-3-pro-image-preview',
   ];
 
   for (const modelName of imageModels) {
     try {
       console.log(`   🔄 Testing ${modelName}...`);
       const model = genAI.getGenerativeModel({
         model: modelName,
         generationConfig: {
           temperature: 0.4,
           maxOutputTokens: 4096,
         },
       });
 
       const result = await model.generateContent([
         { text: 'Generate a simple 10x10 pixel red square image. Output ONLY the image.' },
       ]);
 
       const response = result.response;
       const parts = response.candidates?.[0]?.content?.parts || [];
       
       let hasImage = false;
       for (const part of parts) {
         if (part.inlineData) {
           hasImage = true;
           console.log(`   ✅ ${modelName}: Image generated (${part.inlineData.mimeType})`);
           break;
         }
       }
       
       if (!hasImage) {
         const text = response.text?.() || 'No response';
         console.log(`   ⚠️  ${modelName}: Text only - "${text.substring(0, 50)}..."`);
       }
     } catch (error) {
      console.log(`   ❌ ${modelName}: ${error.message}`);
     }
   }
 
   console.log('\n═══════════════════════════════════════════════════════════');
   console.log('✨ Test completed!\n');
   
   return true;
 }
 
 // Run test
 testGeminiAvailability().catch(console.error);

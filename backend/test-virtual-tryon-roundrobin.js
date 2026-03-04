 /**
  * Test script for Virtual Try-On Round-Robin Load Balancing
  * 
  * This script tests:
  * 1. Round-robin distribution across providers
  * 2. Health tracking functionality
  * 3. Failover behavior
  */
 
 const BASE_URL = process.env.API_URL || 'http://localhost:5000';
 
 // Small test image (1x1 pixel transparent PNG in base64)
 const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
 
 async function checkStatus() {
   console.log('\n📊 Checking providers status...\n');
   
   try {
     const response = await fetch(`${BASE_URL}/api/virtual-tryon/status`);
     const data = await response.json();
     
     console.log('Status Response:', JSON.stringify(data, null, 2));
     
     if (data.success && data.data.providers) {
       console.log('\n┌─────────────────────┬───────────┬────────────┐');
       console.log('│ Provider            │ Available │ Queue Size │');
       console.log('├─────────────────────┼───────────┼────────────┤');
       
       for (const provider of data.data.providers) {
         const available = provider.available ? '✅ Yes' : '❌ No';
         const queue = provider.queueSize ?? 'N/A';
         console.log(`│ ${provider.name.padEnd(19)} │ ${available.padEnd(9)} │ ${String(queue).padEnd(10)} │`);
       }
       
       console.log('└─────────────────────┴───────────┴────────────┘');
     }
     
     return data;
   } catch (error) {
     console.error('❌ Failed to check status:', error.message);
     return null;
   }
 }
 
 async function testTryOn(requestNumber) {
   console.log(`\n🔄 Request #${requestNumber} - Testing Virtual Try-On...`);
   
   const startTime = Date.now();
   
   try {
    const response = await fetch(`${BASE_URL}/api/virtual-tryon/process`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         personImage: TEST_IMAGE,
         garmentImage: TEST_IMAGE,
       }),
     });
     
     const data = await response.json();
     const elapsed = Date.now() - startTime;
     
     if (data.success) {
       console.log(`✅ Success! Provider: ${data.data.provider}, Time: ${elapsed}ms`);
     } else {
       console.log(`⚠️ Failed: ${data.error || data.message}`);
       // Extract provider info from error if available
       if (data.error) {
         const providers = data.error.match(/([A-Za-z-]+):/g);
         if (providers) {
           console.log(`   Tried providers: ${providers.map(p => p.replace(':', '')).join(' → ')}`);
         }
       }
     }
     
     return { success: data.success, provider: data.data?.provider, time: elapsed };
   } catch (error) {
     console.error(`❌ Request error: ${error.message}`);
     return { success: false, error: error.message };
   }
 }
 
 async function testRoundRobin() {
   console.log('╔═══════════════════════════════════════════════════════════╗');
   console.log('║     Virtual Try-On Round-Robin Load Balancing Test        ║');
   console.log('╚═══════════════════════════════════════════════════════════╝');
   
   // Step 1: Check initial status
   await checkStatus();
   
   // Step 2: Make multiple requests to test round-robin
   console.log('\n📤 Making 4 sequential requests to test round-robin...');
   console.log('   (Each request should start with a different provider)\n');
   
   const results = [];
   
   for (let i = 1; i <= 4; i++) {
     const result = await testTryOn(i);
     results.push(result);
     
     // Small delay between requests
     if (i < 4) {
       console.log('   ⏳ Waiting 2 seconds before next request...');
       await new Promise(resolve => setTimeout(resolve, 2000));
     }
   }
   
   // Step 3: Summary
   console.log('\n═══════════════════════════════════════════════════════════');
   console.log('📈 SUMMARY');
   console.log('═══════════════════════════════════════════════════════════');
   
   const successful = results.filter(r => r.success);
   const failed = results.filter(r => !r.success);
   
   console.log(`✅ Successful: ${successful.length}/${results.length}`);
   console.log(`❌ Failed: ${failed.length}/${results.length}`);
   
   if (successful.length > 0) {
     const providers = successful.map(r => r.provider);
     const uniqueProviders = [...new Set(providers)];
     console.log(`🔄 Providers used: ${providers.join(', ')}`);
     console.log(`📊 Unique providers: ${uniqueProviders.length}`);
     
     const avgTime = Math.round(successful.reduce((a, b) => a + b.time, 0) / successful.length);
     console.log(`⏱️ Average response time: ${avgTime}ms`);
   }
   
   // Step 4: Final status check
   await checkStatus();
   
   console.log('\n✨ Test completed!\n');
 }
 
 // Quick status check only
 async function quickCheck() {
   console.log('╔═══════════════════════════════════════════════════════════╗');
   console.log('║           Virtual Try-On Quick Status Check               ║');
   console.log('╚═══════════════════════════════════════════════════════════╝');
   
   await checkStatus();
 }
 
 // Parse command line args
 const args = process.argv.slice(2);
 
 if (args.includes('--status')) {
   quickCheck();
 } else if (args.includes('--single')) {
   testTryOn(1);
 } else {
   testRoundRobin();
 }

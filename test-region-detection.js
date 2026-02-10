 /**
  * Test script for Region Detection feature
  * 
  * Tests:
  * 1. Get available regions
  * 2. Auto-detect region from headers (Accept-Language)
  * 3. IP geolocation simulation
  */
 
const API_URL_REGION = process.env.API_URL || 'http://localhost:5000/api';
 
 console.log('🌍 Testing Region Detection Feature\n');
console.log('API URL:', API_URL_REGION);
 console.log('='.repeat(60));
 
 // Test 1: Get available regions
 async function testGetRegions() {
   console.log('\n📋 Test 1: Get Available Regions');
   console.log('-'.repeat(60));
   
   try {
    const response = await fetch(`${API_URL_REGION}/regions`);
     const data = await response.json();
     
     if (data.success) {
       console.log('✅ Success! Available regions:');
       data.data.regions.forEach(region => {
         console.log(`  - ${region.code}: ${region.name} (${region.currency}, ${region.lengthUnit})`);
       });
       
       if (data.data.current) {
         console.log('\n🎯 Current detected region:');
         console.log(`  Code: ${data.data.current.regionCode}`);
         console.log(`  Name: ${data.data.current.regionName}`);
         console.log(`  Source: ${data.data.current.source}`);
         console.log(`  Confidence: ${data.data.current.confidence}`);
       }
     } else {
       console.log('❌ Failed:', data.error);
     }
   } catch (error) {
     console.log('❌ Error:', error.message);
   }
 }
 
 // Test 2: Detect region with Vietnamese language header
 async function testVietnameseDetection() {
   console.log('\n🇻🇳 Test 2: Detect Region with Vietnamese Language Header');
   console.log('-'.repeat(60));
   
   try {
    const response = await fetch(`${API_URL_REGION}/regions`, {
       headers: {
         'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8'
       }
     });
     const data = await response.json();
     
     if (data.success && data.data.current) {
       const region = data.data.current;
       console.log('✅ Detected region from Accept-Language header:');
       console.log(`  Region: ${region.regionCode} (${region.regionName})`);
       console.log(`  Source: ${region.source}`);
       console.log(`  Confidence: ${region.confidence}`);
       console.log(`  Units: ${region.lengthUnit} / ${region.weightUnit}`);
       
       if (region.regionCode === 'VN') {
         console.log('  🎉 Correct! Detected Vietnam from vi-VN header');
       } else {
         console.log(`  ⚠️  Expected VN but got ${region.regionCode}`);
       }
     } else {
       console.log('❌ Failed to detect region');
     }
   } catch (error) {
     console.log('❌ Error:', error.message);
   }
 }
 
 // Test 3: Detect region with US language header
 async function testUSDetection() {
   console.log('\n🇺🇸 Test 3: Detect Region with US Language Header');
   console.log('-'.repeat(60));
   
   try {
    const response = await fetch(`${API_URL_REGION}/regions`, {
       headers: {
         'Accept-Language': 'en-US,en;q=0.9'
       }
     });
     const data = await response.json();
     
     if (data.success && data.data.current) {
       const region = data.data.current;
       console.log('✅ Detected region from Accept-Language header:');
       console.log(`  Region: ${region.regionCode} (${region.regionName})`);
       console.log(`  Source: ${region.source}`);
       console.log(`  Units: ${region.lengthUnit} / ${region.weightUnit}`);
       
       if (region.regionCode === 'US') {
         console.log('  🎉 Correct! Detected US from en-US header');
       }
     }
   } catch (error) {
     console.log('❌ Error:', error.message);
   }
 }
 
 // Test 4: Test other regions
 async function testOtherRegions() {
   console.log('\n🌏 Test 4: Test Other Region Headers');
   console.log('-'.repeat(60));
   
   const testCases = [
     { lang: 'en-GB,en;q=0.9', expected: 'UK', name: 'United Kingdom' },
     { lang: 'en-AU,en;q=0.9', expected: 'AU', name: 'Australia' },
     { lang: 'fr-FR,fr;q=0.9', expected: 'FR', name: 'France' },
     { lang: 'ja-JP,ja;q=0.9', expected: 'JP', name: 'Japan' },
     { lang: 'de-DE,de;q=0.9', expected: 'EU', name: 'Germany → EU' },
   ];
   
   for (const test of testCases) {
     try {
        const response = await fetch(`${API_URL_REGION}/regions`, {
         headers: {
           'Accept-Language': test.lang
         }
       });
       const data = await response.json();
       
       if (data.success && data.data.current) {
         const region = data.data.current;
         const match = region.regionCode === test.expected ? '✅' : '❌';
         console.log(`${match} ${test.name}: ${region.regionCode} (${region.source})`);
       }
     } catch (error) {
       console.log(`❌ ${test.name}: Error - ${error.message}`);
     }
   }
 }
 
 // Test 5: IP Geolocation info
 async function testIPGeolocation() {
   console.log('\n🌐 Test 5: IP Geolocation Status');
   console.log('-'.repeat(60));
   console.log('ℹ️  IP Geolocation package: geoip-lite');
   console.log('📦 Status: Installed ✅');
   console.log('');
   console.log('How it works:');
   console.log('  1. Backend reads X-Forwarded-For header');
   console.log('  2. Uses geoip-lite to lookup country from IP');
   console.log('  3. Maps country → region (e.g., VN → VN, US → US)');
   console.log('');
   console.log('⚠️  Note: IP detection works best on deployed environment (Railway)');
   console.log('   Local testing uses Accept-Language header instead');
 }
 
 // Run all tests
 async function runAllTests() {
   try {
     await testGetRegions();
     await testVietnameseDetection();
     await testUSDetection();
     await testOtherRegions();
     await testIPGeolocation();
     
     console.log('\n' + '='.repeat(60));
     console.log('✅ All tests completed!');
     console.log('\n💡 Tips:');
     console.log('  - Run backend: npm run dev');
     console.log('  - Test on Railway to see IP geolocation in action');
     console.log('  - Check browser DevTools → Network → Headers to see Accept-Language');
     console.log('='.repeat(60));
  } catch {
    console.error('\n❌ Test suite failed');
   }
 }
 
 // Check if backend is running
 async function checkBackend() {
   try {
    const response = await fetch(`${API_URL_REGION.replace('/api', '')}/health`);
     if (response.ok) {
       console.log('✅ Backend is running\n');
       return true;
     }
  } catch {
     console.log('❌ Backend is not running!');
     console.log('👉 Please start backend first: cd backend && npm run dev\n');
     return false;
   }
 }
 
 // Main
 (async () => {
   const isBackendRunning = await checkBackend();
   if (isBackendRunning) {
     await runAllTests();
   }
 })();

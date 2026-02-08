 /**
  * Test HuggingFace Virtual Try-On (Fallback Provider)
  */
 
 const HUGGINGFACE_SPACES = [
   { name: 'Nymbo/Virtual-Try-On', url: 'https://nymbo-virtual-try-on.hf.space' },
   { name: 'yisol/IDM-VTON', url: 'https://yisol-idm-vton.hf.space' },
   { name: 'levihsu/OOTDiffusion', url: 'https://levihsu-ootdiffusion.hf.space' },
 ];
 
 async function checkHuggingFaceStatus() {
   console.log('╔═══════════════════════════════════════════════════════════╗');
   console.log('║      HuggingFace Virtual Try-On Status Check              ║');
   console.log('╚═══════════════════════════════════════════════════════════╝\n');
 
   for (const space of HUGGINGFACE_SPACES) {
     try {
       console.log(`🔄 Checking ${space.name}...`);
       const controller = new AbortController();
       const timeout = setTimeout(() => controller.abort(), 10000);
       
       const response = await fetch(space.url, {
         method: 'GET',
         signal: controller.signal,
       });
       
       clearTimeout(timeout);
       
       if (response.ok) {
         console.log(`   ✅ ${space.name}: ONLINE (${response.status})`);
       } else {
         console.log(`   ⚠️  ${space.name}: Status ${response.status}`);
       }
     } catch (error) {
       const msg = error.name === 'AbortError' ? 'Timeout' : error.message;
       console.log(`   ❌ ${space.name}: ${msg}`);
     }
   }
 
   console.log('\n✨ Check completed!');
 }
 
 checkHuggingFaceStatus();

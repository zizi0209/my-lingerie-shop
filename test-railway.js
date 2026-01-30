#!/usr/bin/env node

const https = require('https');

const RAILWAY_URL = 'https://my-lingerie-shop-production-6286.up.railway.app';

async function testRailwayDeployment() {
  console.log('🚂 Testing Railway Deployment...\n');
  console.log(`URL: ${RAILWAY_URL}\n`);

  // Test 1: Health Check
  console.log('1️⃣  Testing health endpoint...');
  try {
    const healthData = await fetch(`${RAILWAY_URL}/api/health`);
    if (healthData.status === 200) {
      const data = await healthData.json();
      console.log('   ✅ Health check passed:', data);
    } else {
      console.log(`   ❌ Health check failed: ${healthData.status}`);
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    console.log('   💡 Railway deployment may not be ready yet');
  }

  console.log('');

  // Test 2: Public Config
  console.log('2️⃣  Testing public config endpoint...');
  try {
    const configData = await fetch(`${RAILWAY_URL}/api/public/config`);
    if (configData.status === 200) {
      const data = await configData.json();
      console.log('   ✅ Config endpoint working');
      console.log('   📋 Store Name:', data.data?.store_name || 'N/A');
      console.log('   🎨 Primary Color:', data.data?.primary_color || 'N/A');
    } else {
      console.log(`   ❌ Config endpoint failed: ${configData.status}`);
    }
  } catch (error) {
    console.log('   ❌ Config endpoint error:', error.message);
  }

  console.log('');

  // Test 3: Response Time
  console.log('3️⃣  Testing response time...');
  try {
    const start = Date.now();
    await fetch(`${RAILWAY_URL}/api/health`);
    const time = Date.now() - start;
    console.log(`   ⏱️  Response time: ${time}ms`);

    if (time < 500) {
      console.log('   ✅ Fast response (< 500ms)');
    } else if (time < 2000) {
      console.log('   ⚠️  Moderate response (500-2000ms)');
    } else {
      console.log('   ❌ Slow response (> 2000ms)');
    }
  } catch (error) {
    console.log('   ❌ Response time test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📝 Next steps:');
  console.log('1. Check Railway Dashboard for deployment status');
  console.log('2. Review build logs if any test failed');
  console.log('3. Verify DATABASE_URL is set in Variables');
  console.log('4. Run database migrations if needed');
  console.log('='.repeat(50));
}

// Polyfill fetch for Node.js < 18
if (typeof fetch === 'undefined') {
  global.fetch = function(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            json: async () => JSON.parse(data)
          });
        });
      }).on('error', reject);
    });
  };
}

testRailwayDeployment();

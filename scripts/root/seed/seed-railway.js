#!/usr/bin/env node

const RAILWAY_URL = 'https://my-lingerie-shop-production-6286.up.railway.app';

async function seedRailwayDatabase() {
  console.log('🌱 Seeding Railway Database...\n');
  console.log(`URL: ${RAILWAY_URL}\n`);

  try {
    // Seed SystemConfig
    console.log('1️⃣  Seeding SystemConfig...');
    const configRes = await fetch(`${RAILWAY_URL}/api/seed/system-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (configRes.ok) {
      const configData = await configRes.json();
      console.log('   ✅ SystemConfig seeded');
      console.log('   📋 Results:', JSON.stringify(configData.results, null, 2));
    } else {
      console.log(`   ❌ Failed: ${configRes.status}`);
      const error = await configRes.text();
      console.log('   Error:', error);
    }

    console.log('');

    // Seed Admin
    console.log('2️⃣  Seeding Admin User...');
    const adminRes = await fetch(`${RAILWAY_URL}/api/seed/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (adminRes.ok) {
      const adminData = await adminRes.json();
      console.log('   ✅ Admin user seeded');
      console.log('   📧 Email:', adminData.email);
      console.log('   🔑 Password: Check ADMIN_PASSWORD env variable');
    } else {
      console.log(`   ❌ Failed: ${adminRes.status}`);
      const error = await adminRes.text();
      console.log('   Error:', error);
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('✅ Database seeding complete!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    console.log('\n💡 Make sure Railway deployment is ready');
    console.log('   Run: node scripts/root/test/test-railway.js');
  }
}

// Polyfill fetch for Node.js < 18
if (typeof fetch === 'undefined') {
  const https = require('https');
  global.fetch = function(url, options = {}) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {},
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: async () => JSON.parse(data),
            text: async () => data,
          });
        });
      });
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  };
}

seedRailwayDatabase();

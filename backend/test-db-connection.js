#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testDatabaseConnection() {
  console.log('🔍 Testing Render Database Connection...\n');

  const dbUrl = process.env.DATABASE_URL || '';
  const dbHost = dbUrl.match(/\/\/[^@]+@([^:]+)/)?.[1] || 'unknown';

  console.log(`📍 Database Host: ${dbHost}`);
  console.log(`⏰ Testing at: ${new Date().toISOString()}\n`);

  try {
    console.log('⏳ Attempting to connect...');

    // Test 1: Raw connection
    const startTime = Date.now();
    await prisma.$connect();
    const connectTime = Date.now() - startTime;

    console.log(`✅ Connection successful! (${connectTime}ms)`);

    // Test 2: Query database
    console.log('\n⏳ Testing query...');
    const queryStart = Date.now();
    await prisma.$queryRaw`SELECT 1 as test`;
    const queryTime = Date.now() - queryStart;

    console.log(`✅ Query successful! (${queryTime}ms)`);

    // Test 3: Check tables
    console.log('\n⏳ Checking tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10
    `;

    console.log(`✅ Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));

    // Test 4: Check SystemConfig
    console.log('\n⏳ Checking SystemConfig table...');
    try {
      const configCount = await prisma.systemConfig.count();
      console.log(`✅ SystemConfig table exists with ${configCount} records`);

      if (configCount > 0) {
        const configs = await prisma.systemConfig.findMany({ take: 5 });
        console.log('\n📋 Sample configs:');
        configs.forEach(c => console.log(`   - ${c.key}: ${c.value}`));
      }
    } catch (err) {
      console.log('❌ SystemConfig table error:', err.message);
    }

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('🎉 Database is working correctly!');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ CONNECTION FAILED!\n');
    console.error('Error details:');
    console.error('  Code:', error.code);
    console.error('  Message:', error.message);

    if (error.message.includes("Can't reach database server")) {
      console.error('\n🔧 TROUBLESHOOTING STEPS:');
      console.error('  1. Check Render Dashboard: https://dashboard.render.com');
      console.error('  2. Verify database status is "Active"');
      console.error('  3. If suspended, click "Resume" to restart');
      console.error('  4. Wait 2-3 minutes for database to start');
      console.error('  5. Check connection string in .env file');
      console.error('\n📧 If issue persists, contact Render Support');
    }

    process.exit(1);

  } finally {
    await prisma.$disconnect();
  }
}

// Run test
testDatabaseConnection();

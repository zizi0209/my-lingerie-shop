const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemConfig() {
  try {
    console.log('Checking SystemConfig table...');

    const count = await prisma.systemConfig.count();
    console.log(`✓ SystemConfig table exists with ${count} records`);

    const configs = await prisma.systemConfig.findMany();
    console.log('\nExisting configs:');
    configs.forEach(c => console.log(`  - ${c.key}: ${c.value}`));

  } catch (error) {
    console.error('✗ Error:', error.message);
    if (error.code === 'P2021') {
      console.log('\n  Table "SystemConfig" does not exist in database');
      console.log('  Run: npx prisma migrate deploy');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemConfig();

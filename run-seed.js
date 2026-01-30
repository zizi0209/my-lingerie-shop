#!/usr/bin/env node

/**
 * Run seed script on Railway database
 * This connects to Railway PostgreSQL and runs the main seed
 */

const { exec } = require('child_process');
const path = require('path');

console.log('🌱 Running Database Seed on Railway...\n');

// Railway database is already configured in .env DATABASE_URL
// Just run the seed script
const seedCommand = 'cd backend && npx ts-node prisma/seed.ts';

console.log('Running: npx ts-node prisma/seed.ts');
console.log('This will seed:');
console.log('  - Roles & Permissions');
console.log('  - Admin User (from ADMIN_EMAIL/ADMIN_PASSWORD env)');
console.log('  - Test User (test@example.com / Test@12345)');
console.log('  - System Config (store info, colors, etc)');
console.log('  - Categories (6 product categories)');
console.log('  - Post Categories (4 blog categories)');
console.log('  - Sample Posts (2 articles)');
console.log('  - Coupons (NEWUSER50K, WELCOME10, FREESHIP)');
console.log('  - Point Rewards');
console.log('  - Page Sections (6 homepage sections)');
console.log('  - About Sections (8 about page sections)');
console.log('');

const childProcess = exec(seedCommand, {
  env: { ...process.env },
  cwd: process.cwd(),
});

childProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

childProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

childProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Test Accounts Created:');
    console.log('   Admin: ' + (process.env.ADMIN_EMAIL || 'admin@example.com'));
    console.log('   Password: ' + (process.env.ADMIN_PASSWORD || '(set in .env)'));
    console.log('   Test User: test@example.com / Test@12345');
    console.log('\n🎫 Voucher Codes: NEWUSER50K, WELCOME10, FREESHIP');
  } else {
    console.log(`\n❌ Seed failed with code ${code}`);
  }
  process.exit(code);
});

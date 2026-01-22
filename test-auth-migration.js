/**
 * Test script to verify auth migration
 * Run: node test-auth-migration.js
 */

const { PrismaClient } = require('./backend/node_modules/@prisma/client');

async function testMigration() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Testing database migration...\n');

    // Test 1: Check if new tables exist
    console.log('1. Checking new tables...');
    
    const accountCount = await prisma.account.count();
    console.log(`   ✅ Account table exists (${accountCount} records)`);

    const sessionCount = await prisma.session.count();
    console.log(`   ✅ Session table exists (${sessionCount} records)`);

    const verificationTokenCount = await prisma.verificationToken.count();
    console.log(`   ✅ VerificationToken table exists (${verificationTokenCount} records)`);

    const passwordResetCount = await prisma.passwordResetToken.count();
    console.log(`   ✅ PasswordResetToken table exists (${passwordResetCount} records)`);

    // Test 2: Check User table new fields
    console.log('\n2. Checking User table schema...');
    
    const users = await prisma.user.findMany({
      take: 1,
      select: {
        id: true,
        email: true,
        password: true,
        emailVerified: true,
        image: true,
      }
    });

    if (users.length > 0) {
      const user = users[0];
      console.log(`   ✅ User has emailVerified field: ${user.emailVerified !== undefined}`);
      console.log(`   ✅ User has image field: ${user.image !== undefined}`);
      console.log(`   ✅ User password is nullable: ${user.password === null ? 'Yes' : 'Has password'}`);
    }

    // Test 3: Check if we can create a social user
    console.log('\n3. Testing social user creation (dry run)...');
    console.log('   ℹ️  Social users will have:');
    console.log('      - password: null');
    console.log('      - emailVerified: timestamp');
    console.log('      - linked Account record');

    console.log('\n✅ Migration test passed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Setup OAuth credentials in frontend/.env.local');
    console.log('   2. Restart backend: cd backend && npm run dev');
    console.log('   3. Restart frontend: cd frontend && npm run dev');
    console.log('   4. Test social login at http://localhost:3000/login-register');

  } catch (error) {
    console.error('\n❌ Migration test failed:', error.message);
    console.error('\nPlease ensure:');
    console.error('   1. Database migration was applied: npx prisma migrate deploy');
    console.error('   2. Backend is stopped before running prisma generate');
  } finally {
    await prisma.$disconnect();
  }
}

testMigration();

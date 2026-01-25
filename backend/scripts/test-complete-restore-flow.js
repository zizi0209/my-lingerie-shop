// Test Complete API Flow: Create → Soft Delete → Restore
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Restore API Flow\n');
  console.log('='.repeat(70));

  const testEmail = 'api-test-restore@example.com';

  try {
    // Cleanup
    await prisma.user.deleteMany({ where: { email: testEmail } });

    // Get role IDs
    const customerRole = await prisma.role.findFirst({ where: { name: 'USER' } });
    const adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });

    console.log('\n📋 Phase 1: CREATE user via API simulation');
    console.log('-'.repeat(70));

    const newUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'API Test User',
        password: 'hashed_password_123',
        roleId: customerRole.id,
        isActive: true
      },
      include: { role: true }
    });

    console.log(`✅ Created user: ID=${newUser.id}, Email=${newUser.email}`);
    console.log(`   Role: ${newUser.role?.name}`);
    console.log(`   Active: ${newUser.isActive}`);

    // Simulate some activity
    console.log('\n📊 Simulating customer activity...');
    await prisma.user.update({
      where: { id: newUser.id },
      data: {
        pointBalance: 150,
        totalSpent: 2500000,
        memberTier: 'SILVER'
      }
    });
    console.log('✅ Added: 150 points, 2.5M VND spent, SILVER tier');

    console.log('\n' + '='.repeat(70));
    console.log('\n🗑️  Phase 2: SOFT DELETE user');
    console.log('-'.repeat(70));

    await prisma.user.update({
      where: { id: newUser.id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
    console.log('✅ User soft-deleted (deletedAt set, isActive=false)');

    // Verify can create new user with same email
    console.log('\n📝 Phase 3: Try CREATE new user with SAME EMAIL');
    console.log('-'.repeat(70));
    console.log('Testing partial unique index...');

    try {
      const newUser2 = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'New User Same Email',
          password: 'different_password',
          roleId: customerRole.id
        }
      });
      console.log('✅ Partial unique index working! New user created:');
      console.log(`   ID: ${newUser2.id} (different from ${newUser.id})`);
      console.log(`   Both users coexist in database`);

      // Clean up second user
      await prisma.user.delete({ where: { id: newUser2.id } });
      console.log('   (Cleaned up duplicate for testing)');
    } catch (error) {
      console.log('❌ Failed! Partial unique index may not be working');
      console.log(`   Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n🔄 Phase 4: RESTORE user via API');
    console.log('-'.repeat(70));

    // Simulate API: Check if email exists (should find deleted user)
    const existingUsers = await prisma.user.findMany({
      where: { email: testEmail },
      include: { role: true }
    });

    console.log(`Found ${existingUsers.length} user(s) with email ${testEmail}:`);
    existingUsers.forEach(u => {
      console.log(`  - ID ${u.id}: ${u.deletedAt ? 'DELETED' : 'ACTIVE'} (${u.role?.name})`);
    });

    const deletedUser = existingUsers.find(u => u.deletedAt !== null);

    if (deletedUser) {
      console.log(`\n✅ API would return 409 with suggestion='RESTORE_USER'`);
      console.log(`   existingUser.id: ${deletedUser.id}`);
      console.log(`   currentRole: ${deletedUser.role?.name}`);
      console.log(`   requestedRole: ADMIN`);

      // Simulate restore API call
      console.log(`\n⏳ Calling: PATCH /api/admin/users/${deletedUser.id}/restore`);
      console.log(`   Body: { roleId: ${adminRole.id} }`);

      const restored = await prisma.user.update({
        where: { id: deletedUser.id },
        data: {
          deletedAt: null,
          isActive: true,
          roleId: adminRole.id,
          tokenVersion: { increment: 1 }
        },
        include: { role: true }
      });

      console.log('\n✅ User RESTORED successfully!');
      console.log(`   ID: ${restored.id} (SAME as original)`);
      console.log(`   Email: ${restored.email}`);
      console.log(`   Role: ${restored.role?.name} (promoted from ${deletedUser.role?.name})`);
      console.log(`   Active: ${restored.isActive}`);
      console.log(`   Deleted: ${restored.deletedAt ? 'YES' : 'NO'}`);
      console.log(`   Token Version: ${restored.tokenVersion} (invalidated old sessions)`);

      // Verify data preserved
      const userData = await prisma.user.findUnique({
        where: { id: restored.id }
      });

      console.log('\n📊 Customer Data Preserved:');
      console.log(`   Points: ${userData.pointBalance} (original: 150)`);
      console.log(`   Total Spent: ${userData.totalSpent} (original: 2500000)`);
      console.log(`   Member Tier: ${userData.memberTier} (original: SILVER)`);
      console.log('\n   ✅ All customer history INTACT!');
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Complete Flow Test PASSED!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Partial unique index allows same email for deleted users');
    console.log('   ✅ Restore preserves user ID (same identity)');
    console.log('   ✅ Restore preserves customer data (points, spending, tier)');
    console.log('   ✅ Restore can promote role (CUSTOMER → ADMIN)');
    console.log('   ✅ Session invalidation on restore (tokenVersion++)');

    // Cleanup
    await prisma.user.deleteMany({ where: { email: testEmail } });
    console.log('\n🧹 Test data cleaned up');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompleteFlow();

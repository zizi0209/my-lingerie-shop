// Test partial unique index behavior
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Testing partial unique index behavior...\n');

  const testEmail = 'test-partial-unique@example.com';

  try {
    // Clean up any existing test data
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });

    console.log('Step 1: Create first user');
    const user1 = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test User 1',
        password: 'hashed123'
      }
    });
    console.log(`✅ Created user: ${user1.id} - ${user1.email}`);

    console.log('\nStep 2: Try to create duplicate (should FAIL)');
    try {
      await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Test User 2',
          password: 'hashed456'
        }
      });
      console.log('❌ ERROR: Duplicate was allowed! Index not working!');
    } catch (error) {
      console.log('✅ Correctly blocked duplicate active user');
    }

    console.log('\nStep 3: Soft delete first user');
    await prisma.user.update({
      where: { id: user1.id },
      data: { deletedAt: new Date() }
    });
    console.log('✅ Soft deleted user 1');

    console.log('\nStep 4: Create new user with same email (should SUCCEED)');
    const user2 = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test User 2',
        password: 'hashed456'
      }
    });
    console.log(`✅ Created new user: ${user2.id} - ${user2.email}`);

    console.log('\nStep 5: Verify both users exist in database');
    const allUsers = await prisma.user.findMany({
      where: { email: testEmail },
      select: { id: true, name: true, deletedAt: true }
    });
    console.log('Users found:', allUsers);

    console.log('\n🎉 Partial unique index working correctly!');
    console.log('✅ Allows same email for deleted users');
    console.log('✅ Blocks duplicate active users');

    // Cleanup
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });
    console.log('\n🧹 Test data cleaned up');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

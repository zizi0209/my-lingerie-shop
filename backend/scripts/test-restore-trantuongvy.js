// Test Restore API for trantuongvy131@gmail.com
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRestoreFlow() {
  console.log('🧪 Testing Restore Flow for trantuongvy131@gmail.com\n');
  console.log('='.repeat(60));

  const testEmail = 'trantuongvy131@gmail.com';

  try {
    // Step 1: Find user (active or deleted)
    console.log('\n📋 Step 1: Find user in database');
    const users = await prisma.user.findMany({
      where: { email: testEmail },
      include: {
        role: { select: { id: true, name: true } },
        orders: { select: { id: true }, take: 5 },
        reviews: { select: { id: true }, take: 5 }
      }
    });

    if (users.length === 0) {
      console.log('❌ User not found in database');
      console.log('💡 User might have been hard-deleted or never existed');
      return;
    }

    console.log(`✅ Found ${users.length} user(s) with this email:\n`);
    users.forEach((user, index) => {
      console.log(`User #${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role?.name || 'No role'}`);
      console.log(`  Active: ${user.isActive}`);
      console.log(`  Deleted: ${user.deletedAt ? '✓ YES (soft-deleted)' : '✗ NO (active)'}`);
      console.log(`  Orders: ${user.orders.length}`);
      console.log(`  Reviews: ${user.reviews.length}`);
      console.log(`  Points: ${user.pointBalance}`);
      console.log('');
    });

    // Step 2: Find deleted user
    const deletedUser = users.find(u => u.deletedAt !== null);
    const activeUser = users.find(u => u.deletedAt === null);

    if (deletedUser) {
      console.log('='.repeat(60));
      console.log('\n🔄 Step 2: Restore Deleted User');
      console.log(`User ID: ${deletedUser.id}`);
      console.log(`Current Role: ${deletedUser.role?.name || 'No role'}`);
      console.log(`Deleted At: ${deletedUser.deletedAt}`);

      // Get ADMIN role ID
      const adminRole = await prisma.role.findFirst({
        where: { name: 'ADMIN' }
      });

      if (!adminRole) {
        console.log('❌ ADMIN role not found in database');
        return;
      }

      console.log(`\nTarget Role: ADMIN (ID: ${adminRole.id})`);
      console.log('\n⏳ Restoring user...');

      // Restore user
      const restored = await prisma.user.update({
        where: { id: deletedUser.id },
        data: {
          deletedAt: null,
          isActive: true,
          roleId: adminRole.id,
          tokenVersion: { increment: 1 }
        },
        include: {
          role: { select: { id: true, name: true } }
        }
      });

      console.log('✅ User restored successfully!\n');
      console.log('Restored User Info:');
      console.log(`  ID: ${restored.id}`);
      console.log(`  Email: ${restored.email}`);
      console.log(`  Name: ${restored.name}`);
      console.log(`  Role: ${restored.role?.name}`);
      console.log(`  Active: ${restored.isActive}`);
      console.log(`  Deleted: ${restored.deletedAt ? 'YES' : 'NO'}`);
      console.log(`  Token Version: ${restored.tokenVersion} (sessions invalidated)`);

      // Check if needs password setup
      console.log(`\n🔐 Password Status:`);
      if (restored.password) {
        console.log('  ✅ Has password - Can login to admin dashboard');
      } else {
        console.log('  ⚠️  No password - Needs password setup for admin access');
        console.log('  📧 Should send password setup email');
        console.log('  🔗 Setup URL: /set-admin-password/{token}');
      }

      // Show customer data preserved
      const [orderCount, reviewCount, wishlistCount] = await Promise.all([
        prisma.order.count({ where: { userId: restored.id } }),
        prisma.review.count({ where: { userId: restored.id } }),
        prisma.wishlistItem.count({ where: { userId: restored.id } })
      ]);

      console.log(`\n📊 Preserved Customer Data:`);
      console.log(`  Orders: ${orderCount}`);
      console.log(`  Reviews: ${reviewCount}`);
      console.log(`  Wishlist: ${wishlistCount}`);
      console.log(`  Points: ${restored.pointBalance}`);
      console.log(`  Total Spent: $${restored.totalSpent}`);
      console.log(`  Member Tier: ${restored.memberTier}`);

    } else if (activeUser) {
      console.log('='.repeat(60));
      console.log('\n✅ User is ACTIVE (not deleted)');
      console.log('No need to restore');
      console.log(`\nCurrent Status:`);
      console.log(`  ID: ${activeUser.id}`);
      console.log(`  Role: ${activeUser.role?.name}`);
      console.log(`  Active: ${activeUser.isActive}`);

      if (activeUser.role?.name !== 'ADMIN') {
        console.log(`\n💡 If you want to promote to ADMIN, use:`);
        console.log(`   PATCH /api/admin/users/${activeUser.id}/promote-role`);
        console.log(`   Body: { "newRoleId": ${(await prisma.role.findFirst({ where: { name: 'ADMIN' } }))?.id} }`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error.code === 'P2002') {
      console.log('\n💡 This is a unique constraint error');
      console.log('   The partial unique index is working!');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testRestoreFlow();

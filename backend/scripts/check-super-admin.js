const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkSuperAdmin() {
  try {
    console.log('\n🔍 Checking Super Admin account: admin@mylingerie.com...\n');

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: 'admin@mylingerie.com' },
      include: {
        role: { select: { id: true, name: true } }
      }
    });

    if (!user) {
      console.log('❌ User NOT FOUND');
      console.log('\n📋 All admin users in database:');

      const allAdmins = await prisma.user.findMany({
        where: {
          role: {
            name: { in: ['ADMIN', 'SUPER_ADMIN'] }
          }
        },
        include: {
          role: { select: { name: true } }
        }
      });

      allAdmins.forEach((admin) => {
        console.log(`   ID: ${admin.id} | Email: ${admin.email} | Role: ${admin.role?.name} | Active: ${admin.isActive} | Password: ${admin.password ? 'YES' : 'NO'}`);
      });

      return;
    }

    console.log('✅ User FOUND:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Role: ${user.role?.name}`);
    console.log(`   Has Password: ${user.password ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Active: ${user.isActive ? 'YES ✅' : 'NO ❌'}`);
    console.log(
      `   Deleted: ${user.deletedAt ? `YES ❌ (${user.deletedAt.toISOString()})` : 'NO ✅'}`
    );
    console.log(`   Token Version: ${user.tokenVersion}`);
    console.log(`   Failed Login Attempts: ${user.failedLoginAttempts}`);
    console.log(`   Locked Until: ${user.lockedUntil ? user.lockedUntil.toISOString() : 'Not locked'}`);

    // Test password
    if (user.password) {
      console.log('\n🔐 Testing password: "AdminSecure123!@#"...');
      const testPassword = 'AdminSecure123!@#';
      const isMatch = await bcrypt.compare(testPassword, user.password);

      if (isMatch) {
        console.log('   ✅ Password MATCHES!');
      } else {
        console.log('   ❌ Password DOES NOT MATCH');
        console.log('   The password in database is different from "AdminSecure123!@#"');
      }
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      console.log('\n⚠️  ACCOUNT IS LOCKED');
      console.log(`   Locked until: ${user.lockedUntil.toISOString()}`);
      console.log(`   Reason: Too many failed login attempts (${user.failedLoginAttempts})`);
    }

    // Check if account is inactive
    if (!user.isActive) {
      console.log('\n⚠️  ACCOUNT IS INACTIVE');
      console.log('   The account needs to be activated');
    }

    // Check if account is deleted
    if (user.deletedAt) {
      console.log('\n⚠️  ACCOUNT IS SOFT-DELETED');
      console.log(`   Deleted at: ${user.deletedAt.toISOString()}`);
      console.log('   The account needs to be restored');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperAdmin();

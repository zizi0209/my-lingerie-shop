const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPasswordSetupToken() {
  try {
    console.log('\n🔍 Checking password setup tokens for trantuongvy131@gmail.com...\n');

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: 'trantuongvy131@gmail.com' },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: { select: { name: true } },
        isActive: true,
        deletedAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 User Info:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role?.name}`);
    console.log(`   Has Password: ${user.password ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Active: ${user.isActive ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Deleted: ${user.deletedAt ? 'YES ❌' : 'NO ✅'}`);

    // Find password setup tokens
    const tokens = await prisma.passwordSetupToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`\n🎫 Password Setup Tokens: ${tokens.length} found\n`);

    if (tokens.length === 0) {
      console.log('⚠️  No password setup tokens found!');
      console.log('\n📧 This means either:');
      console.log('   1. Email was not sent (check backend logs)');
      console.log('   2. Token was already used and deleted');
      console.log('   3. Restore/Promote flow did not trigger email sending');
    } else {
      tokens.forEach((token, index) => {
        const isExpired = new Date(token.expiresAt) < new Date();
        const isUsed = token.usedAt !== null;

        console.log(`Token #${index + 1}:`);
        console.log(`   ID: ${token.id}`);
        console.log(`   Purpose: ${token.purpose}`);
        console.log(`   Created: ${token.createdAt.toISOString()}`);
        console.log(`   Expires: ${token.expiresAt.toISOString()}`);
        console.log(`   Status: ${isUsed ? '✅ USED' : isExpired ? '❌ EXPIRED' : '🟢 VALID'}`);
        console.log(`   Used At: ${token.usedAt ? token.usedAt.toISOString() : 'Not used yet'}`);
        console.log('');
      });
    }

    // Check audit logs for email sending
    console.log('\n📋 Checking audit logs for email activity...\n');

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resourceId: String(user.id),
        action: {
          in: ['ADMIN_PASSWORD_SETUP_EMAIL_SENT', 'USER_RESTORED', 'PROMOTE_USER_ROLE']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    if (auditLogs.length === 0) {
      console.log('⚠️  No audit logs found for this user');
    } else {
      auditLogs.forEach((log) => {
        console.log(`${log.action}:`);
        console.log(`   Time: ${log.createdAt ? log.createdAt.toISOString() : 'N/A'}`);
        console.log(`   Severity: ${log.severity}`);
        if (log.newValue) {
          console.log(`   Details: ${JSON.stringify(log.newValue, null, 2)}`);
        }
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswordSetupToken();

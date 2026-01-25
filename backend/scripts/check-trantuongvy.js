const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findFirst({
    where: { email: 'trantuongvy131@gmail.com' },
    include: { role: true }
  });

  console.log('\n📧 User: trantuongvy131@gmail.com');
  console.log('='.repeat(50));

  if (!user) {
    console.log('❌ User not found');
  } else {
    console.log(`✅ User Found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role?.name}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Deleted: ${user.deletedAt ? 'YES ⚠️' : 'NO ✅'}`);
    console.log(`   Has Password: ${user.password ? 'YES ✅' : 'NO ⚠️'}`);
    console.log(`   Token Version: ${user.tokenVersion}`);

    if (!user.password && (user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN')) {
      console.log('\n⚠️  STATUS: Needs password setup for admin access');
      console.log('📧 Should send: Password setup email');
    } else if (user.password && (user.role?.name === 'ADMIN' || user.role?.name === 'SUPER_ADMIN')) {
      console.log('\n✅ STATUS: Ready to login to admin dashboard');
    }
  }

  await prisma.$disconnect();
}

checkUser();

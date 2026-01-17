const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Find admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@mylingerie.com' },
    include: { role: true }
  });
  
  if (!admin) {
    console.log('❌ Admin user NOT FOUND!');
    return;
  }
  
  console.log('✅ Admin user found:');
  console.log('   ID:', admin.id);
  console.log('   Email:', admin.email);
  console.log('   Name:', admin.name);
  console.log('   Role:', admin.role?.name);
  console.log('   isActive:', admin.isActive);
  console.log('   Password hash:', admin.password.substring(0, 20) + '...');
  
  // Test password
  const testPassword = 'AdminSecure123!@#';
  const isMatch = await bcrypt.compare(testPassword, admin.password);
  console.log('');
  console.log('🔑 Password test:', isMatch ? '✅ MATCH' : '❌ NOT MATCH');
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());

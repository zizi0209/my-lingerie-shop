import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Admin Role if not exists
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator with full system access'
    }
  });

  console.log('✅ Admin role created/updated');

  // 2. Create Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super Administrator with unrestricted access'
    }
  });

  console.log('✅ Super Admin role created/updated');

  // 3. Create User Role
  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Regular customer user'
    }
  });

  console.log('✅ User role created/updated');

  // 4. Create Super Admin User
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('❌ ADMIN_PASSWORD environment variable is required');
  }

  if (adminPassword.length < 12) {
    throw new Error('❌ Admin password must be at least 12 characters');
  }

  // Check password strength
  const hasUpperCase = /[A-Z]/.test(adminPassword);
  const hasLowerCase = /[a-z]/.test(adminPassword);
  const hasNumber = /[0-9]/.test(adminPassword);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    throw new Error('❌ Admin password must contain uppercase, lowercase, and numbers');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      roleId: superAdminRole.id,
      passwordChangedAt: new Date(),
      isActive: true
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'System Administrator',
      roleId: superAdminRole.id,
      passwordChangedAt: new Date(),
      isActive: true,
      failedLoginAttempts: 0,
      tokenVersion: 0
    }
  });

  console.log('✅ Super Admin user created/updated:');
  console.log(`   📧 Email: ${admin.email}`);
  console.log(`   🔑 Role: SUPER_ADMIN (ID: ${superAdminRole.id})`);
  console.log(`   🆔 User ID: ${admin.id}`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the admin password after first login!');
  console.log('⚠️  Current password is stored in .env file');

  // 5. Create some basic permissions (optional)
  const permissions = [
    { name: 'users.read', description: 'View users' },
    { name: 'users.write', description: 'Create/update users' },
    { name: 'users.delete', description: 'Delete users' },
    { name: 'products.read', description: 'View products' },
    { name: 'products.write', description: 'Create/update products' },
    { name: 'products.delete', description: 'Delete products' },
    { name: 'orders.read', description: 'View orders' },
    { name: 'orders.write', description: 'Update orders' },
    { name: 'settings.write', description: 'Modify system settings' }
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);
  console.log('');
  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

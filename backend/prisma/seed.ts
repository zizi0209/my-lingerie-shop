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

  // 6. Create New User Welcome Coupon (System coupon)
  const newUserCoupon = await prisma.coupon.upsert({
    where: { code: 'NEWUSER50K' },
    update: {
      name: 'Giảm 50K cho thành viên mới',
      discountType: 'FIXED_AMOUNT',
      discountValue: 50000,
      minOrderValue: 300000,
      couponType: 'NEW_USER',
      isSystem: true,
      isPublic: false,
      isActive: true
    },
    create: {
      code: 'NEWUSER50K',
      name: 'Giảm 50K cho thành viên mới',
      description: 'Voucher chào mừng thành viên mới - Giảm 50,000đ cho đơn hàng từ 300,000đ',
      discountType: 'FIXED_AMOUNT',
      discountValue: 50000,
      minOrderValue: 300000,
      maxUsagePerUser: 1,
      couponType: 'NEW_USER',
      isSystem: true,
      isPublic: false,
      isActive: true
    }
  });

  console.log(`✅ New User Welcome Coupon created: ${newUserCoupon.code}`);

  // 7. Create sample public coupon for testing
  const publicCoupon = await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {
      name: 'Giảm 10% đơn hàng',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxDiscount: 100000,
      minOrderValue: 200000,
      couponType: 'PUBLIC',
      isSystem: false,
      isPublic: true,
      isActive: true
    },
    create: {
      code: 'WELCOME10',
      name: 'Giảm 10% đơn hàng',
      description: 'Giảm 10% tối đa 100K cho đơn từ 200K',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxDiscount: 100000,
      minOrderValue: 200000,
      quantity: 1000,
      maxUsagePerUser: 1,
      couponType: 'PUBLIC',
      isSystem: false,
      isPublic: true,
      isActive: true
    }
  });

  console.log(`✅ Public Coupon created: ${publicCoupon.code}`);

  // 8. Create sample Point Reward
  const pointReward = await prisma.pointReward.upsert({
    where: { id: 1 },
    update: {
      name: 'Voucher giảm 50K',
      pointCost: 500,
      rewardType: 'DISCOUNT',
      discountValue: 50000,
      discountType: 'FIXED_AMOUNT',
      isActive: true
    },
    create: {
      name: 'Voucher giảm 50K',
      description: 'Đổi 500 điểm lấy voucher giảm 50,000đ',
      pointCost: 500,
      rewardType: 'DISCOUNT',
      discountValue: 50000,
      discountType: 'FIXED_AMOUNT',
      isActive: true
    }
  });

  console.log(`✅ Point Reward created: ${pointReward.name} (${pointReward.pointCost} điểm)`);

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

/**
 * Main Database Seed Script
 * Tạo dữ liệu cơ bản cần thiết để ứng dụng hoạt động
 * 
 * Chạy: npx ts-node prisma/seed.ts
 * Hoặc: npm run seed
 */

import { PrismaClient, ProductType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================
  // 1. ROLES & PERMISSIONS
  // ============================================
  console.log('👥 Seeding Roles & Permissions...');

  const roles = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with unrestricted access' },
    { name: 'ADMIN', description: 'Administrator with full system access' },
    { name: 'USER', description: 'Regular customer user' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
  console.log(`   ✅ ${roles.length} roles`);

  const permissions = [
    { name: 'users.read', description: 'View users' },
    { name: 'users.write', description: 'Create/update users' },
    { name: 'users.delete', description: 'Delete users' },
    { name: 'products.read', description: 'View products' },
    { name: 'products.write', description: 'Create/update products' },
    { name: 'products.delete', description: 'Delete products' },
    { name: 'orders.read', description: 'View orders' },
    { name: 'orders.write', description: 'Update orders' },
    { name: 'settings.write', description: 'Modify system settings' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
  }
  console.log(`   ✅ ${permissions.length} permissions`);

  // ============================================
  // 2. ADMIN USER
  // ============================================
  console.log('\n🔐 Seeding Admin User...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw new Error('❌ ADMIN_PASSWORD environment variable is required');
  }

  if (adminPassword.length < 12) {
    throw new Error('❌ Admin password must be at least 12 characters');
  }

  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedAdminPassword,
      roleId: superAdminRole!.id,
      passwordChangedAt: new Date(),
      isActive: true,
    },
    create: {
      email: adminEmail,
      password: hashedAdminPassword,
      name: 'System Administrator',
      roleId: superAdminRole!.id,
      passwordChangedAt: new Date(),
      isActive: true,
    },
  });
  console.log(`   ✅ Admin: ${admin.email}`);

  // ============================================
  // 3. TEST USER
  // ============================================
  console.log('\n👤 Seeding Test User...');

  const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });
  const testUserPassword = await bcrypt.hash('Test@12345', 12);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      password: testUserPassword,
      roleId: userRole!.id,
      isActive: true,
    },
    create: {
      email: 'test@example.com',
      password: testUserPassword,
      name: 'Test User',
      phone: '0901234567',
      roleId: userRole!.id,
      isActive: true,
      pointBalance: 1000,
      memberTier: 'SILVER',
    },
  });
  console.log(`   ✅ Test User: ${testUser.email} / Test@12345`);

  // ============================================
  // 4. SYSTEM CONFIG
  // ============================================
  console.log('\n⚙️ Seeding System Config...');

  const systemConfigs = [
    { key: 'store_name', value: 'My Lingerie Shop' },
    { key: 'primary_color', value: '#f43f5e' },
    { key: 'store_description', value: 'Cửa hàng nội y cao cấp' },
    { key: 'store_email', value: 'contact@mylingerie.com' },
    { key: 'store_phone', value: '0901234567' },
    { key: 'store_address', value: 'TP. Hồ Chí Minh, Việt Nam' },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }
  console.log(`   ✅ ${systemConfigs.length} system configs`);

  // ============================================
  // 5. CATEGORIES
  // ============================================
  console.log('\n📁 Seeding Categories...');

  const categories = [
    { name: 'Áo lót', slug: 'ao-lot', productType: 'BRA' as ProductType },
    { name: 'Quần lót', slug: 'quan-lot', productType: 'PANTY' as ProductType },
    { name: 'Set đồ lót', slug: 'set-do-lot', productType: 'SET' as ProductType },
    { name: 'Đồ ngủ', slug: 'do-ngu', productType: 'SLEEPWEAR' as ProductType },
    { name: 'Đồ định hình', slug: 'do-dinh-hinh', productType: 'SHAPEWEAR' as ProductType },
    { name: 'Phụ kiện', slug: 'phu-kien', productType: 'ACCESSORY' as ProductType },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, productType: cat.productType },
      create: cat,
    });
  }
  console.log(`   ✅ ${categories.length} categories`);

  // ============================================
  // 6. POST CATEGORIES
  // ============================================
  console.log('\n📝 Seeding Post Categories...');

  const postCategories = [
    { name: 'Mẹo & Hướng dẫn', slug: 'meo-huong-dan' },
    { name: 'Xu hướng thời trang', slug: 'xu-huong-thoi-trang' },
    { name: 'Chăm sóc cơ thể', slug: 'cham-soc-co-the' },
    { name: 'Tin tức', slug: 'tin-tuc' },
  ];

  for (const cat of postCategories) {
    await prisma.postCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
  }
  console.log(`   ✅ ${postCategories.length} post categories`);

  // ============================================
  // 7. SAMPLE POSTS
  // ============================================
  console.log('\n📰 Seeding Sample Posts...');

  const postCat = await prisma.postCategory.findFirst({ where: { slug: 'meo-huong-dan' } });

  if (postCat) {
    const posts = [
      {
        title: 'Cách chọn áo ngực phù hợp với vóc dáng',
        slug: 'cach-chon-ao-nguc-phu-hop-voi-voc-dang',
        excerpt: 'Hướng dẫn chi tiết cách đo size và chọn kiểu áo ngực phù hợp.',
        content: '<h2>Tại sao việc chọn đúng size quan trọng?</h2><p>Việc mặc áo ngực đúng size giúp bạn thoải mái và tốt cho sức khỏe.</p>',
        thumbnail: 'https://picsum.photos/seed/post1/800/600',
        categoryId: postCat.id,
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(),
        views: 1250,
        likeCount: 45,
      },
      {
        title: 'Xu hướng nội y xuân hè 2025',
        slug: 'xu-huong-noi-y-xuan-he-2025',
        excerpt: 'Khám phá những xu hướng nội y hot nhất mùa xuân hè.',
        content: '<h2>Màu sắc trendy</h2><p>Các tông màu pastel như hồng nude, xanh mint và lavender đang lên ngôi.</p>',
        thumbnail: 'https://picsum.photos/seed/post2/800/600',
        categoryId: postCat.id,
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(),
        views: 890,
        likeCount: 32,
      },
    ];

    for (const post of posts) {
      await prisma.post.upsert({
        where: { slug: post.slug },
        update: { title: post.title, content: post.content },
        create: post,
      });
    }
    console.log(`   ✅ ${posts.length} sample posts`);
  }

  // ============================================
  // 8. COUPONS & REWARDS
  // ============================================
  console.log('\n🎫 Seeding Coupons & Rewards...');

  const coupons = [
    {
      code: 'NEWUSER50K',
      name: 'Giảm 50K cho thành viên mới',
      description: 'Voucher chào mừng thành viên mới',
      discountType: 'FIXED_AMOUNT',
      discountValue: 50000,
      minOrderValue: 300000,
      maxUsagePerUser: 1,
      couponType: 'NEW_USER',
      isSystem: true,
      isPublic: false,
    },
    {
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
      isPublic: true,
    },
    {
      code: 'FREESHIP',
      name: 'Miễn phí vận chuyển',
      description: 'Free ship cho đơn từ 400K',
      category: 'SHIPPING',
      discountType: 'FREE_SHIPPING',
      discountValue: 30000,
      minOrderValue: 400000,
      quantity: 500,
      couponType: 'PUBLIC',
      isPublic: true,
    },
  ];

  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: { name: coupon.name },
      create: {
        ...coupon,
        isActive: true,
      },
    });
  }
  console.log(`   ✅ ${coupons.length} coupons`);

  // Point Reward
  await prisma.pointReward.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Voucher giảm 50K',
      description: 'Đổi 500 điểm lấy voucher giảm 50,000đ',
      pointCost: 500,
      rewardType: 'DISCOUNT',
      discountValue: 50000,
      discountType: 'FIXED_AMOUNT',
      isActive: true,
    },
  });
  console.log(`   ✅ 1 point reward`);

  // ============================================
  // 9. PAGE SECTIONS
  // ============================================
  console.log('\n📄 Seeding Page Sections...');

  const pageSections = [
    { code: 'hero_banner', name: 'Hero Banner', isVisible: true, order: 1 },
    { code: 'featured_products', name: 'Sản phẩm nổi bật', isVisible: true, order: 2 },
    { code: 'categories_grid', name: 'Danh mục sản phẩm', isVisible: true, order: 3 },
    { code: 'promotion_banner', name: 'Banner khuyến mãi', isVisible: true, order: 4 },
    { code: 'new_arrivals', name: 'Hàng mới về', isVisible: true, order: 5 },
    { code: 'blog_posts', name: 'Bài viết mới nhất', isVisible: true, order: 6 },
  ];

  for (const section of pageSections) {
    await prisma.pageSection.upsert({
      where: { code: section.code },
      update: { name: section.name, order: section.order },
      create: section,
    });
  }
  console.log(`   ✅ ${pageSections.length} page sections`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 DATABASE SEED COMPLETED!');
  console.log('='.repeat(50));
  console.log('\n📋 Test Accounts:');
  console.log(`   Admin: ${adminEmail} (password in .env)`);
  console.log(`   User:  test@example.com / Test@12345`);
  console.log('\n🎫 Voucher Codes: NEWUSER50K, WELCOME10, FREESHIP');
  console.log('\n💡 Chạy các seed bổ sung:');
  console.log('   npx ts-node prisma/seed-products.ts   # Products + Reviews + Orders');
  console.log('   npx ts-node prisma/seed-colors.ts     # Color Attributes');
  console.log('   npx ts-node prisma/seed-search.ts     # Search Synonyms + Keywords');
  console.log('   npx ts-node prisma/seed-size-templates.ts  # Size Charts');
  console.log('   npx ts-node prisma/seed-voucher-test.ts    # More Vouchers & Test Data');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

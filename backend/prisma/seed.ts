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

  // 9. Create Test User for testing
  const testUserPassword = await bcrypt.hash('Test@12345', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      password: testUserPassword,
      roleId: userRole.id,
      isActive: true
    },
    create: {
      email: 'test@example.com',
      password: testUserPassword,
      name: 'Test User',
      phone: '0901234567',
      roleId: userRole.id,
      isActive: true,
      pointBalance: 1000,
      memberTier: 'SILVER'
    }
  });

  console.log('✅ Test User created:');
  console.log(`   📧 Email: test@example.com`);
  console.log(`   🔑 Password: Test@12345`);

  // 10. Create Post Categories
  const postCategories = [
    { name: 'Mẹo & Hướng dẫn', slug: 'meo-huong-dan' },
    { name: 'Xu hướng thời trang', slug: 'xu-huong-thoi-trang' },
    { name: 'Chăm sóc cơ thể', slug: 'cham-soc-co-the' },
    { name: 'Tin tức', slug: 'tin-tuc' }
  ];

  for (const cat of postCategories) {
    await prisma.postCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat
    });
  }

  console.log(`✅ Created ${postCategories.length} post categories`);

  // 11. Create Sample Posts
  const category1 = await prisma.postCategory.findUnique({ where: { slug: 'meo-huong-dan' } });
  const category2 = await prisma.postCategory.findUnique({ where: { slug: 'xu-huong-thoi-trang' } });

  if (category1 && category2) {
    const samplePosts = [
      {
        title: 'Cách chọn áo ngực phù hợp với vóc dáng',
        slug: 'cach-chon-ao-nguc-phu-hop-voi-voc-dang',
        excerpt: 'Hướng dẫn chi tiết cách đo size và chọn kiểu áo ngực phù hợp nhất với từng vóc dáng.',
        content: `<h2>Tại sao việc chọn đúng size quan trọng?</h2>
<p>Việc mặc áo ngực đúng size không chỉ giúp bạn thoải mái suốt cả ngày mà còn tốt cho sức khỏe. Một chiếc áo ngực quá chật có thể gây đau vai, còn áo quá rộng sẽ không hỗ trợ tốt.</p>

<h2>Cách đo size chính xác</h2>
<p>Để đo size chính xác, bạn cần:</p>
<ul>
<li>Đo vòng ngực dưới ngực</li>
<li>Đo vòng ngực qua điểm cao nhất</li>
<li>Trừ hai số để ra cup size</li>
</ul>

<h2>Chọn kiểu áo theo vóc dáng</h2>
<p>Mỗi kiểu áo ngực phù hợp với những vóc dáng khác nhau. Push-up bra phù hợp với ngực nhỏ, còn minimizer bra tốt cho ngực lớn.</p>`,
        thumbnail: 'https://images.unsplash.com/photo-1617331140180-e8262094733a?w=800',
        categoryId: category1.id,
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(),
        views: 1250,
        likeCount: 45
      },
      {
        title: 'Xu hướng nội y xuân hè 2025',
        slug: 'xu-huong-noi-y-xuan-he-2025',
        excerpt: 'Khám phá những xu hướng nội y hot nhất mùa xuân hè năm nay.',
        content: `<h2>Màu sắc trendy</h2>
<p>Năm nay, các tông màu pastel như hồng nude, xanh mint và lavender đang lên ngôi. Bên cạnh đó, màu đỏ cherry và cam đào cũng rất được ưa chuộng.</p>

<h2>Chất liệu được yêu thích</h2>
<p>Ren Pháp cao cấp và lụa satin tiếp tục thống trị. Ngoài ra, các chất liệu bền vững, thân thiện môi trường cũng ngày càng phổ biến.</p>

<h2>Kiểu dáng nổi bật</h2>
<p>Bralette không gọng, bodysuit và matching sets là những item must-have trong tủ đồ nội y của bạn.</p>`,
        thumbnail: 'https://images.unsplash.com/photo-1594938328870-9623159c8c99?w=800',
        categoryId: category2.id,
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(Date.now() - 86400000),
        views: 890,
        likeCount: 32
      },
      {
        title: '5 lỗi thường gặp khi chọn nội y',
        slug: '5-loi-thuong-gap-khi-chon-noi-y',
        excerpt: 'Tránh những sai lầm phổ biến này để luôn tự tin với trang phục của mình.',
        content: `<h2>1. Chọn sai size</h2>
<p>Đây là lỗi phổ biến nhất. Nhiều người mặc size sai trong nhiều năm mà không biết. Hãy đo lại size thường xuyên vì cơ thể thay đổi theo thời gian.</p>

<h2>2. Không thử trước khi mua</h2>
<p>Size có thể khác nhau giữa các thương hiệu. Luôn thử áo trước khi quyết định mua.</p>

<h2>3. Chỉ quan tâm đến màu sắc</h2>
<p>Chất lượng vải và đường may quan trọng hơn vẻ bề ngoài. Nội y tốt sẽ bền và thoải mái hơn.</p>

<h2>4. Mặc một kiểu cho mọi outfit</h2>
<p>Mỗi trang phục cần loại nội y khác nhau. T-shirt bra, strapless, racerback... đều có công dụng riêng.</p>

<h2>5. Không chăm sóc đúng cách</h2>
<p>Giặt tay và phơi khô tự nhiên sẽ giúp nội y bền đẹp lâu hơn.</p>`,
        thumbnail: 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=800',
        categoryId: category1.id,
        authorId: admin.id,
        isPublished: true,
        publishedAt: new Date(Date.now() - 172800000),
        views: 2100,
        likeCount: 78
      }
    ];

    for (const post of samplePosts) {
      await prisma.post.upsert({
        where: { slug: post.slug },
        update: {
          title: post.title,
          content: post.content,
          excerpt: post.excerpt,
          thumbnail: post.thumbnail,
          views: post.views,
          likeCount: post.likeCount
        },
        create: post
      });
    }

    console.log(`✅ Created ${samplePosts.length} sample posts`);

    // 12. Create sample likes and bookmarks for test user
    const posts = await prisma.post.findMany({ take: 2 });
    for (const post of posts) {
      await prisma.postLike.upsert({
        where: { postId_userId: { postId: post.id, userId: testUser.id } },
        update: {},
        create: { postId: post.id, userId: testUser.id }
      });
      await prisma.postBookmark.upsert({
        where: { postId_userId: { postId: post.id, userId: testUser.id } },
        update: {},
        create: { postId: post.id, userId: testUser.id }
      });
    }

    console.log('✅ Created sample likes and bookmarks for test user');
  }

  // 13. Create default SystemConfig for theme
  const systemConfigs = [
    { key: 'store_name', value: 'My Lingerie Shop' },
    { key: 'primary_color', value: '#f43f5e' },
    { key: 'store_description', value: 'Cửa hàng nội y cao cấp' },
    { key: 'store_email', value: 'contact@mylingerie.com' },
    { key: 'store_phone', value: '0901234567' },
    { key: 'store_address', value: 'TP. Hồ Chí Minh, Việt Nam' }
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config
    });
  }

  console.log(`✅ Created ${systemConfigs.length} system configs`);

  console.log('');
  console.log('🎉 Database seed completed successfully!');
  console.log('');
  console.log('📝 Test accounts:');
  console.log('   Admin: admin@mylingerie.com (check .env for password)');
  console.log('   User:  test@example.com / Test@12345');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

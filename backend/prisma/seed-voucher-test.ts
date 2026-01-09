import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedVoucherTestData() {
  console.log('🎫 Seeding Voucher & Promotion Test Data...\n');

  // =============================================
  // 1. CAMPAIGNS
  // =============================================
  console.log('📢 Creating Campaigns...');
  
  const campaign1 = await prisma.campaign.upsert({
    where: { slug: 'tet-2024' },
    update: {},
    create: {
      name: 'Khuyến mãi Tết 2024',
      slug: 'tet-2024',
      description: 'Chương trình khuyến mãi đặc biệt dịp Tết Nguyên Đán',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-02-15'),
      isActive: true,
    },
  });

  const campaign2 = await prisma.campaign.upsert({
    where: { slug: 'summer-sale' },
    update: {},
    create: {
      name: 'Summer Sale 2024',
      slug: 'summer-sale',
      description: 'Giảm giá mùa hè - Nóng bỏng cùng ưu đãi',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  console.log(`   ✅ ${campaign1.name}`);
  console.log(`   ✅ ${campaign2.name}`);

  // =============================================
  // 2. COUPONS/VOUCHERS
  // =============================================
  console.log('\n🎟️ Creating Coupons...');

  const coupons = [
    // PUBLIC - Percentage
    {
      code: 'SALE10',
      name: 'Giảm 10% toàn bộ đơn',
      description: 'Áp dụng cho tất cả sản phẩm, tối đa 100K',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      maxDiscount: 100000,
      minOrderValue: 200000,
      couponType: 'PUBLIC',
      isPublic: true,
      quantity: 500,
    },
    // PUBLIC - Fixed Amount
    {
      code: 'GIAM50K',
      name: 'Giảm 50K đơn từ 300K',
      description: 'Voucher giảm 50,000đ cho đơn hàng từ 300,000đ',
      discountType: 'FIXED_AMOUNT',
      discountValue: 50000,
      minOrderValue: 300000,
      couponType: 'PUBLIC',
      isPublic: true,
      quantity: 200,
    },
    // PUBLIC - Higher discount
    {
      code: 'GIAM100K',
      name: 'Giảm 100K đơn từ 500K',
      description: 'Voucher giảm 100,000đ cho đơn hàng từ 500,000đ',
      discountType: 'FIXED_AMOUNT',
      discountValue: 100000,
      minOrderValue: 500000,
      couponType: 'PUBLIC',
      isPublic: true,
      quantity: 100,
    },
    // SHIPPING - Free ship
    {
      code: 'FREESHIP',
      name: 'Miễn phí vận chuyển',
      description: 'Miễn phí ship cho đơn từ 400K',
      discountType: 'FREE_SHIPPING',
      discountValue: 30000,
      minOrderValue: 400000,
      couponType: 'SHIPPING',
      isPublic: true,
      quantity: 1000,
    },
    // Campaign coupon - Summer
    {
      code: 'SUMMER20',
      name: 'Summer Sale - Giảm 20%',
      description: 'Giảm 20% tối đa 200K - Chương trình Summer Sale',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      maxDiscount: 200000,
      minOrderValue: 300000,
      couponType: 'PUBLIC',
      isPublic: true,
      campaignId: campaign2.id,
      quantity: 300,
    },
    // VIP coupon
    {
      code: 'VIP30',
      name: 'VIP - Giảm 30%',
      description: 'Dành riêng cho khách VIP - Giảm 30% tối đa 500K',
      discountType: 'PERCENTAGE',
      discountValue: 30,
      maxDiscount: 500000,
      minOrderValue: 500000,
      couponType: 'PRIVATE',
      isPublic: false,
      isSystem: true,
    },
    // Unlimited usage public
    {
      code: 'TETSUM',
      name: 'Tết Sum Vầy - Giảm 15%',
      description: 'Áp dụng không giới hạn số lượt',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      maxDiscount: 150000,
      minOrderValue: 250000,
      couponType: 'PUBLIC',
      isPublic: true,
      quantity: null, // Unlimited
      maxUsagePerUser: 3,
    },
  ];

  for (const coupon of coupons) {
    const created = await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: coupon,
      create: {
        ...coupon,
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        isActive: true,
        maxUsagePerUser: coupon.maxUsagePerUser || 1,
      },
    });
    console.log(`   ✅ ${created.code} - ${created.name}`);
  }

  // =============================================
  // 3. POINT REWARDS
  // =============================================
  console.log('\n🎁 Creating Point Rewards...');

  const rewards = [
    {
      name: 'Voucher 30K',
      description: 'Đổi 300 điểm lấy voucher giảm 30,000đ',
      pointCost: 300,
      rewardType: 'DISCOUNT',
      discountValue: 30000,
      discountType: 'FIXED_AMOUNT',
    },
    {
      name: 'Voucher 50K',
      description: 'Đổi 500 điểm lấy voucher giảm 50,000đ',
      pointCost: 500,
      rewardType: 'DISCOUNT',
      discountValue: 50000,
      discountType: 'FIXED_AMOUNT',
    },
    {
      name: 'Voucher 100K',
      description: 'Đổi 1000 điểm lấy voucher giảm 100,000đ',
      pointCost: 1000,
      rewardType: 'DISCOUNT',
      discountValue: 100000,
      discountType: 'FIXED_AMOUNT',
    },
    {
      name: 'Giảm 10%',
      description: 'Đổi 800 điểm lấy voucher giảm 10% (tối đa 150K)',
      pointCost: 800,
      rewardType: 'DISCOUNT',
      discountValue: 10,
      discountType: 'PERCENTAGE',
    },
  ];

  for (const reward of rewards) {
    const created = await prisma.pointReward.create({
      data: {
        ...reward,
        isActive: true,
      },
    });
    console.log(`   ✅ ${created.name} (${created.pointCost} điểm)`);
  }

  // =============================================
  // 4. TEST USER WITH POINTS & VOUCHERS
  // =============================================
  console.log('\n👤 Creating Test User...');

  const userRole = await prisma.role.findFirst({ where: { name: 'USER' } });
  const hashedPassword = await bcrypt.hash('Test@123456', 12);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      pointBalance: 1500,
      totalSpent: 3500000,
      memberTier: 'SILVER',
    },
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      roleId: userRole?.id || null,
      pointBalance: 1500,
      totalSpent: 3500000,
      memberTier: 'SILVER',
      birthday: new Date('1995-06-15'),
      isActive: true,
    },
  });

  console.log(`   ✅ ${testUser.email}`);
  console.log(`      - Điểm: ${testUser.pointBalance}`);
  console.log(`      - Hạng: ${testUser.memberTier}`);
  console.log(`      - Tổng chi tiêu: ${testUser.totalSpent?.toLocaleString('vi-VN')}đ`);

  // Add some vouchers to user wallet
  const publicCoupons = await prisma.coupon.findMany({
    where: { isPublic: true, isActive: true },
    take: 3,
  });

  for (const coupon of publicCoupons) {
    await prisma.userCoupon.upsert({
      where: {
        userId_couponId: { userId: testUser.id, couponId: coupon.id },
      },
      update: {},
      create: {
        userId: testUser.id,
        couponId: coupon.id,
        status: 'AVAILABLE',
        source: 'COLLECTED',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`   ✅ Đã thêm ${publicCoupons.length} voucher vào ví`);

  // Add point history
  await prisma.pointHistory.createMany({
    data: [
      {
        userId: testUser.id,
        type: 'EARN',
        amount: 350,
        balance: 350,
        source: 'ORDER',
        sourceId: '1001',
        description: 'Tích điểm đơn hàng #1001',
      },
      {
        userId: testUser.id,
        type: 'EARN',
        amount: 500,
        balance: 850,
        source: 'ORDER',
        sourceId: '1002',
        description: 'Tích điểm đơn hàng #1002',
      },
      {
        userId: testUser.id,
        type: 'EARN',
        amount: 650,
        balance: 1500,
        source: 'ORDER',
        sourceId: '1003',
        description: 'Tích điểm đơn hàng #1003',
      },
    ],
    skipDuplicates: true,
  });
  console.log(`   ✅ Đã thêm lịch sử tích điểm`);

  // =============================================
  // 5. SAMPLE CATEGORIES & PRODUCTS (for checkout test)
  // =============================================
  console.log('\n📦 Creating Sample Products...');

  const category = await prisma.category.upsert({
    where: { slug: 'ao-lot' },
    update: {},
    create: {
      name: 'Áo lót',
      slug: 'ao-lot',
    },
  });

  const products = [
    { name: 'Áo lót ren cao cấp', slug: 'ao-lot-ren-cao-cap', price: 350000, salePrice: 299000 },
    { name: 'Áo lót cotton thoáng mát', slug: 'ao-lot-cotton-thoang-mat', price: 250000, salePrice: null },
    { name: 'Áo lót push-up quyến rũ', slug: 'ao-lot-push-up-quyen-ru', price: 450000, salePrice: 399000 },
    { name: 'Bộ đồ lót sexy', slug: 'bo-do-lot-sexy', price: 550000, salePrice: 499000 },
  ];

  for (const prod of products) {
    const created = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: { price: prod.price, salePrice: prod.salePrice },
      create: {
        name: prod.name,
        slug: prod.slug,
        price: prod.price,
        salePrice: prod.salePrice,
        categoryId: category.id,
        description: `${prod.name} - Chất liệu cao cấp, thoáng mát`,
      },
    });
    console.log(`   ✅ ${created.name} - ${created.price.toLocaleString('vi-VN')}đ`);
  }

  // =============================================
  // SUMMARY
  // =============================================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 SEED COMPLETED!');
  console.log('='.repeat(50));
  console.log('\n📋 Test Accounts:');
  console.log('   • test@example.com / Test@123456 (User - SILVER tier)');
  console.log('\n🎫 Public Voucher Codes:');
  console.log('   • SALE10    - Giảm 10% (max 100K), đơn từ 200K');
  console.log('   • GIAM50K   - Giảm 50K, đơn từ 300K');
  console.log('   • GIAM100K  - Giảm 100K, đơn từ 500K');
  console.log('   • FREESHIP  - Free ship, đơn từ 400K');
  console.log('   • SUMMER20  - Giảm 20% (max 200K), đơn từ 300K');
  console.log('   • TETSUM    - Giảm 15% (max 150K), dùng 3 lần');
  console.log('\n💰 User test@example.com:');
  console.log('   • 1,500 điểm tích lũy');
  console.log('   • Hạng SILVER');
  console.log('   • Có 3 voucher trong ví');
  console.log('');
}

seedVoucherTestData()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

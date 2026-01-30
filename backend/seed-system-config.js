const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedSystemConfig() {
  console.log('🌱 Seeding SystemConfig...\n');

  const defaultConfigs = [
    { key: 'store_name', value: 'Lingerie Shop', description: 'Tên cửa hàng' },
    { key: 'primary_color', value: '#f43f5e', description: 'Màu chủ đạo (hex)' },
    { key: 'store_description', value: 'Premium lingerie collection', description: 'Mô tả cửa hàng' },
    { key: 'store_email', value: 'contact@lingerie.shop', description: 'Email liên hệ' },
    { key: 'store_phone', value: '+84 123 456 789', description: 'Số điện thoại' },
    { key: 'store_address', value: 'Hồ Chí Minh, Việt Nam', description: 'Địa chỉ cửa hàng' },
  ];

  try {
    for (const config of defaultConfigs) {
      const existing = await prisma.systemConfig.findUnique({
        where: { key: config.key },
      });

      if (existing) {
        console.log(`⏭️  ${config.key}: already exists`);
      } else {
        await prisma.systemConfig.create({ data: config });
        console.log(`✅ ${config.key}: ${config.value}`);
      }
    }

    console.log('\n🎉 SystemConfig seeded successfully!');

  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedSystemConfig();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('Checking which Size System V2 tables exist...\n');

    // Check Region table
    try {
      const regionCount = await prisma.region.count();
      console.log('✅ regions table exists:', regionCount, 'rows');
    } catch (e) {
      console.log('❌ regions table does NOT exist');
    }

    // Check SizeStandard table
    try {
      const standardCount = await prisma.sizeStandard.count();
      console.log('✅ size_standards table exists:', standardCount, 'rows');
    } catch (e) {
      console.log('❌ size_standards table does NOT exist');
    }

    // Check Brand table
    try {
      const brandCount = await prisma.brand.count();
      console.log('✅ brands table exists:', brandCount, 'rows');
    } catch (e) {
      console.log('❌ brands table does NOT exist');
    }

    // Check Product.brandId column
    try {
      const product = await prisma.product.findFirst({
        select: { id: true, brandId: true }
      });
      console.log('✅ Product.brandId column exists');
    } catch (e) {
      console.log('❌ Product.brandId column does NOT exist:', e.message.split('\n')[0]);
    }

    // Check ProductVariant columns
    try {
      const variant = await prisma.productVariant.findFirst({
        select: { id: true, baseSize: true, baseSizeUIC: true }
      });
      console.log('✅ ProductVariant.baseSize and baseSizeUIC columns exist');
    } catch (e) {
      console.log('❌ ProductVariant columns do NOT exist:', e.message.split('\n')[0]);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();

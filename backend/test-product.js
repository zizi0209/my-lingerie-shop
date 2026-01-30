const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProductQuery() {
  try {
    console.log('Testing Product.findFirst()...');
    const product = await prisma.product.findFirst();
    console.log('✅ Success! Product:', JSON.stringify(product, null, 2));
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testProductQuery();

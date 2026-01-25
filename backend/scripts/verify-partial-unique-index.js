// Verify partial unique index
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying partial unique index...\n');

  try {
    // Get index information
    const indexes = await prisma.$queryRaw`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'User'
        AND indexname = 'users_email_unique_active'
    `;

    if (indexes.length > 0) {
      console.log('✅ Partial unique index exists!');
      console.log('\nIndex definition:');
      console.log(indexes[0].indexdef);

      // Get comment
      const comments = await prisma.$queryRaw`
        SELECT description
        FROM pg_description
        JOIN pg_class ON pg_description.objoid = pg_class.oid
        WHERE relname = 'users_email_unique_active'
      `;

      if (comments.length > 0) {
        console.log('\nIndex documentation:');
        console.log(comments[0].description);
      }
    } else {
      console.log('❌ Index not found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

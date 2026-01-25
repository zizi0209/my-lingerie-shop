// Run partial unique index migration
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Applying partial unique index migration...');

  try {
    // Drop old unique constraint
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "User_email_key"');
    console.log('✅ Dropped old unique constraint (if existed)');

    // Create partial unique index
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "users_email_unique_active"
      ON "User" (email)
      WHERE "deletedAt" IS NULL
    `);
    console.log('✅ Created partial unique index: users_email_unique_active');

    // Add comment
    await prisma.$executeRawUnsafe(`
      COMMENT ON INDEX "users_email_unique_active" IS 'Partial unique index: ensures email uniqueness only for active (non-deleted) users. Allows same email for soft-deleted users to enable restore functionality.'
    `);
    console.log('✅ Added index documentation comment');

    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 Email constraint now allows:');
    console.log('   - ONE active user per email (deletedAt IS NULL)');
    console.log('   - MULTIPLE deleted users with same email (deletedAt IS NOT NULL)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [
            'store_name',
            'store_logo', 
            'primary_color',
            'store_description',
            'store_email',
            'store_phone',
            'store_address',
            'social_facebook',
            'social_instagram',
            'social_tiktok'
          ]
        }
      }
    });
    
    console.log('Found configs:', configs.length);
    console.log(JSON.stringify(configs, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

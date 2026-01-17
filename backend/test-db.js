const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const configs = await p.systemConfig.findMany();
  console.log('SystemConfig records:', configs.length);
  console.log(JSON.stringify(configs, null, 2));
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => p.$disconnect());

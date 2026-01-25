const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
  const roles = await prisma.role.findMany();
  console.log('Available Roles:', roles);
  await prisma.$disconnect();
}

checkRoles();

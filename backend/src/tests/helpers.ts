import { faker } from '@faker-js/faker';
import { prisma } from './setup';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Create test user
export async function createTestUser(overrides: Partial<{
  email: string;
  password: string;
  name: string;
  roleName: string;
  isActive: boolean;
}> = {}) {
  const {
    email = faker.internet.email(),
    password = 'Password123!',
    name = faker.person.fullName(),
    roleName = 'USER',
    isActive = true,
  } = overrides;

  // Get or create role
  const role = await prisma.role.upsert({
    where: { name: roleName },
    update: {},
    create: { name: roleName },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      roleId: role.id,
      isActive,
    },
    include: {
      role: true,
    },
  });

  return { user, password };
}

// Generate JWT token for testing
export function generateTestToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

// Create test category
export async function createTestCategory(overrides: Partial<{
  name: string;
  slug: string;
  image: string;
}> = {}) {
  const name = overrides.name || faker.commerce.department();
  const slug = overrides.slug || faker.helpers.slugify(name);
  const image = overrides.image || faker.image.url();

  return prisma.category.create({
    data: { name, slug, image },
  });
}

// Create test product
export async function createTestProduct(categoryId: number, overrides: Partial<{
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number;
}> = {}) {
  const name = overrides.name || faker.commerce.productName();
  const slug = overrides.slug || faker.helpers.slugify(name);
  const description = overrides.description || faker.commerce.productDescription();
  const price = overrides.price || parseFloat(faker.commerce.price({ min: 100000, max: 1000000 }));
  const salePrice = overrides.salePrice;

  return prisma.product.create({
    data: {
      name,
      slug,
      description,
      price,
      salePrice,
      categoryId,
    },
  });
}

// Create test order
export async function createTestOrder(userId: number, overrides: Partial<{
  status: string;
  totalAmount: number;
}> = {}) {
  const status = overrides.status || 'PENDING';
  const totalAmount = overrides.totalAmount || parseFloat(faker.commerce.price({ min: 500000, max: 5000000 }));

  return prisma.order.create({
    data: {
      userId,
      orderNumber: faker.string.alphanumeric(10).toUpperCase(),
      status,
      totalAmount,
      shippingAddress: faker.location.streetAddress(),
      shippingPhone: faker.phone.number(),
    },
  });
}

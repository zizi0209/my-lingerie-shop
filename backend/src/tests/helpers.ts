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
  // Generate unique email with timestamp
  const uniqueEmail = overrides.email || `test_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const {
    password = 'Password123!',
    name = faker.person.fullName(),
    roleName = 'USER',
    isActive = true,
  } = overrides;

  // Get or create role - use findFirst + create pattern to avoid upsert race conditions
  let role = await prisma.role.findFirst({
    where: { name: roleName },
  });
  
  if (!role) {
    try {
      role = await prisma.role.create({
        data: { name: roleName },
      });
    } catch {
      // Race condition - role was created by another test
      role = await prisma.role.findFirst({
        where: { name: roleName },
      });
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: uniqueEmail,
      password: hashedPassword,
      name,
      roleId: role?.id || null,
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

// Create test coupon
export async function createTestCoupon(overrides: Partial<{
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscount: number;
  couponType: string;
  isPublic: boolean;
  isActive: boolean;
  quantity: number;
  endDate: Date;
}> = {}) {
  const code = overrides.code || `TEST${faker.string.alphanumeric(6).toUpperCase()}`;

  return prisma.coupon.create({
    data: {
      code,
      name: overrides.name || `Test Coupon ${code}`,
      discountType: overrides.discountType || 'FIXED_AMOUNT',
      discountValue: overrides.discountValue || 50000,
      minOrderValue: overrides.minOrderValue || 300000,
      maxDiscount: overrides.maxDiscount || null,
      couponType: overrides.couponType || 'PUBLIC',
      isPublic: overrides.isPublic ?? true,
      isActive: overrides.isActive ?? true,
      quantity: overrides.quantity || null,
      maxUsagePerUser: 1,
      startDate: new Date(),
      endDate: overrides.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

// Create test point reward
export async function createTestPointReward(overrides: Partial<{
  name: string;
  pointCost: number;
  rewardType: string;
  discountValue: number;
  isActive: boolean;
}> = {}) {
  return prisma.pointReward.create({
    data: {
      name: overrides.name || 'Test Reward',
      pointCost: overrides.pointCost || 500,
      rewardType: overrides.rewardType || 'DISCOUNT',
      discountValue: overrides.discountValue || 50000,
      discountType: 'FIXED_AMOUNT',
      isActive: overrides.isActive ?? true,
    },
  });
}

// Create user coupon (add to wallet)
export async function addCouponToUserWallet(userId: number, couponId: number, overrides: Partial<{
  status: string;
  source: string;
  expiresAt: Date;
}> = {}) {
  return prisma.userCoupon.create({
    data: {
      userId,
      couponId,
      status: overrides.status || 'AVAILABLE',
      source: overrides.source || 'COLLECTED',
      expiresAt: overrides.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

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

 // ============================================
 // SIZE SYSTEM HELPERS
 // ============================================

 // Create test region
 export async function createTestRegion(overrides: Partial<{
   id: string;
   code: string;
   name: string;
   currency: string;
 }> = {}) {
   const id = overrides.id || `region_${Date.now()}`;
   const code = overrides.code || 'US';
   
   // Check if region already exists
   let region = await prisma.region.findUnique({ where: { id } });
   if (!region) {
     try {
       region = await prisma.region.create({
         data: {
           id,
           code,
           name: overrides.name || 'United States',
           currency: overrides.currency || 'USD',
         },
       });
     } catch {
       region = await prisma.region.findUnique({ where: { id } });
     }
   }
   return region!;
 }

 // Create test size standard
 export async function createTestSizeStandard(regionId: string, overrides: Partial<{
   id: string;
   code: string;
   category: string;
   name: string;
 }> = {}) {
   const id = overrides.id || `std_${Date.now()}`;
   const code = overrides.code || 'US';
   const category = overrides.category || 'BRA';
   
   let standard = await prisma.sizeStandard.findUnique({ where: { id } });
   if (!standard) {
     try {
       standard = await prisma.sizeStandard.create({
         data: {
           id,
           code,
           regionId,
           category,
           name: overrides.name || 'US Bra Size Standard',
           cupProgression: ['A', 'B', 'C', 'D', 'DD', 'DDD', 'G', 'H', 'I', 'J', 'K'],
         },
       });
     } catch {
       standard = await prisma.sizeStandard.findUnique({ where: { id } });
     }
   }
   return standard!;
 }

 // Create test regional size
 export async function createTestRegionalSize(params: {
   regionId: string;
   standardId: string;
   universalCode: string;
   displaySize: string;
   bandSize: number;
   cupVolume: number;
   cupLetter: string;
   sortOrder?: number;
 }) {
   let size = await prisma.regionalSize.findUnique({ 
     where: { universalCode: params.universalCode } 
   });
   
   if (!size) {
     try {
       size = await prisma.regionalSize.create({
         data: {
           universalCode: params.universalCode,
           regionId: params.regionId,
           standardId: params.standardId,
           displaySize: params.displaySize,
           bandSize: params.bandSize,
           cupVolume: params.cupVolume,
           cupLetter: params.cupLetter,
           sortOrder: params.sortOrder || 0,
           measurements: {},
         },
       });
     } catch {
       size = await prisma.regionalSize.findUnique({ 
         where: { universalCode: params.universalCode } 
       });
     }
   }
   return size!;
 }

 // Seed common bra sizes for testing
 export async function seedTestSizes() {
   const region = await createTestRegion({ id: 'region_us', code: 'US' });
   const standard = await createTestSizeStandard(region.id, { 
     id: 'std_us_bra', 
     code: 'US', 
     category: 'BRA' 
   });

   // Sister size family for 34C (volume 6):
   // 32D (band 81, vol 6) <- 34C (band 86, vol 6) -> 36B (band 91, vol 6)
   const sizes = [
     { universalCode: 'UIC_BRA_BAND81_CUPVOL6', displaySize: '32D', bandSize: 81, cupVolume: 6, cupLetter: 'D' },
     { universalCode: 'UIC_BRA_BAND86_CUPVOL6', displaySize: '34C', bandSize: 86, cupVolume: 6, cupLetter: 'C' },
     { universalCode: 'UIC_BRA_BAND91_CUPVOL6', displaySize: '36B', bandSize: 91, cupVolume: 6, cupLetter: 'B' },
     { universalCode: 'UIC_BRA_BAND96_CUPVOL6', displaySize: '38A', bandSize: 96, cupVolume: 6, cupLetter: 'A' },
   ];

   const createdSizes = [];
   for (const sizeData of sizes) {
     const size = await createTestRegionalSize({
       regionId: region.id,
       standardId: standard.id,
       ...sizeData,
     });
     createdSizes.push(size);
   }

   return { region, standard, sizes: createdSizes };
 }

 // Cleanup sister size recommendations
 export async function cleanupSisterSizeRecommendations() {
   await prisma.sisterSizeRecommendation.deleteMany({});
 }

// Generate JWT token for testing with full payload matching requireAuth expectations
export function generateTestToken(userId: number, options: {
  email?: string;
  roleId?: number | null;
  roleName?: string;
  tokenVersion?: number;
} = {}): string {
  const payload = {
    userId,
    email: options.email || `test-${userId}@example.com`,
    roleId: options.roleId ?? null,
    roleName: options.roleName,
    tokenVersion: options.tokenVersion ?? 0,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
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

/**
 * Seed Products với dữ liệu đa dạng và ảnh hiển thị được
 * Chạy: npx ts-node prisma/seed-products.ts
 * 
 * UPDATED: Sử dụng bảng Color mới với colorGroups cho Color Swatches
 */

import { PrismaClient, ProductType } from '@prisma/client';
import { faker } from '@faker-js/faker/locale/vi';

const prisma = new PrismaClient();

// Seed cố định để reproducible
faker.seed(2024);

// ============ CONFIG ============

const CONFIG = {
  productsPerCategory: 5, // 5 sản phẩm mỗi danh mục = 30 sản phẩm
  variantsPerProduct: 3,  // 3 màu x 3 sizes = ~9 variants
};

// ============ DATA ============

const CATEGORIES = [
  { name: 'Áo lót', slug: 'ao-lot', productType: 'BRA' as ProductType, description: 'Áo lót các loại: có gọng, không gọng, push-up, bralette' },
  { name: 'Quần lót', slug: 'quan-lot', productType: 'PANTY' as ProductType, description: 'Quần lót bikini, thong, hipster, boyshort' },
  { name: 'Set đồ lót', slug: 'set-do-lot', productType: 'SET' as ProductType, description: 'Combo áo và quần lót matching' },
  { name: 'Đồ ngủ', slug: 'do-ngu', productType: 'SLEEPWEAR' as ProductType, description: 'Váy ngủ, pyjama, đồ bộ mặc nhà' },
  { name: 'Đồ định hình', slug: 'do-dinh-hinh', productType: 'SHAPEWEAR' as ProductType, description: 'Quần gen, áo nịt bụng, corset' },
  { name: 'Phụ kiện', slug: 'phu-kien', productType: 'ACCESSORY' as ProductType, description: 'Miếng dán ngực, dây áo, phụ kiện khác' },
];

const SIZES: Record<ProductType, string[]> = {
  BRA: ['70A', '70B', '75A', '75B', '75C', '80A', '80B', '80C'],
  PANTY: ['S', 'M', 'L', 'XL'],
  SET: ['S', 'M', 'L', 'XL'],
  SLEEPWEAR: ['S', 'M', 'L', 'XL'],
  SHAPEWEAR: ['S', 'M', 'L', 'XL'],
  ACCESSORY: ['Free Size'],
};

// Colors sẽ được load từ database
let COLORS: { id: number; name: string; slug: string; hexCode: string }[] = [];

/**
 * Get local product images from /public/images/seed/
 * Fallback to picsum.photos nếu không có ảnh local
 */
function getProductImages(
  productType: ProductType,
  productIndex: number,
  count: number
): string[] {
  const images: string[] = [];
  const categoryFolder = productType.toLowerCase();
  
  // Cố gắng load ảnh local từ /public/images/seed/{category}/
  // Naming convention: {category}-1.webp, {category}-2.webp, ...
  const USE_LOCAL_IMAGES = process.env.USE_LOCAL_SEED_IMAGES !== 'false';
  
  if (USE_LOCAL_IMAGES) {
    // Rotate qua các ảnh available (giả sử có 8 ảnh mỗi category)
    const MAX_IMAGES_PER_CATEGORY = 8;
    
    for (let i = 0; i < count; i++) {
      const imageIndex = ((productIndex - 1) * count + i) % MAX_IMAGES_PER_CATEGORY + 1;
      images.push(`/images/seed/${categoryFolder}/${categoryFolder}-${imageIndex}.webp`);
    }
  } else {
    // Fallback to picsum.photos
    for (let i = 0; i < count; i++) {
      const seed = productIndex * 10 + i;
      images.push(`https://picsum.photos/seed/${seed}/800/1000`);
    }
  }
  
  return images;
}

// Product templates theo từng loại
const PRODUCT_TEMPLATES: Record<ProductType, { names: string[]; priceRange: [number, number] }> = {
  BRA: {
    names: [
      'Áo lót ren hoa nhẹ nhàng',
      'Bra không gọng cotton mềm mại',
      'Áo ngực push-up quyến rũ',
      'Bralette ren vintage',
      'Áo lót có gọng nâng đỡ',
      'Áo lót thể thao năng động',
      'Bra lụa cao cấp',
      'Áo ngực không đệm thoáng mát',
    ],
    priceRange: [250000, 650000],
  },
  PANTY: {
    names: [
      'Quần lót bikini cotton',
      'Thong ren gợi cảm',
      'Quần hipster thoải mái',
      'Boyshort năng động',
      'Quần lót seamless',
      'Bikini lụa mềm mại',
      'Quần lót ren hoa',
      'Thong cotton basic',
    ],
    priceRange: [80000, 250000],
  },
  SET: {
    names: [
      'Set đồ lót ren romantic',
      'Combo bra + panty cotton',
      'Set lót lụa sang trọng',
      'Set đồ lót cô dâu',
      'Combo nội y gợi cảm',
      'Set đồ lót vintage',
      'Set bra panty seamless',
      'Combo đồ lót cao cấp',
    ],
    priceRange: [350000, 850000],
  },
  SLEEPWEAR: {
    names: [
      'Váy ngủ lụa hai dây',
      'Pyjama satin dài tay',
      'Đồ ngủ cotton thoáng mát',
      'Váy ngủ ren quyến rũ',
      'Bộ đồ ngủ cộc tay',
      'Bodysuit ngủ gợi cảm',
      'Kimono lụa mỏng nhẹ',
      'Đồ bộ mặc nhà cotton',
    ],
    priceRange: [280000, 750000],
  },
  SHAPEWEAR: {
    names: [
      'Quần gen nịt bụng',
      'Áo định hình toàn thân',
      'Corset eo thon',
      'Quần gen đùi',
      'Áo nịt ngực sau sinh',
      'Quần lót gen bụng',
      'Bodysuit định hình',
      'Gen nịt eo cao cấp',
    ],
    priceRange: [350000, 950000],
  },
  ACCESSORY: {
    names: [
      'Miếng dán ngực silicon',
      'Dây áo trong suốt',
      'Miếng lót ngực',
      'Dây đeo vai thay thế',
      'Túi giặt đồ lót',
      'Móc kẹp điều chỉnh',
      'Miếng che đầu ngực',
      'Dây áo đa năng',
    ],
    priceRange: [50000, 180000],
  },
};

// ============ HELPERS ============

function vnPrice(min: number, max: number): number {
  return Math.round(faker.number.int({ min, max }) / 10000) * 10000;
}

function generateSlug(name: string, suffix: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + suffix;
}

// ============ SEED FUNCTIONS ============

async function seedCategories() {
  console.log('📁 Seeding categories...');
  
  const created = [];
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        productType: cat.productType,
        description: cat.description,
      },
      create: cat,
    });
    created.push(category);
    console.log(`  ✅ ${category.name}`);
  }
  
  return created;
}

async function seedProducts(categories: Awaited<ReturnType<typeof seedCategories>>) {
  console.log('\n📦 Seeding products...');
  
  // Load colors from database
  COLORS = await prisma.color.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      hexCode: true,
    },
  });

  if (COLORS.length === 0) {
    console.log('  ⚠️ No colors found. Please run migration first to seed colors.');
    return [];
  }

  console.log(`  📎 Loaded ${COLORS.length} colors from database`);

  const allProducts = [];
  let productCounter = 1;

  for (const category of categories) {
    const templates = PRODUCT_TEMPLATES[category.productType];
    const productNames = faker.helpers.shuffle([...templates.names]).slice(0, CONFIG.productsPerCategory);
    
    console.log(`\n  📂 ${category.name}:`);

    for (const name of productNames) {
      const [minPrice, maxPrice] = templates.priceRange;
      const price = vnPrice(minPrice, maxPrice);
      const hasDiscount = faker.datatype.boolean(0.3);
      const salePrice = hasDiscount ? vnPrice(Math.round(price * 0.7), Math.round(price * 0.9)) : null;
      
      const slug = generateSlug(name, faker.string.alphanumeric(6).toLowerCase());

      // Tạo product
      const product = await prisma.product.create({
        data: {
          name,
          slug,
          description: generateDescription(name, category.productType),
          price,
          salePrice,
          categoryId: category.id,
          productType: category.productType,
          isFeatured: faker.datatype.boolean(0.2),
          isVisible: true,
        },
      });

      // Chọn màu cho sản phẩm
      const productColors = faker.helpers.arrayElements(COLORS, { min: 2, max: 4 });
      const availableSizes = SIZES[category.productType];
      const productSizes = faker.helpers.arrayElements(availableSizes, { 
        min: Math.min(3, availableSizes.length), 
        max: Math.min(4, availableSizes.length) 
      });

      // Tạo ProductColor relationships
      for (let colorIndex = 0; colorIndex < productColors.length; colorIndex++) {
        const color = productColors[colorIndex];
        
        await prisma.productColor.create({
          data: {
            productId: product.id,
            colorId: color.id,
            isDefault: colorIndex === 0, // Màu đầu tiên là default
            order: colorIndex,
          },
        });

        // Tạo images cho mỗi màu (2-3 ảnh mỗi màu)
        const imageCount = faker.number.int({ min: 2, max: 3 });
        const imageUrls = getProductImages(category.productType, productCounter * 10 + colorIndex, imageCount);
        
        await prisma.productImage.createMany({
          data: imageUrls.map(url => ({
            productId: product.id,
            colorId: color.id, // Link image to color
            url,
          })),
        });

        // Tạo variants cho mỗi màu x size
        for (const size of productSizes) {
          const sku = `${category.productType.substring(0, 3)}-${productCounter.toString().padStart(3, '0')}-${color.slug.toUpperCase()}-${size.replace(' ', '')}`;
          
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku,
              size,
              colorId: color.id, // Link variant to color
              stock: faker.number.int({ min: 5, max: 30 }),
              price: price + faker.number.int({ min: 0, max: 20000 }),
              salePrice: salePrice ? salePrice + faker.number.int({ min: 0, max: 10000 }) : null,
            },
          });
        }
      }

      allProducts.push(product);
      console.log(`    ✅ ${name} (${productColors.length} màu × ${productSizes.length} size)`);
      productCounter++;
    }
  }

  return allProducts;
}

function generateDescription(name: string, productType: ProductType): string {
  const materials = ['cotton', 'lụa', 'ren', 'satin', 'voan', 'microfiber'];
  const features = {
    BRA: ['nâng đỡ tốt', 'thoáng khí', 'form đẹp', 'không để lại vết hằn', 'mềm mại'],
    PANTY: ['co giãn tốt', 'không gây kích ứng', 'thoáng mát', 'ôm sát nhẹ nhàng'],
    SET: ['phối màu tinh tế', 'chất liệu cao cấp', 'thiết kế đồng bộ'],
    SLEEPWEAR: ['thoải mái khi ngủ', 'chất vải mát', 'kiểu dáng thanh lịch'],
    SHAPEWEAR: ['định hình hiệu quả', 'thoáng khí', 'không gò bó', 'nịt eo tự nhiên'],
    ACCESSORY: ['tiện dụng', 'chất lượng cao', 'dễ sử dụng'],
  };

  const material = faker.helpers.arrayElement(materials);
  const feature = faker.helpers.arrayElements(features[productType], 2).join(', ');

  return `${name} được làm từ chất liệu ${material} cao cấp. Sản phẩm có đặc điểm ${feature}. Phù hợp mặc hàng ngày hoặc các dịp đặc biệt.`;
}

async function seedTestUsers() {
  console.log('\n👥 Seeding test users...');
  
  const userRole = await prisma.role.findFirst({ where: { name: 'USER' } });
  if (!userRole) {
    console.log('  ⚠️ USER role not found, skipping users');
    return [];
  }

  const testUsers = [
    { email: 'user1@test.com', name: 'Nguyễn Thị Mai', phone: '0901234567' },
    { email: 'user2@test.com', name: 'Trần Văn Hùng', phone: '0912345678' },
    { email: 'user3@test.com', name: 'Lê Thị Hương', phone: '0923456789' },
    { email: 'user4@test.com', name: 'Phạm Minh Tuấn', phone: '0934567890' },
    { email: 'user5@test.com', name: 'Hoàng Thị Lan', phone: '0945678901' },
  ];

  const users = [];
  for (let i = 0; i < testUsers.length; i++) {
    const u = testUsers[i];
    const existing = await prisma.user.findFirst({ where: { email: u.email } });

    const user = existing || await prisma.user.create({
      data: {
        ...u,
        password: '$2b$10$K8YpSPYAWDMHF8H.QVU4Vu8VnNSW8Q5yQZPJKRJGEKzMHqM7.qGxy', // "password123"
        roleId: userRole.id,
        memberTier: faker.helpers.arrayElement(['BRONZE', 'SILVER', 'GOLD']),
        pointBalance: faker.number.int({ min: 0, max: 500 }),
      },
    });
    users.push(user);
    console.log(`  ✅ ${user.name} (${user.email})`);
  }

  return users;
}

async function seedSampleOrders(users: Awaited<ReturnType<typeof seedTestUsers>>, products: Awaited<ReturnType<typeof seedProducts>>) {
  if (users.length === 0 || products.length === 0) {
    console.log('\n⚠️ Skipping orders (no users or products)');
    return;
  }

  console.log('\n🛒 Seeding sample orders...');

  const statuses = ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED'];
  const cities = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];

  for (let i = 0; i < 10; i++) {
    const user = faker.helpers.arrayElement(users);
    const orderProducts = faker.helpers.arrayElements(products, { min: 1, max: 3 });
    
    const items = orderProducts.map(p => ({
      productId: p.id,
      quantity: faker.number.int({ min: 1, max: 2 }),
      price: p.salePrice || p.price,
      variant: `${faker.helpers.arrayElement(['S', 'M', 'L'])}/${faker.helpers.arrayElement(['Đen', 'Trắng', 'Hồng'])}`,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingFee = 30000;

    await prisma.order.create({
      data: {
        orderNumber: `ORD-${Date.now()}-${faker.string.alphanumeric(4).toUpperCase()}`,
        userId: user.id,
        status: faker.helpers.arrayElement(statuses),
        totalAmount: subtotal + shippingFee,
        shippingFee,
        shippingAddress: faker.location.streetAddress(),
        shippingCity: faker.helpers.arrayElement(cities),
        shippingPhone: user.phone || '0901234567',
        paymentMethod: faker.helpers.arrayElement(['COD', 'BANKING']),
        paymentStatus: faker.helpers.arrayElement(['PENDING', 'PAID']),
        createdAt: faker.date.past({ years: 0.5 }),
        items: { create: items },
      },
    });
  }

  console.log('  ✅ 10 sample orders created');
}

async function seedSampleReviews(users: Awaited<ReturnType<typeof seedTestUsers>>, products: Awaited<ReturnType<typeof seedProducts>>) {
  if (users.length === 0 || products.length === 0) {
    console.log('\n⚠️ Skipping reviews (no users or products)');
    return;
  }

  console.log('\n⭐ Seeding sample reviews...');

  const reviewContents = [
    { rating: 5, title: 'Rất hài lòng', content: 'Sản phẩm đẹp, chất lượng tốt, giao hàng nhanh. Sẽ ủng hộ shop dài dài!' },
    { rating: 5, title: 'Tuyệt vời', content: 'Đúng như mô tả, màu sắc đẹp, mặc rất thoải mái.' },
    { rating: 4, title: 'Hàng đẹp', content: 'Chất liệu mềm mại, form đẹp. Chỉ hơi chật một chút.' },
    { rating: 4, title: 'Ưng ý', content: 'Sản phẩm ổn, đóng gói cẩn thận. Sẽ quay lại mua thêm.' },
    { rating: 5, title: 'Xuất sắc', content: 'Mình rất thích, chất vải mát, kiểu dáng thanh lịch.' },
    { rating: 3, title: 'Tạm được', content: 'Sản phẩm ok, nhưng giao hàng hơi lâu.' },
    { rating: 5, title: 'Đáng tiền', content: 'Giá hợp lý, chất lượng tốt. Recommend cho mọi người!' },
    { rating: 4, title: 'Khá tốt', content: 'Màu đẹp, mặc êm. Nên mua size lớn hơn 1 bậc.' },
  ];

  let reviewCount = 0;
  for (const product of products.slice(0, 15)) { // Review 15 sản phẩm đầu
    const reviewsForProduct = faker.number.int({ min: 1, max: 3 });
    
    for (let i = 0; i < reviewsForProduct; i++) {
      const user = faker.helpers.arrayElement(users);
      const template = faker.helpers.arrayElement(reviewContents);
      
      try {
        await prisma.review.create({
          data: {
            productId: product.id,
            userId: user.id,
            rating: template.rating,
            title: template.title,
            content: template.content,
            status: 'APPROVED',
            isVerified: faker.datatype.boolean(0.7),
            helpfulCount: faker.number.int({ min: 0, max: 20 }),
            createdAt: faker.date.past({ years: 0.5 }),
          },
        });
        reviewCount++;
      } catch {
        // Skip duplicate reviews
      }
    }
  }

  // Update product ratings
  const ratings = await prisma.review.groupBy({
    by: ['productId'],
    _avg: { rating: true },
    _count: { rating: true },
    where: { status: 'APPROVED' },
  });

  for (const r of ratings) {
    await prisma.product.update({
      where: { id: r.productId },
      data: {
        ratingAverage: r._avg.rating || 0,
        reviewCount: r._count.rating,
      },
    });
  }

  console.log(`  ✅ ${reviewCount} reviews created`);
}

// ============ MAIN ============

async function main() {
  console.log('🌱 Starting product seed...\n');
  console.log('='.repeat(50));

  const startTime = Date.now();

  // Seed categories
  const categories = await seedCategories();

  // Seed products
  const products = await seedProducts(categories);

  // Seed test users
  const users = await seedTestUsers();

  // Seed orders
  await seedSampleOrders(users, products);

  // Seed reviews
  await seedSampleReviews(users, products);

  console.log('\n' + '='.repeat(50));
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n🎉 Seed completed in ${duration}s!`);
  console.log('\n📊 Summary:');
  console.log(`   Categories: ${categories.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Users: ${users.length}`);
  console.log(`   Orders: 10`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

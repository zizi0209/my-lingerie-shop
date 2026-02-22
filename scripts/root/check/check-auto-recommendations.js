const { PrismaClient } = require('../../../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkAutoRecommendations() {
  const post = await prisma.post.findUnique({
    where: { slug: 'cach-chon-ao-nguc-phu-hop-voi-voc-dang' },
    include: {
      relatedProducts: {
        include: {
          product: {
            select: { name: true, slug: true }
          }
        }
      }
    }
  });

  if (!post) {
    console.log('Post not found!');
    await prisma.$disconnect();
    return;
  }

  console.log('Post ID:', post.id);
  console.log('Post Title:', post.title);
  console.log('\n=== Manual Linked Products ===');
  const manualProducts = post.relatedProducts.filter(pp => !pp.isAutoRecommended);
  console.log('Count:', manualProducts.length);
  manualProducts.forEach(pp => {
    console.log(' -', pp.product.name, `(${pp.displayType})`);
  });

  console.log('\n=== Auto-Recommended Products ===');
  const autoProducts = post.relatedProducts.filter(pp => pp.isAutoRecommended);
  console.log('Count:', autoProducts.length);
  autoProducts.forEach(pp => {
    console.log(' -', pp.product.name, `(${pp.displayType})`);
  });

  await prisma.$disconnect();
}

checkAutoRecommendations();

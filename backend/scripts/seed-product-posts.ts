import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProductPosts() {
  try {
    console.log('🌱 Seeding product-post links...');

    // Link products to post "Xu hướng nội y xuân hè 2025" (ID: 2)
    const links = [
      {
        postId: 2,
        productId: 30,
        displayType: 'inline-card',
        position: 1,
        customNote: 'Sản phẩm được đề cập trong bài viết - móc điều chỉnh giúp tùy chỉnh độ vừa vặn',
      },
      {
        postId: 2,
        productId: 29,
        displayType: 'sidebar',
        position: 2,
        customNote: 'Phụ kiện không thể thiếu cho mùa hè',
      },
      {
        postId: 2,
        productId: 28,
        displayType: 'end-collection',
        position: 3,
        customNote: 'Miếng lót ngực cao cấp - sản phẩm hot trend 2025',
      },
    ];

    for (const link of links) {
      await prisma.productOnPost.upsert({
        where: {
          postId_productId: {
            postId: link.postId,
            productId: link.productId,
          },
        },
        update: {
          displayType: link.displayType as any,
          position: link.position,
          customNote: link.customNote,
        },
        create: link as any,
      });

      console.log(`✅ Linked product ${link.productId} to post ${link.postId}`);
    }

    console.log('✨ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedProductPosts();

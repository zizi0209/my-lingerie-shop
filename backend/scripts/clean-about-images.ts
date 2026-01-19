/**
 * Script để xóa imageUrl từ các About sections không cần thiết
 * Chỉ giữ imageUrl cho hero, story, và cta sections
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning unnecessary imageUrl from About sections...\n');

  // Các sections KHÔNG nên có imageUrl (dùng metadata thay vì)
  const sectionsToClean = [
    'craftsmanship', // Dùng metadata.items với icons
    'values',        // Dùng metadata.values với icons
    'stats',         // Chỉ có số liệu
    'team',          // Dùng metadata.members với ảnh riêng
    'socialproof',   // Có thể có logo partners trong metadata
  ];

  for (const sectionKey of sectionsToClean) {
    const section = await prisma.aboutSection.findUnique({
      where: { sectionKey },
      select: { id: true, sectionKey: true, imageUrl: true }
    });

    if (section && section.imageUrl) {
      console.log(`❌ Found imageUrl in ${sectionKey}:`, section.imageUrl);
      
      await prisma.aboutSection.update({
        where: { sectionKey },
        data: { imageUrl: null }
      });
      
      console.log(`✅ Cleaned ${sectionKey}\n`);
    } else {
      console.log(`✓ ${sectionKey} - Already clean\n`);
    }
  }

  // Hiển thị tổng kết
  console.log('\n📊 Summary:');
  const allSections = await prisma.aboutSection.findMany({
    select: { sectionKey: true, imageUrl: true },
    orderBy: { order: 'asc' }
  });

  allSections.forEach(s => {
    const status = s.imageUrl ? '🖼️  Has image' : '⬜ No image';
    console.log(`  ${status} - ${s.sectionKey}`);
  });

  console.log('\n✨ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

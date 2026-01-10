import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const synonyms = [
  // Áo lót
  { word: 'bra', synonym: 'áo lót' },
  { word: 'áo ngực', synonym: 'áo lót' },
  { word: 'áo con', synonym: 'áo lót' },
  { word: 'ao lot', synonym: 'áo lót' },
  { word: 'ao nguc', synonym: 'áo lót' },
  
  // Quần lót
  { word: 'quần chíp', synonym: 'quần lót' },
  { word: 'quần chip', synonym: 'quần lót' },
  { word: 'quan lot', synonym: 'quần lót' },
  { word: 'quan chip', synonym: 'quần lót' },
  { word: 'bikini', synonym: 'quần lót' },
  { word: 'panty', synonym: 'quần lót' },
  { word: 'panties', synonym: 'quần lót' },
  { word: 'underwear', synonym: 'quần lót' },
  
  // Đồ ngủ
  { word: 'do ngu', synonym: 'đồ ngủ' },
  { word: 'nightwear', synonym: 'đồ ngủ' },
  { word: 'pajama', synonym: 'đồ ngủ' },
  { word: 'pyjama', synonym: 'đồ ngủ' },
  { word: 'sleepwear', synonym: 'đồ ngủ' },
  
  // Nội y / Lingerie
  { word: 'noi y', synonym: 'nội y' },
  { word: 'lingerie', synonym: 'nội y' },
  { word: 'do lot', synonym: 'đồ lót' },
  
  // Thuộc tính
  { word: 'sexy', synonym: 'gợi cảm' },
  { word: 'push up', synonym: 'nâng ngực' },
  { word: 'pushup', synonym: 'nâng ngực' },
  { word: 'khong gong', synonym: 'không gọng' },
  { word: 'co gong', synonym: 'có gọng' },
  { word: 'ren', synonym: 'ren' },
  { word: 'lace', synonym: 'ren' },
  { word: 'lua', synonym: 'lụa' },
  { word: 'silk', synonym: 'lụa' },
];

const keywords = [
  {
    keyword: 'sale',
    type: 'FILTER',
    config: { filterType: 'sale' },
    displayName: 'Đang giảm giá',
    icon: 'tag',
    order: 1,
    isPinned: true,
  },
  {
    keyword: 'giảm giá',
    type: 'FILTER',
    config: { filterType: 'sale' },
    displayName: 'Đang giảm giá',
    icon: 'tag',
    order: 2,
    isPinned: false,
  },
  {
    keyword: 'new',
    type: 'FILTER',
    config: { filterType: 'new', days: 30 },
    displayName: 'Hàng mới',
    icon: 'sparkles',
    order: 3,
    isPinned: true,
  },
  {
    keyword: 'mới',
    type: 'FILTER',
    config: { filterType: 'new', days: 30 },
    displayName: 'Hàng mới',
    icon: 'sparkles',
    order: 4,
    isPinned: false,
  },
  {
    keyword: 'hot',
    type: 'SORT',
    config: { sortType: 'popular' },
    displayName: 'Bán chạy',
    icon: 'flame',
    order: 5,
    isPinned: true,
  },
  {
    keyword: 'bán chạy',
    type: 'SORT',
    config: { sortType: 'popular' },
    displayName: 'Bán chạy',
    icon: 'flame',
    order: 6,
    isPinned: false,
  },
];

async function seedSearch() {
  console.log('🔍 Seeding search data...');

  // Seed synonyms
  console.log('📝 Seeding synonyms...');
  for (const syn of synonyms) {
    await prisma.searchSynonym.upsert({
      where: { word: syn.word },
      update: { synonym: syn.synonym },
      create: syn,
    });
  }
  console.log(`✅ Seeded ${synonyms.length} synonyms`);

  // Seed keywords
  console.log('🏷️ Seeding navigation keywords...');
  for (const kw of keywords) {
    await prisma.searchKeyword.upsert({
      where: { keyword: kw.keyword },
      update: {
        type: kw.type,
        config: kw.config,
        displayName: kw.displayName,
        icon: kw.icon,
        order: kw.order,
        isPinned: kw.isPinned,
      },
      create: kw,
    });
  }
  console.log(`✅ Seeded ${keywords.length} keywords`);

  console.log('🎉 Search data seeding completed!');
}

seedSearch()
  .catch((e) => {
    console.error('❌ Error seeding search data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

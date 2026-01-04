/**
 * Seed script để tạo Attribute "Màu sắc" với các giá trị màu cơ bản
 * Chạy: npx ts-node prisma/seed-colors.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = [
  { name: 'Đen', slug: 'den', hexCode: '#000000' },
  { name: 'Trắng', slug: 'trang', hexCode: '#FFFFFF' },
  { name: 'Hồng', slug: 'hong', hexCode: '#FFC0CB' },
  { name: 'Đỏ', slug: 'do', hexCode: '#FF0000' },
  { name: 'Xanh dương', slug: 'xanh-duong', hexCode: '#0000FF' },
  { name: 'Xanh lá', slug: 'xanh-la', hexCode: '#00FF00' },
  { name: 'Tím', slug: 'tim', hexCode: '#800080' },
  { name: 'Nude', slug: 'nude', hexCode: '#E8BEAC' },
  { name: 'Be', slug: 'be', hexCode: '#F5F5DC' },
  { name: 'Xám', slug: 'xam', hexCode: '#808080' },
  { name: 'Nâu', slug: 'nau', hexCode: '#8B4513' },
  { name: 'Vàng', slug: 'vang', hexCode: '#FFD700' },
  { name: 'Cam', slug: 'cam', hexCode: '#FFA500' },
  { name: 'Navy', slug: 'navy', hexCode: '#000080' },
  { name: 'Rượu vang', slug: 'ruou-vang', hexCode: '#722F37' },
];

async function main() {
  console.log('Seeding color attribute...');

  // Create or find COLOR attribute
  let colorAttribute = await prisma.attribute.findFirst({
    where: { type: 'COLOR' },
  });

  if (!colorAttribute) {
    colorAttribute = await prisma.attribute.create({
      data: {
        name: 'Màu sắc',
        slug: 'mau-sac',
        type: 'COLOR',
        isFilterable: true,
        order: 0,
      },
    });
    console.log('Created COLOR attribute:', colorAttribute.id);
  } else {
    console.log('COLOR attribute already exists:', colorAttribute.id);
  }

  // Add color values
  for (let i = 0; i < colors.length; i++) {
    const color = colors[i];
    
    const existing = await prisma.attributeValue.findFirst({
      where: {
        attributeId: colorAttribute.id,
        slug: color.slug,
      },
    });

    if (!existing) {
      await prisma.attributeValue.create({
        data: {
          attributeId: colorAttribute.id,
          value: color.name,
          slug: color.slug,
          meta: { hexCode: color.hexCode },
          order: i,
        },
      });
      console.log(`Created color: ${color.name}`);
    } else {
      console.log(`Color already exists: ${color.name}`);
    }
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

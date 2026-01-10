import { PrismaClient, ProductType } from '@prisma/client';

const prisma = new PrismaClient();

interface SizeTemplateData {
  productType: ProductType;
  name: string;
  description?: string;
  headers: string[];
  sizes: Record<string, string>[];
  measurements: { name: string; description: string }[];
  tips: string[];
  note?: string;
}

const sizeTemplates: SizeTemplateData[] = [
  {
    productType: 'BRA',
    name: 'Áo lót',
    description: 'Bảng size cho áo lót có gọng, không gọng, Push-up, Bralette',
    headers: ['Size', 'Vòng ngực trên', 'Vòng ngực dưới', 'Cup'],
    sizes: [
      { size: '70A', bust: '78-80 cm', underBust: '68-72 cm', cup: 'A' },
      { size: '70B', bust: '80-82 cm', underBust: '68-72 cm', cup: 'B' },
      { size: '70C', bust: '82-84 cm', underBust: '68-72 cm', cup: 'C' },
      { size: '75A', bust: '83-85 cm', underBust: '73-77 cm', cup: 'A' },
      { size: '75B', bust: '85-87 cm', underBust: '73-77 cm', cup: 'B' },
      { size: '75C', bust: '87-89 cm', underBust: '73-77 cm', cup: 'C' },
      { size: '80A', bust: '88-90 cm', underBust: '78-82 cm', cup: 'A' },
      { size: '80B', bust: '90-92 cm', underBust: '78-82 cm', cup: 'B' },
      { size: '80C', bust: '92-94 cm', underBust: '78-82 cm', cup: 'C' },
      { size: '85B', bust: '95-97 cm', underBust: '83-87 cm', cup: 'B' },
      { size: '85C', bust: '97-99 cm', underBust: '83-87 cm', cup: 'C' },
      { size: '85D', bust: '99-101 cm', underBust: '83-87 cm', cup: 'D' },
    ],
    measurements: [
      { name: 'Vòng ngực trên', description: 'Đo ngang qua điểm cao nhất của ngực. Giữ thước dây song song với mặt đất, không siết quá chặt.' },
      { name: 'Vòng ngực dưới', description: 'Đo sát phía dưới ngực, vòng quanh lưng. Thước dây nên ôm sát nhưng thoải mái.' },
      { name: 'Xác định Cup', description: 'Cup = Vòng ngực trên - Vòng ngực dưới. Chênh lệch 10cm = A, 12.5cm = B, 15cm = C, 17.5cm = D.' },
    ],
    tips: [
      'Đo khi không mặc áo lót hoặc mặc áo không đệm',
      'Nếu phân vân giữa 2 size, chọn size lớn hơn',
      'Đo vào buổi sáng hoặc trưa để có kết quả chính xác nhất',
    ],
  },
  {
    productType: 'PANTY',
    name: 'Quần lót',
    description: 'Bảng size cho quần lót: Thong, Bikini, Hipster, Boyshort',
    headers: ['Size', 'Vòng mông', 'Vòng eo'],
    sizes: [
      { size: 'S', hips: '86-90 cm', waist: '62-66 cm' },
      { size: 'M', hips: '90-94 cm', waist: '66-70 cm' },
      { size: 'L', hips: '94-98 cm', waist: '70-74 cm' },
      { size: 'XL', hips: '98-102 cm', waist: '74-78 cm' },
      { size: 'XXL', hips: '102-106 cm', waist: '78-82 cm' },
    ],
    measurements: [
      { name: 'Vòng mông', description: 'Đo ngang qua điểm nở nhất của mông. Đứng thẳng, hai chân khép lại.' },
      { name: 'Vòng eo', description: 'Đo ngang qua điểm nhỏ nhất của eo (thường trên rốn 2-3cm).' },
    ],
    tips: [
      'Chọn size dựa trên vòng mông là chính xác nhất',
      'Quần lót cotton nên chọn vừa, không quá chật',
      'Quần ren/lace có thể chọn size nhỏ hơn vì co giãn tốt',
    ],
  },
  {
    productType: 'SET',
    name: 'Set đồ lót',
    description: 'Bảng size cho Set đồ lót (Combo Bra + Panty)',
    headers: ['Size Set', 'Size Áo (Bra)', 'Size Quần (Panty)', 'Vòng ngực', 'Vòng mông'],
    sizes: [
      { size: 'S', braSize: '70A-70B', pantySize: 'S', bust: '78-82 cm', hips: '86-90 cm' },
      { size: 'M', braSize: '75A-75B', pantySize: 'M', bust: '83-87 cm', hips: '90-94 cm' },
      { size: 'L', braSize: '80A-80B', pantySize: 'L', bust: '88-92 cm', hips: '94-98 cm' },
      { size: 'XL', braSize: '85A-85B', pantySize: 'XL', bust: '93-97 cm', hips: '98-102 cm' },
    ],
    measurements: [
      { name: 'Vòng ngực', description: 'Đo ngang qua điểm cao nhất của ngực để xác định size áo.' },
      { name: 'Vòng mông', description: 'Đo ngang qua điểm nở nhất của mông để xác định size quần.' },
    ],
    tips: [
      'Set đồ lót đã được phối màu và size matching',
      'Ưu tiên chọn theo vòng ngực nếu phân vân',
      'Nếu áo và quần khác size, liên hệ shop để mua riêng',
    ],
    note: 'Set thường bán theo size chung (S/M/L), đã được tính toán matching giữa áo và quần.',
  },
  {
    productType: 'SLEEPWEAR',
    name: 'Đồ ngủ & Mặc nhà',
    description: 'Bảng size cho váy ngủ, pyjama, bodysuit, đồ bộ mặc nhà',
    headers: ['Size', 'Chiều cao', 'Cân nặng', 'Vòng ngực', 'Vòng eo'],
    sizes: [
      { size: 'S', height: '150-158 cm', weight: '42-48 kg', bust: '78-84 cm', waist: '62-66 cm' },
      { size: 'M', height: '158-165 cm', weight: '48-54 kg', bust: '84-90 cm', waist: '66-70 cm' },
      { size: 'L', height: '165-170 cm', weight: '54-60 kg', bust: '90-96 cm', waist: '70-74 cm' },
      { size: 'XL', height: '170-175 cm', weight: '60-68 kg', bust: '96-102 cm', waist: '74-78 cm' },
    ],
    measurements: [
      { name: 'Chiều cao', description: 'Đo từ đỉnh đầu đến gót chân, đứng thẳng không đi giày.' },
      { name: 'Cân nặng', description: 'Cân vào buổi sáng để có số liệu chính xác nhất.' },
    ],
    tips: [
      'Đồ ngủ nên chọn thoải mái, không quá ôm sát',
      'Bodysuit nên chọn đúng size hoặc nhỏ hơn 1 size nếu thích ôm',
      'Xem kỹ chất liệu: Satin ít co giãn, Cotton co giãn vừa',
    ],
  },
  {
    productType: 'SHAPEWEAR',
    name: 'Đồ định hình',
    description: 'Bảng size cho gen nịt bụng, quần gen, corset',
    headers: ['Size', 'Vòng eo', 'Vòng bụng dưới', 'Vòng mông'],
    sizes: [
      { size: 'S', waist: '60-64 cm', belly: '70-74 cm', hips: '84-88 cm' },
      { size: 'M', waist: '64-68 cm', belly: '74-78 cm', hips: '88-92 cm' },
      { size: 'L', waist: '68-72 cm', belly: '78-82 cm', hips: '92-96 cm' },
      { size: 'XL', waist: '72-76 cm', belly: '82-86 cm', hips: '96-100 cm' },
    ],
    measurements: [
      { name: 'Vòng eo', description: 'Đo ngang qua điểm nhỏ nhất của eo (thắt lưng).' },
      { name: 'Vòng bụng dưới', description: 'Đo ngang qua rốn, vòng quanh bụng dưới.' },
      { name: 'Vòng mông', description: 'Đo ngang qua điểm nở nhất của mông.' },
    ],
    tips: [
      'Đồ định hình có tính chất bó sát, size nhỏ hơn quần áo thường',
      'Chọn size theo vòng eo thực tế, không chọn nhỏ hơn',
      'Mặc lần đầu có thể hơi chật, sẽ giãn nhẹ sau vài lần sử dụng',
    ],
    note: 'Lưu ý: Thông số đồ định hình chặt hơn size quần áo thường 1-2 size.',
  },
];

async function seedSizeTemplates() {
  console.log('🌱 Seeding Size Chart Templates...\n');

  for (const template of sizeTemplates) {
    try {
      await prisma.sizeChartTemplate.upsert({
        where: { productType: template.productType },
        update: {
          name: template.name,
          description: template.description,
          headers: template.headers,
          sizes: template.sizes,
          measurements: template.measurements,
          tips: template.tips,
          note: template.note,
          isActive: true,
        },
        create: {
          productType: template.productType,
          name: template.name,
          description: template.description,
          headers: template.headers,
          sizes: template.sizes,
          measurements: template.measurements,
          tips: template.tips,
          note: template.note,
          isActive: true,
        },
      });
      console.log(`  ✅ ${template.productType}: ${template.name}`);
    } catch (error) {
      console.error(`  ❌ ${template.productType}: ${error}`);
    }
  }

  console.log('\n✨ Seed completed!');
}

// Main execution
seedSizeTemplates()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

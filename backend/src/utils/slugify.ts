import { prisma } from '../lib/prisma';

/**
 * Chuyển text tiếng Việt thành slug URL-friendly
 * Ví dụ: "Áo lót ren gợi cảm màu đỏ" => "ao-lot-ren-goi-cam-mau-do"
 */
export function slugify(text: string): string {
  const vietnameseMap: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'đ': 'd',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    // Uppercase
    'À': 'a', 'Á': 'a', 'Ả': 'a', 'Ã': 'a', 'Ạ': 'a',
    'Ă': 'a', 'Ằ': 'a', 'Ắ': 'a', 'Ẳ': 'a', 'Ẵ': 'a', 'Ặ': 'a',
    'Â': 'a', 'Ầ': 'a', 'Ấ': 'a', 'Ẩ': 'a', 'Ẫ': 'a', 'Ậ': 'a',
    'Đ': 'd',
    'È': 'e', 'É': 'e', 'Ẻ': 'e', 'Ẽ': 'e', 'Ẹ': 'e',
    'Ê': 'e', 'Ề': 'e', 'Ế': 'e', 'Ể': 'e', 'Ễ': 'e', 'Ệ': 'e',
    'Ì': 'i', 'Í': 'i', 'Ỉ': 'i', 'Ĩ': 'i', 'Ị': 'i',
    'Ò': 'o', 'Ó': 'o', 'Ỏ': 'o', 'Õ': 'o', 'Ọ': 'o',
    'Ô': 'o', 'Ồ': 'o', 'Ố': 'o', 'Ổ': 'o', 'Ỗ': 'o', 'Ộ': 'o',
    'Ơ': 'o', 'Ờ': 'o', 'Ớ': 'o', 'Ở': 'o', 'Ỡ': 'o', 'Ợ': 'o',
    'Ù': 'u', 'Ú': 'u', 'Ủ': 'u', 'Ũ': 'u', 'Ụ': 'u',
    'Ư': 'u', 'Ừ': 'u', 'Ứ': 'u', 'Ử': 'u', 'Ữ': 'u', 'Ự': 'u',
    'Ỳ': 'y', 'Ý': 'y', 'Ỷ': 'y', 'Ỹ': 'y', 'Ỵ': 'y',
  };

  return text
    .split('')
    .map(char => vietnameseMap[char] || char)
    .join('')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Tạo slug unique cho Product
 * Nếu slug đã tồn tại, tự động thêm số: ao-lot-ren-1, ao-lot-ren-2, ...
 */
export async function generateUniqueProductSlug(
  name: string,
  excludeId?: number
): Promise<string> {
  const baseSlug = slugify(name);
  
  // Tìm tất cả sản phẩm có slug bắt đầu bằng baseSlug
  const existingProducts = await prisma.product.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  // Nếu không có sản phẩm nào với slug này, trả về baseSlug
  if (existingProducts.length === 0) {
    return baseSlug;
  }

  // Kiểm tra xem baseSlug có được sử dụng chưa
  const slugsSet = new Set(existingProducts.map(p => p.slug));
  
  if (!slugsSet.has(baseSlug)) {
    return baseSlug;
  }

  // Tìm số tiếp theo
  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;
  
  while (slugsSet.has(newSlug)) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  return newSlug;
}

/**
 * Tạo slug unique cho Category
 */
export async function generateUniqueCategorySlug(
  name: string,
  excludeId?: number
): Promise<string> {
  const baseSlug = slugify(name);
  
  const existingCategories = await prisma.category.findMany({
    where: {
      slug: {
        startsWith: baseSlug,
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { slug: true },
  });

  if (existingCategories.length === 0) {
    return baseSlug;
  }

  const slugsSet = new Set(existingCategories.map(c => c.slug));
  
  if (!slugsSet.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 1;
  let newSlug = `${baseSlug}-${counter}`;
  
  while (slugsSet.has(newSlug)) {
    counter++;
    newSlug = `${baseSlug}-${counter}`;
  }

  return newSlug;
}

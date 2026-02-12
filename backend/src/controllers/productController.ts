import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateUniqueProductSlug } from '../utils/slugify';
import { Prisma } from '@prisma/client';
import { processProductImagesAsync } from '../services/imageProcessingService';

// Helper function to group product data by colors
interface ColorGroup {
  colorId: number;
  colorName: string;
  hexCode: string;
  slug: string;
  isDefault: boolean;
  images: { id: number; url: string; noBgUrl?: string | null }[];
  sizes: { variantId: number; size: string; stock: number; price?: number | null; salePrice?: number | null }[];
  totalStock: number;
}

function groupProductByColors(product: {
  productColors?: { colorId: number; isDefault: boolean; order: number; color: { id: number; name: string; hexCode: string; slug: string } }[];
  images?: { id: number; url: string; noBgUrl?: string | null; colorId: number | null }[];
  variants?: { id: number; colorId: number; size: string; stock: number; price: number | null; salePrice: number | null }[];
}): ColorGroup[] {
  if (!product.productColors || product.productColors.length === 0) {
    return [];
  }

  const colorGroups: ColorGroup[] = product.productColors
    .sort((a, b) => a.order - b.order)
    .map(pc => {
      const colorImages = (product.images || [])
        .filter(img => img.colorId === pc.colorId || img.colorId === null)
        .map(img => ({ id: img.id, url: img.url, noBgUrl: img.noBgUrl ?? null }));

      const colorVariants = (product.variants || [])
        .filter(v => v.colorId === pc.colorId)
        .map(v => ({
          variantId: v.id,
          size: v.size,
          stock: v.stock,
          price: v.price,
          salePrice: v.salePrice,
        }));

      return {
        colorId: pc.color.id,
        colorName: pc.color.name,
        hexCode: pc.color.hexCode,
        slug: pc.color.slug,
        isDefault: pc.isDefault,
        images: colorImages,
        sizes: colorVariants,
        totalStock: colorVariants.reduce((sum, v) => sum + v.stock, 0),
      };
    });

  return colorGroups;
}

const isLegacySchemaError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  return (
    normalized.includes('productcolor') ||
    normalized.includes('product_colors') ||
    normalized.includes('ratingaverage') ||
    normalized.includes('reviewcount')
  );
};

const productSelectWithColors = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  salePrice: true,
  categoryId: true,
  isFeatured: true,
  isVisible: true,
  ratingAverage: true,
  reviewCount: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
      noBgUrl: true,
      model3dUrl: true,
      processingStatus: true,
      colorId: true,
    },
  },
  productColors: {
    orderBy: { order: 'asc' as const },
    select: {
      colorId: true,
      isDefault: true,
      order: true,
      color: {
        select: {
          id: true,
          name: true,
          hexCode: true,
          slug: true,
        },
      },
    },
  },
  variants: {
    select: {
      id: true,
      size: true,
      colorId: true,
      stock: true,
      price: true,
      salePrice: true,
    },
  },
} satisfies Prisma.ProductSelect;

const productSelectLegacy = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  salePrice: true,
  categoryId: true,
  isFeatured: true,
  isVisible: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
  images: {
    select: {
      id: true,
      url: true,
      noBgUrl: true,
      model3dUrl: true,
      processingStatus: true,
      colorId: true,
    },
  },
} satisfies Prisma.ProductSelect;

const productDetailSelectWithColors = {
  ...productSelectWithColors,
  productType: true,
  brandId: true,
  variants: {
    select: {
      id: true,
      sku: true,
      size: true,
      colorId: true,
      stock: true,
      price: true,
      salePrice: true,
    },
  },
} satisfies Prisma.ProductSelect;

const productDetailSelectLegacy = {
  ...productSelectLegacy,
  productType: true,
  brandId: true,
  variants: {
    select: {
      id: true,
      sku: true,
      size: true,
      colorId: true,
      stock: true,
      price: true,
      salePrice: true,
    },
  },
} satisfies Prisma.ProductSelect;

type ProductWithColors = Prisma.ProductGetPayload<{ select: typeof productSelectWithColors }>;
type ProductLegacy = Prisma.ProductGetPayload<{ select: typeof productSelectLegacy }>;
type ProductResult = ProductWithColors | ProductLegacy;

type ProductDetailWithColors = Prisma.ProductGetPayload<{ select: typeof productDetailSelectWithColors }>;
type ProductDetailLegacy = Prisma.ProductGetPayload<{ select: typeof productDetailSelectLegacy }>;
type ProductDetailResult = ProductDetailWithColors | ProductDetailLegacy;

// Get all products
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20)); // Max 100
    const {
      categoryId,
      isFeatured,
      minPrice,
      maxPrice,
      search,
      colors,
      sizes,
      sortBy,
      sortOrder,
    } = req.query;

    const skip = (page - 1) * limit;

    // Determine sort field and order
    type SortField = 'createdAt' | 'price' | 'name';
    const validSortFields: SortField[] = ['createdAt', 'price', 'name'];
    const sortField: SortField = validSortFields.includes(sortBy as SortField)
      ? (sortBy as SortField)
      : 'createdAt';
    const order: 'asc' | 'desc' = sortOrder === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: Prisma.ProductWhereInput = { isVisible: true };

    if (categoryId) {
      (where as any).categoryId = Number(categoryId);
    }

    if (isFeatured !== undefined) {
      (where as any).isFeatured = isFeatured === 'true';
    }

    // Price filter - apply at DB level using OR condition for salePrice/price
    if (minPrice || maxPrice) {
      const minP = minPrice ? Number(minPrice) : undefined;
      const maxP = maxPrice ? Number(maxPrice) : undefined;

      // Filter where (salePrice >= min AND salePrice <= max) OR (salePrice IS NULL AND price >= min AND price <= max)
      const priceConditions: Prisma.ProductWhereInput[] = [];

      if (minP !== undefined && maxP !== undefined) {
        priceConditions.push({
          salePrice: { gte: minP, lte: maxP },
        });
        priceConditions.push({
          salePrice: null,
          price: { gte: minP, lte: maxP },
        });
      } else if (minP !== undefined) {
        priceConditions.push({
          salePrice: { gte: minP },
        });
        priceConditions.push({
          salePrice: null,
          price: { gte: minP },
        });
      } else if (maxP !== undefined) {
        priceConditions.push({
          salePrice: { lte: maxP },
        });
        priceConditions.push({
          salePrice: null,
          price: { lte: maxP },
        });
      }

      if (priceConditions.length > 0) {
        (where as any).OR = [...((where as any).OR || []), ...priceConditions];
        // Wrap existing conditions if OR already exists
        if ((where as any).OR && (where as any).OR.length > 0) {
          const existingConditions = { ...where };
          delete (existingConditions as any).OR;
          (where as any).AND = [existingConditions, { OR: priceConditions }];
          delete (where as any).OR;
          delete (where as any).isVisible;
          delete (where as any).categoryId;
          delete (where as any).isFeatured;
        }
      }
    }

    const searchValue = typeof search === 'string'
      ? search
      : Array.isArray(search)
        ? search[0]
        : undefined;

    if (searchValue) {
      const searchCondition = {
        OR: [
          { name: { contains: searchValue, mode: 'insensitive' as const } },
          { description: { contains: searchValue, mode: 'insensitive' as const } },
        ],
      };
      if ((where as any).AND) {
        (where as any).AND.push(searchCondition);
      } else {
        (where as any).AND = [searchCondition];
      }
    }

    // Filter by colors (from variant)
    if (colors && typeof colors === 'string') {
      const colorList = colors.split(',').map(c => c.trim()).filter(Boolean);
      if (colorList.length > 0) {
        (where as any).productColors = {
          some: {
            color: {
              name: { in: colorList },
            },
          },
        };
      }
    }

    // Filter by sizes (from variant)
    if (sizes && typeof sizes === 'string') {
      const sizeList = sizes.split(',').map(s => s.trim()).filter(Boolean);
      if (sizeList.length > 0) {
        (where as any).variants = {
          ...(where as any).variants,
          some: {
            ...(where as any).variants?.some,
            size: { in: sizeList },
          },
        };
      }
    }

    let products: ProductResult[] = [];
    let total = 0;
    let legacyMode = false;

    try {
      [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortField]: order },
          select: productSelectWithColors,
        }),
        prisma.product.count({ where }),
      ]);
    } catch (error) {
      if (!isLegacySchemaError(error)) {
        throw error;
      }

      legacyMode = true;
      const legacyWhere: Prisma.ProductWhereInput = { ...where };
      delete legacyWhere.productColors;
      delete legacyWhere.variants;

      [products, total] = await Promise.all([
        prisma.product.findMany({
          where: legacyWhere,
          skip,
          take: limit,
          orderBy: { [sortField]: order },
          select: productSelectLegacy,
        }),
        prisma.product.count({ where: legacyWhere }),
      ]);
    }

    // Add effectivePrice for frontend convenience
    const responseProducts = products.map(product => {
      const colorGroups = legacyMode || !('productColors' in product)
        ? []
        : groupProductByColors(product);
      const defaultColor = colorGroups.find(cg => cg.isDefault) || colorGroups[0];

      const ratingAverage = 'ratingAverage' in product ? product.ratingAverage : 0;
      const reviewCount = 'reviewCount' in product ? product.reviewCount : 0;
      const variants = 'variants' in product ? product.variants : [];

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        salePrice: product.salePrice,
        effectivePrice: product.salePrice ?? product.price,
        categoryId: product.categoryId,
        isFeatured: product.isFeatured,
        isVisible: product.isVisible,
        ratingAverage,
        reviewCount,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        category: product.category,
        // Default image for listing (first image of default color)
        image: defaultColor?.images[0]?.url || product.images[0]?.url || null,
        images: product.images,
        colorGroups,
        // For backward compatibility
        variants,
      };
    });

    res.json({
      success: true,
      data: responseProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách sản phẩm!' });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let product: ProductDetailResult | null = null;
    let legacyMode = false;

    try {
      product = await prisma.product.findUnique({
        where: { id: Number(id) },
        select: productDetailSelectWithColors,
      });
    } catch (error) {
      if (!isLegacySchemaError(error)) {
        throw error;
      }
      legacyMode = true;
      product = await prisma.product.findUnique({
        where: { id: Number(id) },
        select: productDetailSelectLegacy,
      });
    }

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    const colorGroups = legacyMode || !('productColors' in product)
      ? []
      : groupProductByColors(product);
    const defaultColor = colorGroups.find(cg => cg.isDefault) || colorGroups[0];
    const ratingAverage = 'ratingAverage' in product ? product.ratingAverage : 0;
    const reviewCount = 'reviewCount' in product ? product.reviewCount : 0;

    res.json({
      success: true,
      data: {
        ...product,
        ratingAverage,
        reviewCount,
        colorGroups,
        defaultImage: defaultColor?.images[0]?.url || product.images[0]?.url || null,
      },
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin sản phẩm!' });
  }
};

// Get product by slug
export const getProductBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    let product: ProductDetailResult | null = null;
    let legacyMode = false;

    try {
      product = await prisma.product.findUnique({
        where: { slug },
        select: productDetailSelectWithColors,
      });
    } catch (error) {
      if (!isLegacySchemaError(error)) {
        throw error;
      }
      legacyMode = true;
      product = await prisma.product.findUnique({
        where: { slug },
        select: productDetailSelectLegacy,
      });
    }

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    const colorGroups = legacyMode || !('productColors' in product)
      ? []
      : groupProductByColors(product);
    const defaultColor = colorGroups.find(cg => cg.isDefault) || colorGroups[0];
    const ratingAverage = 'ratingAverage' in product ? product.ratingAverage : 0;
    const reviewCount = 'reviewCount' in product ? product.reviewCount : 0;

    res.json({
      success: true,
      data: {
        ...product,
        ratingAverage,
        reviewCount,
        colorGroups,
        // Default image
        defaultImage: defaultColor?.images[0]?.url || product.images[0]?.url || null,
      },
    });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin sản phẩm!' });
  }
};

// Create new product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      slug: customSlug,
      description,
      price,
      salePrice,
      categoryId,
      isFeatured,
      isVisible,
      images,
      variants,
    } = req.body;

    // Validate required fields (slug không còn bắt buộc - sẽ tự động tạo từ name)
    if (!name || !price || !categoryId) {
      return res.status(400).json({
        error: 'Tên, giá và categoryId là bắt buộc!',
      });
    }

    // Tự động tạo slug từ name nếu không có customSlug
    // Nếu có customSlug, kiểm tra trùng lặp và thêm số nếu cần
    let slug: string;
    if (customSlug) {
      // Kiểm tra slug custom có tồn tại không
      const existingProduct = await prisma.product.findUnique({
        where: { slug: customSlug },
      });
      if (existingProduct) {
        // Tạo slug unique từ customSlug
        slug = await generateUniqueProductSlug(customSlug);
      } else {
        slug = customSlug;
      }
    } else {
      // Tự động tạo slug từ name
      slug = await generateUniqueProductSlug(name);
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: Number(categoryId) },
    });

    if (!category) {
      return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
    }

    // Create product with relations
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price: Number(price),
        salePrice: salePrice ? Number(salePrice) : null,
        categoryId: Number(categoryId),
        isFeatured: isFeatured || false,
        isVisible: isVisible !== undefined ? isVisible : true,
        images: images
          ? {
              create: images.map((url: string) => ({ url })),
            }
          : undefined,
        variants: variants
          ? {
              create: variants.map((v: { sku?: string; size: string; colorId?: number; color?: string; colorName?: string; stock?: number; price?: number; salePrice?: number }, index: number) => ({
                sku: v.sku || `${slug}-${v.size}-${v.colorId || 'default'}-${Date.now()}-${index}`.toUpperCase().replace(/\s+/g, '-'),
                size: v.size,
                colorId: v.colorId || 1,
                stock: v.stock || 0,
                price: v.price || null,
                salePrice: v.salePrice || null,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Lỗi khi tạo sản phẩm!' });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      price,
      salePrice,
      categoryId,
      isFeatured,
      isVisible,
    } = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // If slug is being updated, check if it's already in use
    if (slug && slug !== existingProduct.slug) {
      const slugExists = await prisma.product.findUnique({
        where: { slug },
      });

      if (slugExists) {
        // Tự động tạo slug unique thay vì báo lỗi
        const uniqueSlug = await generateUniqueProductSlug(slug, Number(id));
        req.body.slug = uniqueSlug;
      }
    }

    // If category is being updated, check if it exists
    if (categoryId && categoryId !== existingProduct.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: Number(categoryId) },
      });

      if (!category) {
        return res.status(404).json({ error: 'Không tìm thấy danh mục!' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (req.body.slug) updateData.slug = req.body.slug;
    if (description !== undefined) updateData.description = description;
    if (price) updateData.price = Number(price);
    if (salePrice !== undefined)
      updateData.salePrice = salePrice ? Number(salePrice) : null;
    if (categoryId) updateData.categoryId = Number(categoryId);
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isVisible !== undefined) updateData.isVisible = isVisible;

    // Update product
    const product = await prisma.product.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        category: true,
        images: true,
        variants: true,
      },
    });

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật sản phẩm!' });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Delete product (images and variants will be auto-deleted due to onDelete: Cascade)
    await prisma.product.delete({
      where: { id: Number(id) },
    });

    res.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công!',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa sản phẩm!' });
  }
};

// Get all images of a product
export const getAllProductImages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Get all images
    const images = await prisma.productImage.findMany({
      where: { productId: Number(id) },
      orderBy: { id: 'asc' },
    });

    res.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('Get all product images error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách ảnh sản phẩm!' });
  }
};

// Get product image by ID
export const getProductImageById = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;

    const image = await prisma.productImage.findUnique({
      where: { id: Number(imageId) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!image) {
      return res.status(404).json({ error: 'Không tìm thấy ảnh!' });
    }

    res.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error('Get product image by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin ảnh!' });
  }
};

// Update product image
export const updateProductImage = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL ảnh là bắt buộc!' });
    }

    // Check if image exists
    const existingImage = await prisma.productImage.findUnique({
      where: { id: Number(imageId) },
    });

    if (!existingImage) {
      return res.status(404).json({ error: 'Không tìm thấy ảnh!' });
    }

    // Update image
    const image = await prisma.productImage.update({
      where: { id: Number(imageId) },
      data: { url },
    });

    res.json({
      success: true,
      data: image,
    });
  } catch (error) {
    console.error('Update product image error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật ảnh!' });
  }
};

// Add images to product
export const addProductImages = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { url, urls } = req.body;

    // Support both single url and multiple urls
    let imageUrls: string[] = [];
    
    if (url && typeof url === 'string') {
      // Single image: { "url": "..." }
      imageUrls = [url];
    } else if (urls && Array.isArray(urls)) {
      // Multiple images: { "urls": [...] }
      imageUrls = urls;
    } else {
      return res.status(400).json({ 
        error: 'URL ảnh là bắt buộc! Gửi "url" (string) hoặc "urls" (array)' 
      });
    }

    if (imageUrls.length === 0) {
      return res.status(400).json({ error: 'Danh sách ảnh không được rỗng!' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Add images
    const createdImages = await prisma.productImage.createMany({
      data: imageUrls.map((imageUrl: string) => ({
        url: imageUrl,
        productId: Number(id),
      })),
    });

    // Trigger async image processing (bg removal + 3D generation)
    processProductImagesAsync(Number(id)).catch((err) => {
      console.error(`[Processing] Auto-processing failed for product ${id}:`, err);
    });

    res.status(201).json({
      success: true,
      message: `Đã thêm ${createdImages.count} ảnh thành công!`,
    });
  } catch (error) {
    console.error('Add product images error:', error);
    res.status(500).json({ error: 'Lỗi khi thêm ảnh sản phẩm!' });
  }
};

// Delete product image
export const deleteProductImage = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;

    // Check if image exists
    const image = await prisma.productImage.findUnique({
      where: { id: Number(imageId) },
    });

    if (!image) {
      return res.status(404).json({ error: 'Không tìm thấy ảnh!' });
    }

    // Delete image
    await prisma.productImage.delete({
      where: { id: Number(imageId) },
    });

    res.json({
      success: true,
      message: 'Đã xóa ảnh thành công!',
    });
  } catch (error) {
    console.error('Delete product image error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa ảnh sản phẩm!' });
  }
};

// Get all variants of a product
export const getAllProductVariants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Get all variants
    const variants = await prisma.productVariant.findMany({
      where: { productId: Number(id) },
      orderBy: { id: 'asc' },
    });

    res.json({
      success: true,
      data: variants,
    });
  } catch (error) {
    console.error('Get all product variants error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy danh sách biến thể!' });
  }
};

// Get product variant by ID
export const getProductVariantById = async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params;

    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(variantId) },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!variant) {
      return res.status(404).json({ error: 'Không tìm thấy biến thể!' });
    }

    res.json({
      success: true,
      data: variant,
    });
  } catch (error) {
    console.error('Get product variant by ID error:', error);
    res.status(500).json({ error: 'Lỗi khi lấy thông tin biến thể!' });
  }
};

// Add variants to product
export const addProductVariants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { variants } = req.body;

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ error: 'Danh sách biến thể là bắt buộc!' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
    });

    if (!product) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm!' });
    }

    // Add variants
    const createdVariants = await prisma.productVariant.createMany({
      data: variants.map((v: { sku?: string; size: string; colorId?: number; color?: string; colorName?: string; stock?: number; price?: number; salePrice?: number }) => ({
        sku: v.sku || `${product.slug}-${v.size}-${v.colorId || 'default'}`.toUpperCase(),
        size: v.size,
        colorId: v.colorId || 1,
        stock: v.stock || 0,
        price: v.price || null,
        salePrice: v.salePrice || null,
        productId: Number(id),
      })),
    });

    res.status(201).json({
      success: true,
      message: `Đã thêm ${createdVariants.count} biến thể thành công!`,
    });
  } catch (error: unknown) {
    console.error('Add product variants error:', error);
    
    // Check for unique constraint violation
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] } };
      if (prismaError.code === 'P2002') {
        const target = prismaError.meta?.target?.join(', ') || 'size, color';
        return res.status(400).json({ 
          error: `Biến thể với ${target} đã tồn tại cho sản phẩm này!` 
        });
      }
    }
    
    res.status(500).json({ error: 'Lỗi khi thêm biến thể sản phẩm!' });
  }
};

// Update variant
export const updateProductVariant = async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params;
    const { size, colorId, stock } = req.body;

    // Check if variant exists
    const existingVariant = await prisma.productVariant.findUnique({
      where: { id: Number(variantId) },
    });

    if (!existingVariant) {
      return res.status(404).json({ error: 'Không tìm thấy biến thể!' });
    }

    // Prepare update data
    const updateData: { size?: string; colorId?: number; stock?: number } = {};
    if (size) updateData.size = size;
    if (colorId) updateData.colorId = Number(colorId);
    if (stock !== undefined) updateData.stock = Number(stock);

    // Update variant
    const variant = await prisma.productVariant.update({
      where: { id: Number(variantId) },
      data: updateData,
    });

    res.json({
      success: true,
      data: variant,
    });
  } catch (error) {
    console.error('Update product variant error:', error);
    res.status(500).json({ error: 'Lỗi khi cập nhật biến thể!' });
  }
};

// Delete variant
export const deleteProductVariant = async (req: Request, res: Response) => {
  try {
    const { variantId } = req.params;

    // Check if variant exists
    const variant = await prisma.productVariant.findUnique({
      where: { id: Number(variantId) },
    });

    if (!variant) {
      return res.status(404).json({ error: 'Không tìm thấy biến thể!' });
    }

    // Delete variant
    await prisma.productVariant.delete({
      where: { id: Number(variantId) },
    });

    res.json({
      success: true,
      message: 'Đã xóa biến thể thành công!',
    });
  } catch (error) {
    console.error('Delete product variant error:', error);
    res.status(500).json({ error: 'Lỗi khi xóa biến thể!' });
  }
};

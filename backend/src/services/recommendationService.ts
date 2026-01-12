import { prisma } from '../lib/prisma';
import { ProductType, Prisma } from '@prisma/client';

// Types
interface ProductCard {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  image: string | null;
  categoryId: number;
  categoryName: string;
  ratingAverage: number;
  reviewCount: number;
  colors: string[];
  hasStock: boolean;
}

interface ScoredProduct {
  product: ProductCard;
  score: number;
  reasons: string[];
}

interface UserPreferenceData {
  preferredSizes: Record<string, string[]>;
  colorAffinities: Record<string, number>;
  categoryWeights: Record<string, number>;
  avgOrderValue: number;
  priceRange: { min: number; max: number };
}

// Helper: Format product to card
async function formatProductCard(product: Prisma.ProductGetPayload<{
  include: {
    images: { take: 1 };
    variants: true;
    category: { select: { name: true } };
  };
}>): Promise<ProductCard> {
  const colors = [...new Set(product.variants.map(v => v.colorName))];
  const hasStock = product.variants.some(v => v.stock > 0);
  
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    salePrice: product.salePrice,
    image: product.images[0]?.url || null,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    ratingAverage: product.ratingAverage,
    reviewCount: product.reviewCount,
    colors,
    hasStock
  };
}

// Get price range category
function getPriceRange(price: number): string {
  if (price < 200000) return 'budget';
  if (price < 400000) return 'mid';
  if (price < 700000) return 'premium';
  return 'luxury';
}

/**
 * Get similar products based on content (category, type, price, colors)
 */
export async function getSimilarProducts(
  productId: number,
  limit: number = 12,
  userId?: number
): Promise<{ products: ProductCard[]; algorithm: string }> {
  // Get source product
  const sourceProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: true,
      category: true,
      attributes: { include: { attributeValue: true } }
    }
  });

  if (!sourceProduct) {
    return { products: [], algorithm: 'content-based' };
  }

  const sourceColors = [...new Set(sourceProduct.variants.map(v => v.colorName))];
  const sourcePriceRange = getPriceRange(sourceProduct.salePrice || sourceProduct.price);

  // Get user preferences for size-aware filtering
  let userPref: UserPreferenceData | null = null;
  if (userId) {
    const pref = await prisma.userPreference.findUnique({
      where: { userId }
    });
    if (pref) {
      userPref = {
        preferredSizes: pref.preferredSizes as Record<string, string[]> || {},
        colorAffinities: pref.colorAffinities as Record<string, number> || {},
        categoryWeights: pref.categoryWeights as Record<string, number> || {},
        avgOrderValue: pref.avgOrderValue,
        priceRange: pref.priceRange as { min: number; max: number } || { min: 0, max: 1000000 }
      };
    }
  }

  // Find candidate products
  const candidates = await prisma.product.findMany({
    where: {
      id: { not: productId },
      isVisible: true,
      deletedAt: null,
      OR: [
        { categoryId: sourceProduct.categoryId },
        { productType: sourceProduct.productType }
      ]
    },
    include: {
      images: { take: 1 },
      variants: true,
      category: { select: { name: true } },
      attributes: { include: { attributeValue: true } }
    },
    take: 100 // Get more candidates for scoring
  });

  // Score candidates
  const scored: ScoredProduct[] = [];

  for (const candidate of candidates) {
    let score = 0;
    const reasons: string[] = [];
    const candidateColors = [...new Set(candidate.variants.map(v => v.colorName))];
    const candidatePriceRange = getPriceRange(candidate.salePrice || candidate.price);

    // Same category: +0.30
    if (candidate.categoryId === sourceProduct.categoryId) {
      score += 0.30;
      reasons.push('Cùng danh mục');
    }

    // Same product type: +0.20
    if (candidate.productType === sourceProduct.productType) {
      score += 0.20;
      reasons.push('Cùng loại sản phẩm');
    }

    // Similar price range: +0.15
    if (candidatePriceRange === sourcePriceRange) {
      score += 0.15;
      reasons.push('Cùng tầm giá');
    }

    // Color overlap: up to +0.20
    const colorOverlap = sourceColors.filter(c => candidateColors.includes(c)).length;
    if (colorOverlap > 0) {
      score += Math.min(0.20, colorOverlap * 0.1);
      reasons.push('Màu tương tự');
    }

    // Popularity boost: +0.10 for high-rated products
    if (candidate.ratingAverage >= 4.0 && candidate.reviewCount >= 5) {
      score += 0.10;
    }

    // Has stock: +0.05
    const hasStock = candidate.variants.some(v => v.stock > 0);
    if (hasStock) {
      score += 0.05;
    } else {
      score -= 0.30; // Penalty for out of stock
    }

    // Size-aware bonus if user logged in
    if (userPref) {
      const productType = candidate.productType;
      const preferredSizes = userPref.preferredSizes[productType] || [];
      const hasPrefSize = candidate.variants.some(v => 
        preferredSizes.includes(v.size) && v.stock > 0
      );
      if (hasPrefSize) {
        score += 0.15;
        reasons.push('Có size của bạn');
      }

      // Color affinity bonus
      const colorBonus = candidateColors.reduce((sum, color) => {
        return sum + (userPref!.colorAffinities[color] || 0) * 0.05;
      }, 0);
      score += Math.min(0.10, colorBonus);
    }

    scored.push({
      product: await formatProductCard(candidate),
      score,
      reasons
    });
  }

  // Sort by score and take top
  const topProducts = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.product);

  return {
    products: topProducts,
    algorithm: userId ? 'content-based+personalized' : 'content-based'
  };
}

/**
 * Get recently viewed products for a user/session
 */
export async function getRecentlyViewed(
  sessionId: string,
  userId?: number,
  limit: number = 10,
  excludeId?: number
): Promise<ProductCard[]> {
  const whereClause: Prisma.ProductViewWhereInput = userId
    ? { OR: [{ userId }, { sessionId }] }
    : { sessionId };

  const recentViews = await prisma.productView.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    distinct: ['productId'],
    take: limit + 1, // Get extra in case we need to exclude
    select: { productId: true }
  });

  let productIds = recentViews.map(v => v.productId);
  
  // Exclude current product if specified
  if (excludeId) {
    productIds = productIds.filter(id => id !== excludeId);
  }
  productIds = productIds.slice(0, limit);

  if (productIds.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isVisible: true,
      deletedAt: null
    },
    include: {
      images: { take: 1 },
      variants: true,
      category: { select: { name: true } }
    }
  });

  // Maintain order from recent views
  const productMap = new Map(products.map(p => [p.id, p]));
  const orderedProducts: ProductCard[] = [];
  
  for (const id of productIds) {
    const product = productMap.get(id);
    if (product) {
      orderedProducts.push(await formatProductCard(product));
    }
  }

  return orderedProducts;
}

/**
 * Get trending products (high view growth)
 */
export async function getTrendingProducts(
  limit: number = 10,
  productType?: ProductType
): Promise<Array<ProductCard & { growthRate: number; thisWeekViews: number }>> {
  const now = new Date();
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get view counts
  const [thisWeekViews, lastWeekViews] = await Promise.all([
    prisma.productView.groupBy({
      by: ['productId'],
      where: { createdAt: { gte: thisWeek } },
      _count: { productId: true }
    }),
    prisma.productView.groupBy({
      by: ['productId'],
      where: { createdAt: { gte: lastWeek, lt: thisWeek } },
      _count: { productId: true }
    })
  ]);

  const lastWeekMap = new Map(lastWeekViews.map(v => [v.productId, v._count.productId]));

  // Calculate growth
  const trending = thisWeekViews
    .map(v => {
      const lastCount = lastWeekMap.get(v.productId) || 1;
      const growthRate = ((v._count.productId - lastCount) / lastCount) * 100;
      return {
        productId: v.productId,
        thisWeekViews: v._count.productId,
        growthRate: Math.round(growthRate),
        score: v._count.productId * (1 + growthRate / 100)
      };
    })
    .filter(v => v.thisWeekViews >= 3) // Minimum views
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2);

  // Get product details
  const productIds = trending.map(t => t.productId);
  
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isVisible: true,
      deletedAt: null,
      ...(productType && { productType })
    },
    include: {
      images: { take: 1 },
      variants: true,
      category: { select: { name: true } }
    }
  });

  const productMap = new Map(products.map(p => [p.id, p]));

  const result: Array<ProductCard & { growthRate: number; thisWeekViews: number }> = [];

  for (const t of trending) {
    const product = productMap.get(t.productId);
    if (product) {
      const card = await formatProductCard(product);
      result.push({
        ...card,
        growthRate: t.growthRate,
        thisWeekViews: t.thisWeekViews
      });
    }
    if (result.length >= limit) break;
  }

  return result;
}

/**
 * Get products frequently bought together
 */
export async function getBoughtTogether(
  productId: number,
  limit: number = 5
): Promise<Array<ProductCard & { confidence: number; coCount: number }>> {
  // Get orders containing this product
  const ordersWithProduct = await prisma.orderItem.findMany({
    where: { productId },
    select: { orderId: true }
  });

  if (ordersWithProduct.length === 0) {
    return [];
  }

  const orderIds = ordersWithProduct.map(o => o.orderId);

  // Get co-purchased products
  const coProducts = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      orderId: { in: orderIds },
      productId: { not: productId }
    },
    _count: { productId: true }
  });

  const totalOrders = orderIds.length;

  // Calculate confidence and filter
  const associations = coProducts
    .map(p => ({
      productId: p.productId,
      coCount: p._count.productId,
      confidence: Math.round((p._count.productId / totalOrders) * 100)
    }))
    .filter(a => a.confidence >= 5) // At least 5% co-purchase
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);

  if (associations.length === 0) {
    return [];
  }

  // Get product details
  const productIds = associations.map(a => a.productId);
  
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isVisible: true,
      deletedAt: null
    },
    include: {
      images: { take: 1 },
      variants: true,
      category: { select: { name: true } }
    }
  });

  const productMap = new Map(products.map(p => [p.id, p]));
  const result: Array<ProductCard & { confidence: number; coCount: number }> = [];

  for (const assoc of associations) {
    const product = productMap.get(assoc.productId);
    if (product) {
      const card = await formatProductCard(product);
      result.push({
        ...card,
        confidence: assoc.confidence,
        coCount: assoc.coCount
      });
    }
  }

  return result;
}

/**
 * Get personalized recommendations for logged-in user
 */
export async function getPersonalizedRecommendations(
  userId: number,
  limit: number = 12,
  excludeIds: number[] = []
): Promise<{ products: ProductCard[]; reason: string }> {
  // Get user preference
  const userPref = await prisma.userPreference.findUnique({
    where: { userId }
  });

  // Get user's recent views and purchases
  const [recentViews, recentOrders] = await Promise.all([
    prisma.productView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { productId: true }
    }),
    prisma.order.findMany({
      where: { 
        userId,
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        items: { select: { productId: true } }
      }
    })
  ]);

  const viewedIds = recentViews.map(v => v.productId);
  const purchasedIds = recentOrders.flatMap(o => o.items.map(i => i.productId));
  const interactedIds = [...new Set([...viewedIds, ...purchasedIds, ...excludeIds])];

  // Build preference-based query
  let reason = 'Gợi ý dựa trên';
  const reasons: string[] = [];

  const categoryWeights = userPref?.categoryWeights as Record<string, number> || {};
  const topCategories = Object.entries(categoryWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([id]) => parseInt(id));

  if (topCategories.length > 0) {
    reasons.push('danh mục yêu thích');
  }

  const preferredSizes = userPref?.preferredSizes as Record<string, string[]> || {};
  const hasPreferredSizes = Object.values(preferredSizes).some(arr => arr.length > 0);
  if (hasPreferredSizes) {
    reasons.push('size của bạn');
  }

  const colorAffinities = userPref?.colorAffinities as Record<string, number> || {};
  const topColors = Object.entries(colorAffinities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([color]) => color);
  if (topColors.length > 0) {
    reasons.push(`màu ${topColors[0]}`);
  }

  reason = reasons.length > 0 ? `Gợi ý dựa trên ${reasons.join(', ')}` : 'Có thể bạn thích';

  // Get candidate products
  const candidates = await prisma.product.findMany({
    where: {
      id: { notIn: interactedIds },
      isVisible: true,
      deletedAt: null,
      ...(topCategories.length > 0 && { categoryId: { in: topCategories } })
    },
    include: {
      images: { take: 1 },
      variants: true,
      category: { select: { name: true } }
    },
    take: 100
  });

  // Score by user affinity
  const scored: Array<{ product: typeof candidates[0]; score: number }> = [];

  for (const candidate of candidates) {
    let score = 0;
    const candidateColors = [...new Set(candidate.variants.map(v => v.colorName))];

    // Category weight
    const catWeight = categoryWeights[candidate.categoryId.toString()] || 0;
    score += catWeight * 0.3;

    // Color affinity
    for (const color of candidateColors) {
      score += (colorAffinities[color] || 0) * 0.1;
    }

    // Size availability (if preference exists)
    const productType = candidate.productType;
    const prefSizes = preferredSizes[productType] || [];
    if (prefSizes.length > 0) {
      const hasPrefSize = candidate.variants.some(v => 
        prefSizes.includes(v.size) && v.stock > 0
      );
      if (hasPrefSize) {
        score += 0.2;
      }
    }

    // Stock availability
    const hasStock = candidate.variants.some(v => v.stock > 0);
    if (!hasStock) {
      score -= 0.5;
    }

    // Popularity
    if (candidate.ratingAverage >= 4.0) {
      score += 0.1;
    }

    scored.push({ product: candidate, score });
  }

  // Sort and format
  const topProducts = await Promise.all(
    scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => formatProductCard(s.product))
  );

  return { products: topProducts, reason };
}

/**
 * Track recommendation click
 */
export async function trackRecommendationClick(data: {
  productId: number;
  sourceProductId?: number;
  algorithm: string;
  position: number;
  sectionType: string;
  sessionId: string;
  userId?: number;
}): Promise<void> {
  await prisma.recommendationClick.create({
    data: {
      productId: data.productId,
      sourceProductId: data.sourceProductId,
      algorithm: data.algorithm,
      position: data.position,
      sectionType: data.sectionType,
      sessionId: data.sessionId,
      userId: data.userId
    }
  });
}

/**
 * Update user preference based on behavior
 */
export async function updateUserPreference(userId: number): Promise<void> {
  // Get purchase history
  const orders = await prisma.order.findMany({
    where: {
      userId,
      status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              categoryId: true,
              productType: true,
              price: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Get view history
  const views = await prisma.productView.findMany({
    where: { userId },
    include: {
      product: {
        select: {
          categoryId: true,
          variants: { select: { colorName: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  // Calculate preferred sizes from purchases
  const sizeMap: Record<string, Record<string, number>> = {};
  
  for (const order of orders) {
    for (const item of order.items) {
      const variantStr = item.variant as string | null;
      if (variantStr) {
        let size = '';
        try {
          const v = JSON.parse(variantStr);
          size = v.size || v.Size || '';
        } catch {
          const match = variantStr.match(/size[:\s]*([^,]+)/i);
          if (match) size = match[1].trim();
        }
        
        if (size && item.product) {
          const type = item.product.productType;
          if (!sizeMap[type]) sizeMap[type] = {};
          sizeMap[type][size] = (sizeMap[type][size] || 0) + item.quantity;
        }
      }
    }
  }

  // Get top sizes per type
  const preferredSizes: Record<string, string[]> = {};
  for (const [type, sizes] of Object.entries(sizeMap)) {
    preferredSizes[type] = Object.entries(sizes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([size]) => size);
  }

  // Calculate color affinities
  const colorCounts: Record<string, number> = {};
  
  // From views (weight 0.3)
  for (const view of views) {
    if (view.product?.variants) {
      for (const v of view.product.variants) {
        colorCounts[v.colorName] = (colorCounts[v.colorName] || 0) + 0.3;
      }
    }
  }
  
  // From purchases (weight 1.0)
  for (const order of orders) {
    for (const item of order.items) {
      const variantStr = item.variant as string | null;
      if (variantStr) {
        let color = '';
        try {
          const v = JSON.parse(variantStr);
          color = v.color || v.colorName || v.Color || '';
        } catch {
          const match = variantStr.match(/(?:color|màu)[:\s]*([^,]+)/i);
          if (match) color = match[1].trim();
        }
        if (color) {
          colorCounts[color] = (colorCounts[color] || 0) + item.quantity;
        }
      }
    }
  }

  // Normalize colors
  const maxColor = Math.max(...Object.values(colorCounts), 1);
  const colorAffinities: Record<string, number> = {};
  for (const [color, count] of Object.entries(colorCounts)) {
    colorAffinities[color] = Math.round((count / maxColor) * 100) / 100;
  }

  // Calculate category weights
  const categoryCounts: Record<string, number> = {};
  
  for (const view of views) {
    if (view.product) {
      const catId = view.product.categoryId.toString();
      categoryCounts[catId] = (categoryCounts[catId] || 0) + 0.5;
    }
  }
  
  for (const order of orders) {
    for (const item of order.items) {
      if (item.product) {
        const catId = item.product.categoryId.toString();
        categoryCounts[catId] = (categoryCounts[catId] || 0) + item.quantity;
      }
    }
  }

  const maxCat = Math.max(...Object.values(categoryCounts), 1);
  const categoryWeights: Record<string, number> = {};
  for (const [cat, count] of Object.entries(categoryCounts)) {
    categoryWeights[cat] = Math.round((count / maxCat) * 100) / 100;
  }

  // Calculate price stats
  const prices: number[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      prices.push(item.price);
    }
  }
  
  prices.sort((a, b) => a - b);
  const avgOrderValue = prices.length > 0 
    ? prices.reduce((a, b) => a + b, 0) / prices.length 
    : 0;
  const priceRange = prices.length > 0
    ? { 
        min: prices[Math.floor(prices.length * 0.25)] || 0,
        max: prices[Math.floor(prices.length * 0.75)] || 1000000
      }
    : { min: 0, max: 1000000 };

  // Upsert preference
  await prisma.userPreference.upsert({
    where: { userId },
    update: {
      preferredSizes,
      colorAffinities,
      categoryWeights,
      avgOrderValue,
      priceRange,
      lastUpdated: new Date()
    },
    create: {
      userId,
      preferredSizes,
      colorAffinities,
      categoryWeights,
      avgOrderValue,
      priceRange
    }
  });
}

/**
 * Get new arrivals
 */
export async function getNewArrivals(
  limit: number = 10,
  productType?: ProductType
): Promise<ProductCard[]> {
  const products = await prisma.product.findMany({
    where: {
      isVisible: true,
      deletedAt: null,
      ...(productType && { productType })
    },
    include: {
      images: { take: 1 },
      variants: true,
      category: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return Promise.all(products.map(formatProductCard));
}

/**
 * Get best sellers
 */
export async function getBestSellers(
  limit: number = 10,
  categoryId?: number,
  days: number = 30
): Promise<ProductCard[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const topSold = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        createdAt: { gte: since },
        status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
      }
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: limit * 2
  });

  const productIds = topSold.map(t => t.productId);

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isVisible: true,
      deletedAt: null,
      ...(categoryId && { categoryId })
    },
    include: {
      images: { take: 1 },
      variants: true,
      category: { select: { name: true } }
    }
  });

  // Sort by sales
  const salesMap = new Map(topSold.map(t => [t.productId, t._sum.quantity || 0]));
  products.sort((a, b) => (salesMap.get(b.id) || 0) - (salesMap.get(a.id) || 0));

  return Promise.all(products.slice(0, limit).map(formatProductCard));
}

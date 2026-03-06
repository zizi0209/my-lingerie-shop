import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { embedTexts } from './embeddingClient';
import { ensureProductIndex, searchHybrid, searchSuggestions as redisSearchSuggestions } from '../lib/redisSearch';

interface SearchOptions {
  page?: number;
  limit?: number;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  sortBy?: string;
  userId?: number;
  sessionId?: string;
}

interface ProductResult {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  categoryId: number;
  isFeatured: boolean;
  ratingAverage: number;
  reviewCount: number;
  createdAt: Date;
  category: { id: number; name: string; slug: string };
  images: { url: string }[];
  variants: { colorId: number; size: string; stock: number; color?: { name: string } | null }[];
  score?: number;
}

interface DynamicFilters {
  categories: { id: number; name: string; slug: string; count: number }[];
  priceRange: { min: number; max: number };
  colors: { name: string; count: number }[];
  sizes: { name: string; count: number }[];
}

interface SearchResult {
  products: ProductResult[];
  filters: DynamicFilters;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    keyword: string;
    searchType: 'navigation' | 'text' | 'fuzzy' | 'hybrid';
    searchEngine: 'postgres' | 'redis_hybrid';
  };
}

// Normalize query: lowercase, trim
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

const getSearchEngine = (): 'postgres' | 'redis_hybrid' =>
  process.env.SEARCH_ENGINE === 'redis_hybrid' ? 'redis_hybrid' : 'postgres';

const shouldFallbackToPostgres = () => process.env.SEARCH_FALLBACK_TO_POSTGRES !== 'false';

// Check if query is a navigation keyword
async function checkNavigationKeyword(query: string) {
  const keyword = await prisma.searchKeyword.findFirst({
    where: {
      keyword: { equals: query, mode: 'insensitive' },
      isActive: true,
    },
  });
  return keyword;
}

// Expand query with synonyms
async function expandWithSynonyms(query: string): Promise<string[]> {
  const words = query.split(/\s+/);
  const expandedWords: string[] = [...words];

  // Batch load all synonyms at once instead of N+1 queries
  const synonyms = await prisma.searchSynonym.findMany({
    where: {
      word: { in: words, mode: 'insensitive' },
      isActive: true,
    },
  });

  // Add synonyms to expanded words
  for (const synonym of synonyms) {
    expandedWords.push(synonym.synonym);
  }

  // Batch update hit counts
  if (synonyms.length > 0) {
    await prisma.searchSynonym.updateMany({
      where: { id: { in: synonyms.map(s => s.id) } },
      data: { hitCount: { increment: 1 } },
    });
  }

  return [...new Set(expandedWords)];
}

// Log search query
async function logSearch(
  keyword: string,
  results: number,
  userId?: number,
  sessionId?: string
) {
  await prisma.searchLog.create({
    data: {
      keyword,
      results,
      userId,
      sessionId,
    },
  });
}

// Build dynamic filters from search results
async function buildDynamicFilters(
  productIds: number[]
): Promise<DynamicFilters> {
  if (productIds.length === 0) {
    return {
      categories: [],
      priceRange: { min: 0, max: 0 },
      colors: [],
      sizes: [],
    };
  }

  // Get categories with counts
  const categoryStats = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { id: { in: productIds } },
    _count: { id: true },
  });

  const categoryIds = categoryStats.map((c) => c.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true, slug: true },
  });

  const categoriesWithCount = categories.map((cat) => ({
    ...cat,
    count: categoryStats.find((c) => c.categoryId === cat.id)?._count.id || 0,
  }));

  // Get price range
  const priceStats = await prisma.product.aggregate({
    where: { id: { in: productIds } },
    _min: { price: true },
    _max: { price: true },
  });

  // Get colors and sizes from variants
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: productIds }, stock: { gt: 0 } },
    select: { 
      colorId: true, 
      size: true,
      color: { select: { name: true } }
    },
  });

  const colorCounts = new Map<string, number>();
  const sizeCounts = new Map<string, number>();

  variants.forEach((v) => {
    const colorName = v.color?.name || '';
    if (colorName) {
      colorCounts.set(colorName, (colorCounts.get(colorName) || 0) + 1);
    }
    sizeCounts.set(v.size, (sizeCounts.get(v.size) || 0) + 1);
  });

  return {
    categories: categoriesWithCount.sort((a, b) => b.count - a.count),
    priceRange: {
      min: priceStats._min.price || 0,
      max: priceStats._max.price || 0,
    },
    colors: Array.from(colorCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    sizes: Array.from(sizeCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        return sizeOrder.indexOf(a.name) - sizeOrder.indexOf(b.name);
      }),
  };
}

// Handle navigation keyword search (Sale, New, Hot)
async function handleNavigationSearch(
  keyword: { type: string; config: Prisma.JsonValue; displayName: string },
  _options: SearchOptions
): Promise<{ where: Prisma.ProductWhereInput; orderBy: Prisma.ProductOrderByWithRelationInput }> {
  const config = keyword.config as Record<string, unknown>;
  let where: Prisma.ProductWhereInput = { isVisible: true };
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

  if (keyword.type === 'FILTER') {
    if (config.filterType === 'sale') {
      where = {
        ...where,
        salePrice: { not: null },
      };
    } else if (config.filterType === 'new') {
      const days = (config.days as number) || 30;
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      where = {
        ...where,
        createdAt: { gte: dateThreshold },
      };
    }
  } else if (keyword.type === 'SORT') {
    if (config.sortType === 'popular') {
      orderBy = { reviewCount: 'desc' };
    }
  }

  return { where, orderBy };
}

// Main search function
async function postgresSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const {
    page = 1,
    limit = 20,
    categoryId,
    minPrice,
    maxPrice,
    colors,
    sizes,
    sortBy,
    userId,
    sessionId,
  } = options;

  const offset = (page - 1) * limit;
  const normalizedQuery = normalizeQuery(query);

  let searchType: 'navigation' | 'text' | 'fuzzy' = 'text';
  let baseWhere: Prisma.ProductWhereInput = { isVisible: true };
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

  // 1. Check navigation keywords first
  const navKeyword = await checkNavigationKeyword(normalizedQuery);
  if (navKeyword) {
    searchType = 'navigation';
    const navResult = await handleNavigationSearch(navKeyword, options);
    baseWhere = { ...baseWhere, ...navResult.where };
    orderBy = navResult.orderBy;
  } else {
    // 2. Expand query with synonyms
    const expandedQueries = await expandWithSynonyms(normalizedQuery);
    
    // 3. Build text search conditions
    const searchConditions: Prisma.ProductWhereInput[] = [];
    
    for (const q of expandedQueries) {
      // Exact/partial match on name
      searchConditions.push({
        name: { contains: q, mode: 'insensitive' },
      });
      // Match on description
      searchConditions.push({
        description: { contains: q, mode: 'insensitive' },
      });
    }

    // Also search by category name/slug
    const matchingCategories = await prisma.category.findMany({
      where: {
        OR: [
          { name: { contains: normalizedQuery, mode: 'insensitive' } },
          { slug: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (matchingCategories.length > 0) {
      searchConditions.push({
        categoryId: { in: matchingCategories.map((c) => c.id) },
      });
    }

    if (searchConditions.length > 0) {
      baseWhere = {
        ...baseWhere,
        OR: searchConditions,
      };
    }
  }

  // Apply additional filters
  if (categoryId) {
    baseWhere = { ...baseWhere, categoryId };
  }

  // Apply price filter at DB level
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceConditions: Prisma.ProductWhereInput[] = [];
    
    if (minPrice !== undefined && maxPrice !== undefined) {
      // (salePrice >= min AND salePrice <= max) OR (salePrice IS NULL AND price >= min AND price <= max)
      priceConditions.push({ salePrice: { gte: minPrice, lte: maxPrice } });
      priceConditions.push({ salePrice: null, price: { gte: minPrice, lte: maxPrice } });
    } else if (minPrice !== undefined) {
      priceConditions.push({ salePrice: { gte: minPrice } });
      priceConditions.push({ salePrice: null, price: { gte: minPrice } });
    } else if (maxPrice !== undefined) {
      priceConditions.push({ salePrice: { lte: maxPrice } });
      priceConditions.push({ salePrice: null, price: { lte: maxPrice } });
    }
    
    if (priceConditions.length > 0) {
      baseWhere = {
        AND: [
          baseWhere,
          { OR: priceConditions },
        ],
      };
    }
  }

  if (colors && colors.length > 0) {
    baseWhere = {
      ...baseWhere,
      variants: {
        some: { color: { name: { in: colors } } },
      },
    };
  }

  if (sizes && sizes.length > 0) {
    baseWhere = {
      ...baseWhere,
      variants: {
        some: { size: { in: sizes } },
      },
    };
  }

  // Apply sorting (price sorting will be done manually for effective price)
  if (sortBy) {
    switch (sortBy) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'popular':
        orderBy = { reviewCount: 'desc' };
        break;
      case 'rating':
        orderBy = { ratingAverage: 'desc' };
        break;
      case 'price_asc':
        orderBy = { price: 'asc' }; // Use price for sorting (salePrice sorting would need raw query)
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
    }
  }

  // Enforce limit bounds
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safeOffset = Math.max(0, offset);

  // Execute search with pagination at DB level
  const [products, total, filterProductIds] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      orderBy,
      skip: safeOffset,
      take: safeLimit,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        salePrice: true,
        categoryId: true,
        isFeatured: true,
        ratingAverage: true,
        reviewCount: true,
        createdAt: true,
        category: {
          select: { id: true, name: true, slug: true },
        },
        images: {
          take: 1,
          select: { url: true },
        },
        variants: {
          where: { stock: { gt: 0 } },
          select: { 
            colorId: true, 
            size: true, 
            stock: true,
            color: { select: { name: true } }
          },
        },
      },
    }),
    prisma.product.count({ where: baseWhere }),
    // Get product IDs for filters (limit to reasonable number for filter calculation)
    prisma.product.findMany({
      where: baseWhere,
      select: { id: true },
      take: 500, // Limit for filter calculation to avoid bandwidth issues
    }),
  ]);

  // Build dynamic filters
  const filters = await buildDynamicFilters(filterProductIds.map((p) => p.id));

  // Log search
  await logSearch(query, total, userId, sessionId);

  return {
    products: products as ProductResult[],
    filters,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      keyword: query,
      searchType,
      searchEngine: 'postgres',
    },
  };
}

async function redisHybridSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const {
    page = 1,
    limit = 20,
    categoryId,
    minPrice,
    maxPrice,
    colors,
    sizes,
    sortBy,
    userId,
    sessionId,
  } = options;

  const offset = (page - 1) * limit;
  const normalizedQuery = normalizeQuery(query);

  const navKeyword = await checkNavigationKeyword(normalizedQuery);
  if (navKeyword) {
    return postgresSearch(query, options);
  }

  const expandedQueries = await expandWithSynonyms(normalizedQuery);
  const indexReady = await ensureProductIndex();
  if (!indexReady && shouldFallbackToPostgres()) {
    return postgresSearch(query, options);
  }
  const embeddings = await embedTexts([normalizedQuery]);
  const embedding = embeddings[0];

  if (!embedding || embedding.length === 0) {
    if (shouldFallbackToPostgres()) {
      return postgresSearch(query, options);
    }
    return {
      products: [],
      filters: {
        categories: [],
        priceRange: { min: 0, max: 0 },
        colors: [],
        sizes: [],
      },
      meta: {
        total: 0,
        page,
        limit,
        totalPages: 0,
        keyword: query,
        searchType: 'hybrid',
        searchEngine: 'redis_hybrid',
      },
    };
  }

  const safeLimit = Math.min(100, Math.max(1, limit));
  const requiredLimit = Math.max(safeLimit + offset, safeLimit);
  const knnCandidates = Math.max(requiredLimit * 3, Number(process.env.SEARCH_KNN_CANDIDATES || 120));

  const { total, ids } = await searchHybrid(
    expandedQueries,
    embedding || [],
    {
      categoryId,
      minPrice,
      maxPrice,
      colors,
      sizes,
      isVisible: true,
    },
    requiredLimit,
    knnCandidates
  );

  const pagedIds = ids.slice(offset, offset + safeLimit);

  if (pagedIds.length === 0) {
    await logSearch(query, 0, userId, sessionId);
    return {
      products: [],
      filters: {
        categories: [],
        priceRange: { min: 0, max: 0 },
        colors: [],
        sizes: [],
      },
      meta: {
        total: 0,
        page,
        limit: safeLimit,
        totalPages: 0,
        keyword: query,
        searchType: 'hybrid',
        searchEngine: 'redis_hybrid',
      },
    };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: pagedIds } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      salePrice: true,
      categoryId: true,
      isFeatured: true,
      ratingAverage: true,
      reviewCount: true,
      createdAt: true,
      category: {
        select: { id: true, name: true, slug: true },
      },
      images: {
        take: 1,
        select: { url: true },
      },
      variants: {
        where: { stock: { gt: 0 } },
        select: {
          colorId: true,
          size: true,
          stock: true,
          color: { select: { name: true } },
        },
      },
    },
  });

  const productMap = new Map<number, ProductResult>();
  products.forEach((product) => {
    productMap.set(product.id, product as ProductResult);
  });

  const orderedProducts = pagedIds
    .map((id) => productMap.get(id))
    .filter((product): product is ProductResult => Boolean(product));

  let sortedProducts = orderedProducts;

  if (sortBy) {
    sortedProducts = [...orderedProducts].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'popular':
          return b.reviewCount - a.reviewCount;
        case 'rating':
          return b.ratingAverage - a.ratingAverage;
        case 'price_asc':
          return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
        case 'price_desc':
          return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
        default:
          return 0;
      }
    });
  }

  const filterProductIds = ids.slice(0, 500);
  const filters = await buildDynamicFilters(filterProductIds);
  await logSearch(query, total, userId, sessionId);

  return {
    products: sortedProducts,
    filters,
    meta: {
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      keyword: query,
      searchType: 'hybrid',
      searchEngine: 'redis_hybrid',
    },
  };
}

export async function smartSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  if (getSearchEngine() === 'redis_hybrid') {
    try {
      return await redisHybridSearch(query, options);
    } catch (error) {
      if (shouldFallbackToPostgres()) {
        return postgresSearch(query, options);
      }
      throw error;
    }
  }

  return postgresSearch(query, options);
}

// Get popular search keywords
export async function getPopularKeywords() {
  // 1. Get pinned keywords (admin-defined)
  const pinnedKeywords = await prisma.searchKeyword.findMany({
    where: { isActive: true, isPinned: true },
    orderBy: { order: 'asc' },
    select: {
      keyword: true,
      displayName: true,
      icon: true,
      type: true,
    },
  });

  // 2. Get trending keywords from search logs (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const trendingRaw = await prisma.searchLog.groupBy({
    by: ['keyword'],
    where: {
      createdAt: { gte: sevenDaysAgo },
      results: { gt: 0 }, // Only queries with results
    },
    _count: { keyword: true },
    orderBy: { _count: { keyword: 'desc' } },
    take: 10,
  });

  // Filter out pinned keywords from trending
  const pinnedSet = new Set(pinnedKeywords.map((k) => k.keyword.toLowerCase()));
  const trending = trendingRaw
    .filter((t) => !pinnedSet.has(t.keyword.toLowerCase()))
    .slice(0, 5)
    .map((t) => ({
      keyword: t.keyword,
      displayName: t.keyword,
      icon: null,
      type: 'TRENDING',
      count: t._count.keyword,
    }));

  return {
    pinned: pinnedKeywords,
    trending,
  };
}

// Search suggestions (autocomplete)
export async function getSearchSuggestions(query: string, limit = 5) {
  const normalizedQuery = normalizeQuery(query);
  
  if (normalizedQuery.length < 2) {
    return [];
  }

  if (getSearchEngine() === 'redis_hybrid') {
    const ready = await ensureProductIndex();
    const suggestions = ready
      ? await redisSearchSuggestions(normalizedQuery, limit)
      : { names: [] };
    const categories = await prisma.category.findMany({
      where: {
        name: { contains: normalizedQuery, mode: 'insensitive' },
      },
      select: { name: true },
      take: 3,
    });

    if (suggestions.names.length > 0) {
      return {
        products: suggestions.names,
        categories: categories.map((c) => c.name),
      };
    }
  }

  // Get product name suggestions
  const products = await prisma.product.findMany({
    where: {
      isVisible: true,
      name: { contains: normalizedQuery, mode: 'insensitive' },
    },
    select: { name: true },
    take: limit,
    distinct: ['name'],
  });

  // Get category suggestions
  const categories = await prisma.category.findMany({
    where: {
      name: { contains: normalizedQuery, mode: 'insensitive' },
    },
    select: { name: true },
    take: 3,
  });

  return {
    products: products.map((p) => p.name),
    categories: categories.map((c) => c.name),
  };
}

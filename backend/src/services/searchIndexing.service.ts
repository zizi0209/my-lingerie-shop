import { prisma } from '../lib/prisma';
import { ensureRedisReady, type RedisDiagnostics } from '../lib/redis';
import {
  ensureProductIndexDetailed,
  serializeEmbedding,
  upsertProductDoc,
  deleteProductDoc,
  getIndexStatus,
} from '../lib/redisSearch';
import { embedTexts } from './embeddingClient';

const LOCK_KEY = 'search:index:lock';
const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIM || 768);

export class SearchIndexingError extends Error {
  reasonCode?: string;
  diagnostics?: RedisDiagnostics;

  constructor(message: string, reasonCode?: string, diagnostics?: RedisDiagnostics) {
    super(message);
    this.name = 'SearchIndexingError';
    this.reasonCode = reasonCode;
    this.diagnostics = diagnostics;
  }
}

const buildIndexingError = (result: Awaited<ReturnType<typeof ensureProductIndexDetailed>>): SearchIndexingError => {
  const suffix = result.reasonCode ? ` (${result.reasonCode})` : '';
  const detail = result.reason ? `: ${result.reason}` : '';
  return new SearchIndexingError(`Không thể tạo Redis Search index${suffix}${detail}`, result.reasonCode, result.diagnostics);
};

type IndexProduct = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  salePrice: number | null;
  categoryId: number;
  isVisible: boolean;
  ratingAverage: number;
  reviewCount: number;
  createdAt: Date;
  category: { name: string; slug: string } | null;
  productColors: { color: { name: string } }[];
  variants: { size: string; color: { name: string } | null }[];
};

const productIndexSelect = {
  id: true,
  name: true,
  description: true,
  price: true,
  salePrice: true,
  categoryId: true,
  isVisible: true,
  ratingAverage: true,
  reviewCount: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  productColors: { select: { color: { select: { name: true } } } },
  variants: { select: { size: true, color: { select: { name: true } } } },
};

const buildEmbeddingText = (product: IndexProduct): string => {
  const colors = new Set<string>();
  const sizes = new Set<string>();

  product.productColors.forEach((entry) => {
    if (entry.color?.name) colors.add(entry.color.name);
  });

  product.variants.forEach((variant) => {
    if (variant.size) sizes.add(variant.size);
    if (variant.color?.name) colors.add(variant.color.name);
  });

  const categoryText = product.category?.name || '';
  const descriptionText = product.description || '';

  return [
    product.name,
    categoryText,
    descriptionText,
    Array.from(colors).join(' '),
    Array.from(sizes).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
};

const normalizeEmbedding = (embedding: number[]): number[] => {
  if (embedding.length === EMBEDDING_DIMENSION) {
    return embedding;
  }
  return Array.from({ length: EMBEDDING_DIMENSION }, () => 0);
};

const buildIndexPayload = (product: IndexProduct, embedding: number[]) => {
  const colors = new Set<string>();
  const sizes = new Set<string>();

  product.productColors.forEach((entry) => {
    if (entry.color?.name) colors.add(entry.color.name);
  });

  product.variants.forEach((variant) => {
    if (variant.size) sizes.add(variant.size);
    if (variant.color?.name) colors.add(variant.color.name);
  });

  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    categoryName: product.category?.name || '',
    categorySlug: product.category?.slug || '',
    colors: Array.from(colors).join(','),
    sizes: Array.from(sizes).join(','),
    synonyms: '',
    categoryId: product.categoryId,
    isVisible: product.isVisible ? 1 : 0,
    price: product.price,
    salePrice: product.salePrice ?? 0,
    effectivePrice: product.salePrice ?? product.price,
    ratingAverage: product.ratingAverage ?? 0,
    reviewCount: product.reviewCount ?? 0,
    createdAtTs: Math.floor(product.createdAt.getTime() / 1000),
    embedding: serializeEmbedding(normalizeEmbedding(embedding)),
  };
};

const acquireLock = async (): Promise<boolean> => {
  const redis = await ensureRedisReady();
  if (!redis) return false;

  try {
    const result = await redis.set(LOCK_KEY, Date.now().toString(), 'EX', 600, 'NX');
    return result === 'OK';
  } catch {
    return true;
  }
};

const releaseLock = async (): Promise<void> => {
  const redis = await ensureRedisReady();
  if (!redis) return;

  try {
    await redis.del(LOCK_KEY);
  } catch {
    return;
  }
};

export const indexProductById = async (productId: number): Promise<void> => {
  const result = await ensureProductIndexDetailed();
  if (!result.ok) {
    throw buildIndexingError(result);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: productIndexSelect,
  });

  if (!product) {
    await deleteProductDoc(productId);
    return;
  }

  const embeddingText = buildEmbeddingText(product as IndexProduct);
  const embeddings = await embedTexts([embeddingText || product.name]);
  const embedding = embeddings[0] || [];
  const payload = buildIndexPayload(product as IndexProduct, normalizeEmbedding(embedding));
  await upsertProductDoc(payload);
};

export const removeProductFromIndex = async (productId: number): Promise<void> => {
  await deleteProductDoc(productId);
};

export const reindexAllProducts = async (batchSize = 200): Promise<void> => {
  const result = await ensureProductIndexDetailed();
  if (!result.ok) {
    throw buildIndexingError(result);
  }

  const lockAcquired = await acquireLock();
  if (!lockAcquired) {
    throw new Error('Không thể lấy lock Redis cho reindex');
  }

  try {
    let lastId = 0;
    while (true) {
      const products = await prisma.product.findMany({
        where: { id: { gt: lastId } },
        orderBy: { id: 'asc' },
        take: batchSize,
        select: productIndexSelect,
      });

      if (products.length === 0) break;

      const texts = products.map((product) => buildEmbeddingText(product as IndexProduct) || product.name);
      const embeddings = await embedTexts(texts);

      await Promise.all(
        products.map(async (product, index) => {
          const embedding = embeddings[index] || [];
          const payload = buildIndexPayload(product as IndexProduct, normalizeEmbedding(embedding));
          await upsertProductDoc(payload);
        })
      );

      lastId = products[products.length - 1].id;
    }
  } finally {
    await releaseLock();
  }
};

export const getSearchIndexStatus = async () => getIndexStatus();

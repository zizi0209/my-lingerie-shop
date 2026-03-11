import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { ensureRedisReady, type RedisDiagnostics } from '../lib/redis';
import {
  ensureProductIndexDetailed,
  serializeEmbedding,
  upsertProductDoc,
  deleteProductDoc,
  getIndexStatus,
} from '../lib/redisSearch';
import {
  ensurePgvectorReady,
  deleteProductEmbedding,
  type PgvectorDiagnostics,
  upsertProductEmbedding,
} from '../lib/pgvectorSearch';
import { embedTextsDetailed } from './embeddingClient';

const LOCK_KEY = 'search:index:lock';
const PGVECTOR_LOCK_KEY = 987654321;
const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIM || 768);

type IndexDiagnostics = RedisDiagnostics | PgvectorDiagnostics;

export class SearchIndexingError extends Error {
  reasonCode?: string;
  diagnostics?: IndexDiagnostics;

  constructor(message: string, reasonCode?: string, diagnostics?: IndexDiagnostics) {
    super(message);
    this.name = 'SearchIndexingError';
    this.reasonCode = reasonCode;
    this.diagnostics = diagnostics;
  }
}

type IndexStatusResult =
  | Awaited<ReturnType<typeof ensureProductIndexDetailed>>
  | Awaited<ReturnType<typeof ensurePgvectorReady>>;

const buildIndexingError = (result: IndexStatusResult, label: string): SearchIndexingError => {
  const suffix = result.reasonCode ? ` (${result.reasonCode})` : '';
  const detail = result.reason ? `: ${result.reason}` : '';
  return new SearchIndexingError(`Không thể tạo ${label}${suffix}${detail}`, result.reasonCode, result.diagnostics);
};

const getSearchEngine = (): 'postgres' | 'redis_hybrid' | 'pgvector' => {
  if (process.env.SEARCH_ENGINE === 'redis_hybrid') return 'redis_hybrid';
  if (process.env.SEARCH_ENGINE === 'pgvector') return 'pgvector';
  return 'postgres';
};

type SearchWriteMode = 'single' | 'dual';

const getSearchWriteMode = (): SearchWriteMode => {
  const raw = process.env.SEARCH_WRITE_MODE;
  if (raw === 'single' || raw === 'dual') return raw;
  const engine = getSearchEngine();
  return engine === 'postgres' ? 'single' : 'dual';
};

export type IndexProduct = {
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
  updatedAt: Date;
  category: { name: string; slug: string } | null;
  productColors: { color: { name: string } }[];
  variants: { size: string; color: { name: string } | null }[];
};

export const productIndexSelect = {
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
  updatedAt: true,
  category: { select: { name: true, slug: true } },
  productColors: { select: { color: { select: { name: true } } } },
  variants: { select: { size: true, color: { select: { name: true } } } },
};

export const buildEmbeddingText = (product: IndexProduct): string => {
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

export const normalizeEmbedding = (embedding: number[]): number[] => {
  if (embedding.length === EMBEDDING_DIMENSION) {
    return embedding;
  }
  return Array.from({ length: EMBEDDING_DIMENSION }, () => 0);
};

export const buildIndexPayload = (product: IndexProduct, embedding: number[]) => {
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
    updatedAtTs: Math.floor(product.updatedAt.getTime() / 1000),
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

const acquirePgvectorLock = async (): Promise<boolean> => {
  try {
    const rows = await prisma.$queryRaw<{ locked: boolean }[]>(
      Prisma.sql`SELECT pg_try_advisory_lock(${PGVECTOR_LOCK_KEY}) AS "locked"`
    );
    return Boolean(rows[0]?.locked);
  } catch {
    return true;
  }
};

const releasePgvectorLock = async (): Promise<void> => {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT pg_advisory_unlock(${PGVECTOR_LOCK_KEY})`);
  } catch {
    return;
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
  const engine = getSearchEngine();
  const writeMode = getSearchWriteMode();
  if (engine === 'postgres') return;

  const errors: SearchIndexingError[] = [];
  const enableRedis = engine === 'redis_hybrid' || writeMode === 'dual';
  const enablePgvector = engine === 'pgvector' || writeMode === 'dual';
  let redisReady = !enableRedis;
  let pgvectorReady = !enablePgvector;

  if (enableRedis) {
    const result = await ensureProductIndexDetailed();
    redisReady = result.ok;
    if (!result.ok) {
      errors.push(buildIndexingError(result, 'Redis Search index'));
    }
  }

  if (enablePgvector) {
    const result = await ensurePgvectorReady();
    pgvectorReady = result.ok;
    if (!result.ok) {
      errors.push(buildIndexingError(result, 'PGVector index'));
    }
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: productIndexSelect,
  });

  if (!product) {
    await removeProductFromIndex(productId);
    return;
  }

  const embeddingText = buildEmbeddingText(product as IndexProduct);
  const { embeddings, status } = await embedTextsDetailed([embeddingText || product.name]);
  const embedding = embeddings[0] || [];

  if (status !== 'ok' || embedding.length === 0) {
    throw new SearchIndexingError('Không thể tạo embedding cho sản phẩm', `embedding_${status}`);
  }

  const normalizedEmbedding = normalizeEmbedding(embedding);

  if (errors.length > 0 && errors.length === (Number(enableRedis) + Number(enablePgvector))) {
    throw errors[0];
  }

  if (enableRedis && redisReady) {
    const payload = buildIndexPayload(product as IndexProduct, normalizedEmbedding);
    await upsertProductDoc(payload);
  }

  if (enablePgvector && pgvectorReady) {
    await upsertProductEmbedding(product.id, normalizedEmbedding);
  }

  if (errors.length > 0) {
    const combined = errors.map((error) => error.message).join('; ');
    throw new SearchIndexingError(`Dual-write lỗi một phần: ${combined}`, 'index_write_partial_failure');
  }
};

export const removeProductFromIndex = async (productId: number): Promise<void> => {
  const engine = getSearchEngine();
  const writeMode = getSearchWriteMode();
  const enableRedis = engine === 'redis_hybrid' || writeMode === 'dual';
  const enablePgvector = engine === 'pgvector' || writeMode === 'dual';

  await Promise.all([
    enableRedis ? deleteProductDoc(productId) : Promise.resolve(),
    enablePgvector ? deleteProductEmbedding(productId) : Promise.resolve(),
  ]);
};

export const reindexAllProducts = async (batchSize = 200): Promise<void> => {
  const engine = getSearchEngine();
  const writeMode = getSearchWriteMode();
  if (engine === 'postgres') return;

  const enableRedis = engine === 'redis_hybrid' || writeMode === 'dual';
  const enablePgvector = engine === 'pgvector' || writeMode === 'dual';
  const errors: SearchIndexingError[] = [];
  let redisReady = !enableRedis;
  let pgvectorReady = !enablePgvector;

  if (enableRedis) {
    const result = await ensureProductIndexDetailed();
    redisReady = result.ok;
    if (!result.ok) {
      errors.push(buildIndexingError(result, 'Redis Search index'));
    }
  }

  if (enablePgvector) {
    const result = await ensurePgvectorReady();
    pgvectorReady = result.ok;
    if (!result.ok) {
      errors.push(buildIndexingError(result, 'PGVector index'));
    }
  }

  if (errors.length > 0 && errors.length === (Number(enableRedis) + Number(enablePgvector))) {
    throw errors[0];
  }

  const lockAcquired = await (async () => {
    if (enableRedis && enablePgvector && redisReady && pgvectorReady) {
      const redisLock = await acquireLock();
      const pgLock = await acquirePgvectorLock();
      if (!redisLock || !pgLock) {
        if (redisLock) await releaseLock();
        if (pgLock) await releasePgvectorLock();
        return false;
      }
      return true;
    }
    if (enableRedis && redisReady) return acquireLock();
    if (enablePgvector && pgvectorReady) return acquirePgvectorLock();
    return false;
  })();

  if (!lockAcquired) {
    throw new Error('Không thể lấy lock cho reindex');
  }

  let skipped = 0;

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
      const { embeddings, status, reason } = await embedTextsDetailed(texts);

      if (status !== 'ok') {
        skipped += products.length;
        const reasonText = reason ? ` reason=${reason}` : '';
        console.warn(`[SearchIndex] Embedding unavailable: ${status}.${reasonText} Skip ${products.length} items.`);
        lastId = products[products.length - 1].id;
        continue;
      }

      await Promise.all(
        products.map(async (product, index) => {
          const embedding = embeddings[index] || [];
          if (embedding.length === 0) {
            skipped += 1;
            return;
          }
          const normalizedEmbedding = normalizeEmbedding(embedding);
          if (enableRedis && redisReady) {
            const payload = buildIndexPayload(product as IndexProduct, normalizedEmbedding);
            await upsertProductDoc(payload);
          }
          if (enablePgvector && pgvectorReady) {
            await upsertProductEmbedding(product.id, normalizedEmbedding);
          }
        })
      );

      lastId = products[products.length - 1].id;
    }
    if (skipped > 0) {
      console.warn(`[SearchIndex] Reindex skipped ${skipped} items do embedding unavailable.`);
    }
  } finally {
    if (enableRedis && redisReady) {
      await releaseLock();
    }
    if (enablePgvector && pgvectorReady) {
      await releasePgvectorLock();
    }
  }

  if (errors.length > 0) {
    const combined = errors.map((error) => error.message).join('; ');
    throw new SearchIndexingError(`Dual-write lỗi một phần: ${combined}`, 'index_write_partial_failure');
  }
};

export const getSearchIndexStatus = async () => {
  const engine = getSearchEngine();
  if (engine === 'redis_hybrid') return getIndexStatus();
  if (engine === 'pgvector') return ensurePgvectorReady();
  return { ok: true };
};

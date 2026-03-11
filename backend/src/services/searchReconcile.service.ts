import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  deleteProductDoc,
  ensureProductIndexDetailed,
  fetchIndexMetaPage,
  upsertProductDoc,
} from '../lib/redisSearch';
import {
  deleteProductEmbedding,
  ensurePgvectorReady,
  upsertProductEmbedding,
} from '../lib/pgvectorSearch';
import { embedTextsDetailed } from './embeddingClient';
import {
  SearchIndexingError,
  buildEmbeddingText,
  buildIndexPayload,
  normalizeEmbedding,
  productIndexSelect,
  type IndexProduct,
} from './searchIndexing.service';

type SearchEngine = 'postgres' | 'redis_hybrid' | 'pgvector';
type SearchWriteMode = 'single' | 'dual';

export type SearchReconcileReport = {
  engine: SearchEngine;
  writeMode: SearchWriteMode;
  scanned: number;
  healed: number;
  failed: number;
  driftRate: number;
  missingRedis: number;
  missingPgvector: number;
  staleRedis: number;
  stalePgvector: number;
  deletedRedis: number;
  deletedPgvector: number;
};

const getSearchEngine = (): SearchEngine => {
  if (process.env.SEARCH_ENGINE === 'redis_hybrid') return 'redis_hybrid';
  if (process.env.SEARCH_ENGINE === 'pgvector') return 'pgvector';
  return 'postgres';
};

const getSearchWriteMode = (): SearchWriteMode => {
  const raw = process.env.SEARCH_WRITE_MODE;
  if (raw === 'single' || raw === 'dual') return raw;
  const engine = getSearchEngine();
  return engine === 'postgres' ? 'single' : 'dual';
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const buildIndexingError = (label: string, reasonCode?: string, reason?: string) => {
  const suffix = reasonCode ? ` (${reasonCode})` : '';
  const detail = reason ? `: ${reason}` : '';
  return new SearchIndexingError(`Không thể tạo ${label}${suffix}${detail}`, reasonCode);
};

export const reconcileSearchIndex = async (
  batchSize = 200,
  options: { dryRun?: boolean } = {}
): Promise<SearchReconcileReport> => {
  const engine = getSearchEngine();
  const writeMode = getSearchWriteMode();
  const enableRedis = engine === 'redis_hybrid' || writeMode === 'dual';
  const enablePgvector = engine === 'pgvector' || writeMode === 'dual';
  const dryRun = options.dryRun === true;

  if (!enableRedis && !enablePgvector) {
    return {
      engine,
      writeMode,
      scanned: 0,
      healed: 0,
      failed: 0,
      driftRate: 0,
      missingRedis: 0,
      missingPgvector: 0,
      staleRedis: 0,
      stalePgvector: 0,
      deletedRedis: 0,
      deletedPgvector: 0,
    };
  }

  let redisReady = !enableRedis;
  let pgvectorReady = !enablePgvector;
  const readinessErrors: SearchIndexingError[] = [];

  if (enableRedis) {
    const result = await ensureProductIndexDetailed();
    redisReady = result.ok;
    if (!result.ok) {
      readinessErrors.push(buildIndexingError('Redis Search index', result.reasonCode, result.reason));
    }
  }

  if (enablePgvector) {
    const result = await ensurePgvectorReady();
    pgvectorReady = result.ok;
    if (!result.ok) {
      readinessErrors.push(buildIndexingError('PGVector index', result.reasonCode, result.reason));
    }
  }

  if (readinessErrors.length > 0 && readinessErrors.length === Number(enableRedis) + Number(enablePgvector)) {
    throw readinessErrors[0];
  }

  const redisMeta = new Map<number, number>();
  if (enableRedis && redisReady) {
    let offset = 0;
    const limit = Math.max(100, batchSize * 2);
    let total = 0;

    do {
      const page = await fetchIndexMetaPage(offset, limit);
      total = page.total;
      page.items.forEach((item) => redisMeta.set(item.id, item.updatedAtTs));
      offset += limit;
    } while (offset < total);
  }

  const pgvectorMeta = new Map<number, Date>();
  if (enablePgvector && pgvectorReady) {
    let lastId = 0;
    while (true) {
      const rows = await prisma.$queryRaw<{ productId: number; updatedAt: Date }[]>(
        Prisma.sql`
          SELECT "productId", "updatedAt"
          FROM "ProductEmbedding"
          WHERE "productId" > ${lastId}
          ORDER BY "productId" ASC
          LIMIT ${batchSize}
        `
      );
      if (rows.length === 0) break;
      rows.forEach((row) => pgvectorMeta.set(row.productId, row.updatedAt));
      lastId = rows[rows.length - 1].productId;
    }
  }

  const productIds = new Set<number>();
  const pendingReindex = new Map<number, { product: IndexProduct; needsRedis: boolean; needsPgvector: boolean }>();
  let scanned = 0;
  let missingRedis = 0;
  let missingPgvector = 0;
  let staleRedis = 0;
  let stalePgvector = 0;

  let lastId = 0;
  while (true) {
    const products = await prisma.product.findMany({
      where: { id: { gt: lastId } },
      orderBy: { id: 'asc' },
      take: batchSize,
      select: productIndexSelect,
    });

    if (products.length === 0) break;

    products.forEach((product) => {
      const typedProduct = product as IndexProduct;
      productIds.add(typedProduct.id);
      scanned += 1;

      const updatedAtTs = Math.floor(typedProduct.updatedAt.getTime() / 1000);
      const needsRedis = enableRedis && redisReady
        ? (() => {
            const redisUpdatedAt = redisMeta.get(typedProduct.id);
            if (redisUpdatedAt === undefined) {
              missingRedis += 1;
              return true;
            }
            if (redisUpdatedAt < updatedAtTs) {
              staleRedis += 1;
              return true;
            }
            return false;
          })()
        : false;

      const needsPgvector = enablePgvector && pgvectorReady
        ? (() => {
            const pgUpdatedAt = pgvectorMeta.get(typedProduct.id);
            if (!pgUpdatedAt) {
              missingPgvector += 1;
              return true;
            }
            if (pgUpdatedAt.getTime() < typedProduct.updatedAt.getTime()) {
              stalePgvector += 1;
              return true;
            }
            return false;
          })()
        : false;

      if (needsRedis || needsPgvector) {
        pendingReindex.set(typedProduct.id, {
          product: typedProduct,
          needsRedis,
          needsPgvector,
        });
      }
    });

    lastId = products[products.length - 1].id;
  }

  const extraRedisIds = enableRedis && redisReady
    ? Array.from(redisMeta.keys()).filter((id) => !productIds.has(id))
    : [];
  const extraPgvectorIds = enablePgvector && pgvectorReady
    ? Array.from(pgvectorMeta.keys()).filter((id) => !productIds.has(id))
    : [];

  let deletedRedis = 0;
  let deletedPgvector = 0;
  let failed = 0;
  let healed = 0;

  if (dryRun) {
    deletedRedis = extraRedisIds.length;
    deletedPgvector = extraPgvectorIds.length;
  } else {
    for (const chunk of chunkArray(extraRedisIds, batchSize)) {
      await Promise.all(
        chunk.map(async (id) => {
          try {
            await deleteProductDoc(id);
            deletedRedis += 1;
          } catch {
            failed += 1;
          }
        })
      );
    }

    for (const chunk of chunkArray(extraPgvectorIds, batchSize)) {
      await Promise.all(
        chunk.map(async (id) => {
          try {
            await deleteProductEmbedding(id);
            deletedPgvector += 1;
          } catch {
            failed += 1;
          }
        })
      );
    }
  }

  const reindexItems = Array.from(pendingReindex.values());
  if (dryRun) {
    healed = reindexItems.length;
  } else {
    for (const chunk of chunkArray(reindexItems, batchSize)) {
      const texts = chunk.map((item) => buildEmbeddingText(item.product) || item.product.name);
      const { embeddings, status } = await embedTextsDetailed(texts);

      if (status !== 'ok') {
        failed += chunk.length;
        continue;
      }

      await Promise.all(
        chunk.map(async (item, index) => {
          const embedding = embeddings[index] || [];
          if (embedding.length === 0) {
            failed += 1;
            return;
          }

          const normalizedEmbedding = normalizeEmbedding(embedding);

          try {
            if (item.needsRedis && enableRedis && redisReady) {
              const payload = buildIndexPayload(item.product, normalizedEmbedding);
              await upsertProductDoc(payload);
            }
            if (item.needsPgvector && enablePgvector && pgvectorReady) {
              await upsertProductEmbedding(item.product.id, normalizedEmbedding);
            }
            healed += 1;
          } catch {
            failed += 1;
          }
        })
      );
    }
  }

  const driftTotal = missingRedis + missingPgvector + staleRedis + stalePgvector + deletedRedis + deletedPgvector;
  const driftRate = scanned > 0 ? driftTotal / scanned : 0;

  if (readinessErrors.length > 0) {
    const combined = readinessErrors.map((error) => error.message).join('; ');
    throw new SearchIndexingError(`Dual-write lỗi một phần: ${combined}`, 'index_write_partial_failure');
  }

  return {
    engine,
    writeMode,
    scanned,
    healed,
    failed,
    driftRate,
    missingRedis,
    missingPgvector,
    staleRedis,
    stalePgvector,
    deletedRedis,
    deletedPgvector,
  };
};

import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

export type PgvectorDiagnostics = {
  hasExtension: boolean;
  hasTable: boolean;
};

export type PgvectorStatus = {
  ok: boolean;
  reasonCode?: string;
  reason?: string;
  diagnostics?: PgvectorDiagnostics;
};

type PgvectorFilters = {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  isVisible?: boolean;
};

type PgvectorSearchResult = {
  total: number;
  ids: number[];
};

const toVectorLiteral = (embedding: number[]): string => {
  const safeValues = embedding.map((value) => (Number.isFinite(value) ? value : 0));
  return `[${safeValues.join(',')}]`;
};

const buildWhereClause = (filters: PgvectorFilters): Prisma.Sql => {
  const conditions: Prisma.Sql[] = [];

  if (filters.isVisible !== undefined) {
    conditions.push(Prisma.sql`p."isVisible" = ${filters.isVisible}`);
  }

  if (filters.categoryId) {
    conditions.push(Prisma.sql`p."categoryId" = ${filters.categoryId}`);
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceExpr = Prisma.sql`COALESCE(p."salePrice", p."price")`;
    if (filters.minPrice !== undefined) {
      conditions.push(Prisma.sql`${priceExpr} >= ${filters.minPrice}`);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(Prisma.sql`${priceExpr} <= ${filters.maxPrice}`);
    }
  }

  if (filters.colors && filters.colors.length > 0) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "ProductVariant" v
        JOIN "Color" c ON c."id" = v."colorId"
        WHERE v."productId" = p."id" AND c."name" IN (${Prisma.join(filters.colors)})
      )`
    );
  }

  if (filters.sizes && filters.sizes.length > 0) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1
        FROM "ProductVariant" v
        WHERE v."productId" = p."id" AND v."size" IN (${Prisma.join(filters.sizes)})
      )`
    );
  }

  if (conditions.length === 0) {
    return Prisma.sql``;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
};

export const ensurePgvectorReady = async (): Promise<PgvectorStatus> => {
  try {
    const extensionRows = await prisma.$queryRaw<{ exists: boolean }[]>(
      Prisma.sql`SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector') AS "exists"`
    );
    const tableRows = await prisma.$queryRaw<{ tableName: string | null }[]>(
      Prisma.sql`SELECT to_regclass('"ProductEmbedding"')::text AS "tableName"`
    );

    const hasExtension = Boolean(extensionRows[0]?.exists);
    const hasTable = Boolean(tableRows[0]?.tableName);

    if (!hasExtension || !hasTable) {
      const reasonCode = !hasExtension ? 'pgvector_extension_missing' : 'pgvector_table_missing';
      return {
        ok: false,
        reasonCode,
        reason: !hasExtension
          ? 'Thiếu extension pgvector trong PostgreSQL'
          : 'Thiếu bảng ProductEmbedding trong PostgreSQL',
        diagnostics: { hasExtension, hasTable },
      };
    }

    return { ok: true, diagnostics: { hasExtension, hasTable } };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Lỗi không xác định';
    return {
      ok: false,
      reasonCode: 'pgvector_unavailable',
      reason,
    };
  }
};

export const upsertProductEmbedding = async (productId: number, embedding: number[]): Promise<void> => {
  const vectorLiteral = toVectorLiteral(embedding);
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "ProductEmbedding" ("productId", "embedding", "createdAt", "updatedAt")
      VALUES (${productId}, ${vectorLiteral}::vector, NOW(), NOW())
      ON CONFLICT ("productId")
      DO UPDATE SET "embedding" = EXCLUDED."embedding", "updatedAt" = NOW()
    `
  );
};

export const deleteProductEmbedding = async (productId: number): Promise<void> => {
  await prisma.$executeRaw(
    Prisma.sql`DELETE FROM "ProductEmbedding" WHERE "productId" = ${productId}`
  );
};

export const searchPgvector = async (
  embedding: number[],
  filters: PgvectorFilters,
  limit: number,
  offset: number
): Promise<PgvectorSearchResult> => {
  const vectorLiteral = toVectorLiteral(embedding);
  const whereClause = buildWhereClause(filters);

  const rows = await prisma.$queryRaw<{ id: number }[]>(
    Prisma.sql`
      SELECT p."id"
      FROM "Product" p
      JOIN "ProductEmbedding" pe ON pe."productId" = p."id"
      ${whereClause}
      ORDER BY pe."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${limit} OFFSET ${offset}
    `
  );

  const countRows = await prisma.$queryRaw<{ total: number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::int AS "total"
      FROM "Product" p
      JOIN "ProductEmbedding" pe ON pe."productId" = p."id"
      ${whereClause}
    `
  );

  return {
    total: countRows[0]?.total ?? 0,
    ids: rows.map((row) => row.id),
  };
};

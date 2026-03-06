import { getRedisClient } from './redis';

const DEFAULT_INDEX = 'idx:products';
const DEFAULT_PREFIX = 'product:';
const DEFAULT_DIMENSION = 768;

const getIndexName = () => process.env.REDIS_SEARCH_INDEX || DEFAULT_INDEX;
const getEmbeddingDimension = () => {
  const raw = Number(process.env.EMBEDDING_DIM || DEFAULT_DIMENSION);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DIMENSION;
};

const escapeText = (value: string) =>
  value.replace(/[[\]{}()|"'~*:?\\-]/g, '\\$&');

const normalizeTag = (value: string) => value.replace(/\s+/g, ' ').trim();

export interface RedisSearchFilters {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  isVisible?: boolean;
}

export interface RedisSearchResult {
  total: number;
  ids: number[];
  scores: Map<number, number>;
}

export interface RedisSearchSuggestionResult {
  names: string[];
}

export interface RedisSearchIndexStatus {
  indexName: string;
  numDocs: number;
  status: string;
}

const parseRedisArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

const parseNumber = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildFilterQuery = (filters: RedisSearchFilters): string => {
  const tokens: string[] = [];

  if (filters.isVisible !== undefined) {
    tokens.push(`@isVisible:[${filters.isVisible ? 1 : 0} ${filters.isVisible ? 1 : 0}]`);
  }

  if (filters.categoryId !== undefined) {
    tokens.push(`@categoryId:[${filters.categoryId} ${filters.categoryId}]`);
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice ?? '-inf';
    const max = filters.maxPrice ?? '+inf';
    tokens.push(`@effectivePrice:[${min} ${max}]`);
  }

  if (filters.colors && filters.colors.length > 0) {
    const colors = filters.colors.map((color) => escapeText(normalizeTag(color)));
    tokens.push(`@colors:{${colors.join('|')}}`);
  }

  if (filters.sizes && filters.sizes.length > 0) {
    const sizes = filters.sizes.map((size) => escapeText(normalizeTag(size)));
    tokens.push(`@sizes:{${sizes.join('|')}}`);
  }

  return tokens.length > 0 ? tokens.join(' ') : '';
};

const parseSearchResponse = (response: unknown): RedisSearchResult => {
  if (!Array.isArray(response) || response.length === 0) {
    return { total: 0, ids: [], scores: new Map() };
  }

  const total = parseNumber(String(response[0]));
  const ids: number[] = [];
  const scores = new Map<number, number>();

  for (let index = 1; index < response.length; index += 3) {
    const key = String(response[index]);
    const scoreRaw = response[index + 1];
    const fields = response[index + 2];
    const score = parseNumber(String(scoreRaw));
    const idFieldIndex = Array.isArray(fields) ? fields.findIndex((value) => value === 'id') : -1;
    const idValue = idFieldIndex >= 0 ? String((fields as unknown[])[idFieldIndex + 1]) : '';
    const id = parseNumber(idValue || key.replace(DEFAULT_PREFIX, ''));

    if (id > 0) {
      ids.push(id);
      scores.set(id, score);
    }
  }

  return { total, ids, scores };
};

const parseSuggestionResponse = (response: unknown): RedisSearchSuggestionResult => {
  if (!Array.isArray(response) || response.length === 0) {
    return { names: [] };
  }

  const names: string[] = [];
  for (let index = 1; index < response.length; index += 2) {
    const fields = response[index + 1];
    if (Array.isArray(fields)) {
      const nameIndex = fields.findIndex((value) => value === 'name');
      if (nameIndex >= 0) {
        const nameValue = String(fields[nameIndex + 1] || '').trim();
        if (nameValue) {
          names.push(nameValue);
        }
      }
    }
  }

  return { names };
};

export const ensureProductIndex = async (): Promise<boolean> => {
  const redis = getRedisClient();
  if (!redis) return false;

  const indexName = getIndexName();

  try {
    const list = await redis.call('FT._LIST');
    const existing = parseRedisArray(list);
    if (existing.includes(indexName)) {
      return true;
    }

    const dimension = getEmbeddingDimension();

    await redis.call(
      'FT.CREATE',
      indexName,
      'ON',
      'HASH',
      'PREFIX',
      '1',
      DEFAULT_PREFIX,
      'SCHEMA',
      'id',
      'NUMERIC',
      'SORTABLE',
      'name',
      'TEXT',
      'description',
      'TEXT',
      'categoryName',
      'TEXT',
      'categorySlug',
      'TEXT',
      'colors',
      'TAG',
      'SEPARATOR',
      ',',
      'sizes',
      'TAG',
      'SEPARATOR',
      ',',
      'synonyms',
      'TAG',
      'SEPARATOR',
      ',',
      'categoryId',
      'NUMERIC',
      'SORTABLE',
      'isVisible',
      'NUMERIC',
      'price',
      'NUMERIC',
      'salePrice',
      'NUMERIC',
      'effectivePrice',
      'NUMERIC',
      'SORTABLE',
      'ratingAverage',
      'NUMERIC',
      'SORTABLE',
      'reviewCount',
      'NUMERIC',
      'SORTABLE',
      'createdAtTs',
      'NUMERIC',
      'SORTABLE',
      'embedding',
      'VECTOR',
      'HNSW',
      '6',
      'TYPE',
      'FLOAT32',
      'DIM',
      dimension.toString(),
      'DISTANCE_METRIC',
      'COSINE'
    );

    return true;
  } catch (error) {
    console.warn('[RedisSearch] Ensure index failed:', error);
    return false;
  }
};

export const serializeEmbedding = (embedding: number[]): Buffer => {
  const vector = new Float32Array(embedding);
  return Buffer.from(vector.buffer);
};

export const upsertProductDoc = async (payload: Record<string, string | number | Buffer>): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) return;
  const idValue = typeof payload.id === 'number' || typeof payload.id === 'string'
    ? payload.id
    : null;
  if (!idValue) return;

  const key = `${DEFAULT_PREFIX}${String(idValue)}`;

  try {
    await redis.hset(key, payload);
  } catch (error) {
    console.warn('[RedisSearch] Upsert failed:', error);
  }
};

export const deleteProductDoc = async (productId: number): Promise<void> => {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`${DEFAULT_PREFIX}${productId}`);
  } catch (error) {
    console.warn('[RedisSearch] Delete failed:', error);
  }
};

export const searchHybrid = async (
  terms: string[],
  embedding: number[],
  filters: RedisSearchFilters,
  limit: number,
  knnCandidates: number
): Promise<RedisSearchResult> => {
  const redis = getRedisClient();
  if (!redis) return { total: 0, ids: [], scores: new Map() };

  const indexName = getIndexName();
  const filterQuery = buildFilterQuery(filters);

  const textQuery = terms.length > 0
    ? `@name|description|categoryName|categorySlug|colors|sizes|synonyms:(${terms
        .map((term) => `${escapeText(term)}*`)
        .join('|')})`
    : '*';

  const baseQuery = [textQuery, filterQuery].filter(Boolean).join(' ');
  const vectorQuery = ['*', filterQuery].filter(Boolean).join(' ');
  const candidateLimit = Math.max(knnCandidates, limit * 3);

  try {
    const [textResponse, vectorResponse] = await Promise.all([
      redis.call(
        'FT.SEARCH',
        indexName,
        baseQuery || '*',
        'WITHSCORES',
        'RETURN',
        '1',
        'id',
        'LIMIT',
        '0',
        candidateLimit.toString(),
        'DIALECT',
        '2'
      ),
      redis.call(
        'FT.SEARCH',
        indexName,
        `${vectorQuery || '*'}=>[KNN ${candidateLimit} @embedding $vector AS vector_score]`,
        'PARAMS',
        '2',
        'vector',
        serializeEmbedding(embedding),
        'SORTBY',
        'vector_score',
        'ASC',
        'RETURN',
        '2',
        'id',
        'vector_score',
        'LIMIT',
        '0',
        candidateLimit.toString(),
        'DIALECT',
        '2'
      ),
    ]);

    const textParsed = parseSearchResponse(textResponse);
    const vectorParsed = parseSearchResponse(vectorResponse);

    const hybridScores = new Map<number, number>();
    const textRanks = new Map<number, number>();
    const vectorRanks = new Map<number, number>();

    textParsed.ids.forEach((id, index) => textRanks.set(id, index + 1));
    vectorParsed.ids.forEach((id, index) => vectorRanks.set(id, index + 1));

    const k = 60;
    const textWeight = Number(process.env.HYBRID_TEXT_WEIGHT || 0.6);
    const vectorWeight = Number(process.env.HYBRID_VECTOR_WEIGHT || 0.4);

    const ids = new Set<number>([...textParsed.ids, ...vectorParsed.ids]);

    ids.forEach((id) => {
      const textRank = textRanks.get(id);
      const vectorRank = vectorRanks.get(id);
      const textScore = textRank ? textWeight / (k + textRank) : 0;
      const vectorScore = vectorRank ? vectorWeight / (k + vectorRank) : 0;
      hybridScores.set(id, textScore + vectorScore);
    });

    const sortedIds = Array.from(hybridScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    return {
      total: Math.max(textParsed.total, vectorParsed.total),
      ids: sortedIds,
      scores: hybridScores,
    };
  } catch (error) {
    console.warn('[RedisSearch] Hybrid search failed:', error);
    return { total: 0, ids: [], scores: new Map() };
  }
};

export const searchSuggestions = async (
  prefix: string,
  limit: number
): Promise<RedisSearchSuggestionResult> => {
  const redis = getRedisClient();
  if (!redis) return { names: [] };

  const indexName = getIndexName();
  const safePrefix = escapeText(prefix);
  const query = `@name:${safePrefix}*`;

  try {
    const response = await redis.call(
      'FT.SEARCH',
      indexName,
      query,
      'RETURN',
      '1',
      'name',
      'LIMIT',
      '0',
      limit.toString(),
      'DIALECT',
      '2'
    );

    return parseSuggestionResponse(response);
  } catch (error) {
    console.warn('[RedisSearch] Suggestion failed:', error);
    return { names: [] };
  }
};

export const getIndexStatus = async (): Promise<RedisSearchIndexStatus> => {
  const redis = getRedisClient();
  if (!redis) {
    return { indexName: getIndexName(), numDocs: 0, status: 'redis_unavailable' };
  }

  try {
    const info = await redis.call('FT.INFO', getIndexName());
    const infoArray = Array.isArray(info) ? info : [];
    const numDocsIndex = infoArray.findIndex((value) => value === 'num_docs');
    const numDocsValue = numDocsIndex >= 0 ? String(infoArray[numDocsIndex + 1]) : '0';
    return {
      indexName: getIndexName(),
      numDocs: parseNumber(numDocsValue),
      status: 'ok',
    };
  } catch {
    return { indexName: getIndexName(), numDocs: 0, status: 'missing' };
  }
};

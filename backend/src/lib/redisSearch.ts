import { ensureRedisReady, getRedisDiagnostics } from './redis';

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
  reason?: string;
  reasonCode?: string;
  moduleAvailable?: boolean;
  diagnostics?: ReturnType<typeof getRedisDiagnostics>;
}

export type RedisIndexMetaItem = {
  id: number;
  updatedAtTs: number;
};

export type RedisIndexMetaPage = {
  total: number;
  items: RedisIndexMetaItem[];
};

type RedisSearchReasonCode =
  | 'redis_unavailable'
  | 'redisearch_module_unavailable'
  | 'index_missing'
  | 'index_create_failed'
  | 'redis_command_failed';

export class RedisSearchError extends Error {
  reasonCode: RedisSearchReasonCode;

  constructor(message: string, reasonCode: RedisSearchReasonCode) {
    super(message);
    this.name = 'RedisSearchError';
    this.reasonCode = reasonCode;
  }
}

const parseRedisArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : [];

const parseNumber = (value: string | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseEnvNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const parseMetaResponse = (response: unknown): RedisIndexMetaPage => {
  if (!Array.isArray(response) || response.length === 0) {
    return { total: 0, items: [] };
  }

  const total = parseNumber(String(response[0]));
  const items: RedisIndexMetaItem[] = [];

  for (let index = 1; index < response.length; index += 2) {
    const key = String(response[index]);
    const fields = response[index + 1];
    const fieldList = Array.isArray(fields) ? fields : [];
    const idIndex = fieldList.findIndex((value) => value === 'id');
    const updatedAtIndex = fieldList.findIndex((value) => value === 'updatedAtTs');
    const idValue = idIndex >= 0 ? String(fieldList[idIndex + 1] || '') : '';
    const updatedAtValue = updatedAtIndex >= 0 ? String(fieldList[updatedAtIndex + 1] || '') : '';
    const id = parseNumber(idValue || key.replace(DEFAULT_PREFIX, ''));

    if (id > 0) {
      items.push({ id, updatedAtTs: parseNumber(updatedAtValue) });
    }
  }

  return { total, items };
};

const classifyRedisError = (error: unknown): RedisSearchReasonCode => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('unknown command') || message.includes('not supported')) {
    return 'redisearch_module_unavailable';
  }
  if (message.includes('econn') || message.includes('socket') || message.includes('connect')) {
    return 'redis_unavailable';
  }
  return 'redis_command_failed';
};

const buildDiagnostics = () => getRedisDiagnostics();

const formatRedisUnavailableReason = (diagnostics: ReturnType<typeof getRedisDiagnostics>): string => {
  const endpoint = diagnostics.host && diagnostics.port
    ? `${diagnostics.host}:${diagnostics.port}`
    : diagnostics.host || 'unknown';
  const statusPart = diagnostics.status ? `; status=${diagnostics.status}` : '';
  const errorPart = diagnostics.lastError ? `; lastError=${diagnostics.lastError}` : '';
  const hintPart = diagnostics.runtimeHint ? `; hint=${diagnostics.runtimeHint}` : '';
  return `Redis không khả dụng tại ${endpoint}${statusPart}${errorPart}${hintPart}`;
};

export const ensureProductIndexDetailed = async (): Promise<{
  ok: boolean;
  reasonCode?: RedisSearchReasonCode;
  reason?: string;
  diagnostics?: ReturnType<typeof getRedisDiagnostics>;
}> => {
  const redis = await ensureRedisReady();
  if (!redis) {
    const diagnostics = buildDiagnostics();
    return {
      ok: false,
      reasonCode: 'redis_unavailable',
      reason: formatRedisUnavailableReason(diagnostics),
      diagnostics,
    };
  }

  const indexName = getIndexName();

  try {
    const list = await redis.call('FT._LIST');
    const existing = parseRedisArray(list);
    if (existing.includes(indexName)) {
      return { ok: true };
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
      'updatedAtTs',
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

    return { ok: true };
  } catch (error) {
    const reasonCode = classifyRedisError(error);
    const reason = error instanceof Error ? error.message : 'Không thể tạo index';
    return {
      ok: false,
      reasonCode: reasonCode === 'redis_command_failed' ? 'index_create_failed' : reasonCode,
      reason,
    };
  }
};

export const ensureProductIndex = async (): Promise<boolean> => {
  const result = await ensureProductIndexDetailed();
  if (!result.ok) {
    console.warn('[RedisSearch] Ensure index failed:', result.reason);
  }
  return result.ok;
};

export const serializeEmbedding = (embedding: number[]): Buffer => {
  const vector = new Float32Array(embedding);
  return Buffer.from(vector.buffer);
};

export const upsertProductDoc = async (payload: Record<string, string | number | Buffer>): Promise<void> => {
  const redis = await ensureRedisReady();
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
  const redis = await ensureRedisReady();
  if (!redis) return;

  try {
    await redis.del(`${DEFAULT_PREFIX}${productId}`);
  } catch (error) {
    console.warn('[RedisSearch] Delete failed:', error);
  }
};

const getHybridWeights = (): { textWeight: number; vectorWeight: number } => {
  const defaultText = 0.6;
  const defaultVector = 0.4;
  const rawText = parseEnvNumber(process.env.HYBRID_TEXT_WEIGHT, defaultText);
  const rawVector = parseEnvNumber(process.env.HYBRID_VECTOR_WEIGHT, defaultVector);
  const textWeight = rawText >= 0 ? rawText : defaultText;
  const vectorWeight = rawVector >= 0 ? rawVector : defaultVector;
  const total = textWeight + vectorWeight;

  if (!Number.isFinite(total) || total <= 0) {
    return { textWeight: defaultText, vectorWeight: defaultVector };
  }

  return { textWeight, vectorWeight };
};

export const fetchIndexMetaPage = async (offset: number, limit: number): Promise<RedisIndexMetaPage> => {
  const redis = await ensureRedisReady();
  if (!redis) {
    throw new RedisSearchError('Redis không khả dụng để scan index', 'redis_unavailable');
  }

  const indexName = getIndexName();
  const safeOffset = Math.max(0, Math.floor(offset));
  const safeLimit = Math.max(1, Math.floor(limit));

  try {
    const response = await redis.call(
      'FT.SEARCH',
      indexName,
      '*',
      'RETURN',
      '2',
      'id',
      'updatedAtTs',
      'LIMIT',
      safeOffset.toString(),
      safeLimit.toString(),
      'DIALECT',
      '2'
    );

    return parseMetaResponse(response);
  } catch (error) {
    const reasonCode = classifyRedisError(error);
    const reason = error instanceof Error ? error.message : 'Không thể scan Redis index';
    throw new RedisSearchError(reason, reasonCode);
  }
};

export const searchHybrid = async (
  terms: string[],
  embedding: number[],
  filters: RedisSearchFilters,
  limit: number,
  knnCandidates: number
): Promise<RedisSearchResult> => {
  const redis = await ensureRedisReady();
  if (!redis) {
    throw new RedisSearchError('Redis không khả dụng cho hybrid search', 'redis_unavailable');
  }

  const indexName = getIndexName();
  const filterQuery = buildFilterQuery(filters);

  const textQuery = terms.length > 0
    ? `@name|description|categoryName|categorySlug|colors|sizes|synonyms:(${terms
        .map((term) => `${escapeText(term)}*`)
        .join('|')})`
    : '*';

  const baseQuery = [textQuery, filterQuery].filter(Boolean).join(' ');
  const vectorQuery = ['*', filterQuery].filter(Boolean).join(' ');
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeCandidates = Math.max(1, Math.floor(knnCandidates));
  const candidateLimit = Math.max(safeCandidates, safeLimit * 3);

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
    const { textWeight, vectorWeight } = getHybridWeights();

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
      .slice(0, safeLimit)
      .map(([id]) => id);

    return {
      total: Math.max(textParsed.total, vectorParsed.total),
      ids: sortedIds,
      scores: hybridScores,
    };
  } catch (error) {
    const reasonCode = classifyRedisError(error);
    const reason = error instanceof Error ? error.message : 'Hybrid search thất bại';
    throw new RedisSearchError(reason, reasonCode);
  }
};

export const searchSuggestions = async (
  prefix: string,
  limit: number
): Promise<RedisSearchSuggestionResult> => {
  const redis = await ensureRedisReady();
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
  const redis = await ensureRedisReady();
  if (!redis) {
    const diagnostics = buildDiagnostics();
    return {
      indexName: getIndexName(),
      numDocs: 0,
      status: 'redis_unavailable',
      reason: formatRedisUnavailableReason(diagnostics),
      reasonCode: 'redis_unavailable',
      moduleAvailable: false,
      diagnostics,
    };
  }

  const indexName = getIndexName();

  try {
    const list = await redis.call('FT._LIST');
    const existing = parseRedisArray(list);
    const moduleAvailable = true;

    if (!existing.includes(indexName)) {
      return {
        indexName,
        numDocs: 0,
        status: 'missing',
        reason: 'Index chưa được tạo',
        reasonCode: 'index_missing',
        moduleAvailable,
        diagnostics: buildDiagnostics(),
      };
    }

    const info = await redis.call('FT.INFO', indexName);
    const infoArray = Array.isArray(info) ? info : [];
    const numDocsIndex = infoArray.findIndex((value) => value === 'num_docs');
    const numDocsValue = numDocsIndex >= 0 ? String(infoArray[numDocsIndex + 1]) : '0';
    return {
      indexName,
      numDocs: parseNumber(numDocsValue),
      status: 'ok',
      moduleAvailable,
      diagnostics: buildDiagnostics(),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Không đọc được trạng thái index';
    const reasonCode = classifyRedisError(error);
    return {
      indexName,
      numDocs: 0,
      status: 'missing',
      reason,
      reasonCode,
      moduleAvailable: reasonCode !== 'redisearch_module_unavailable',
      diagnostics: buildDiagnostics(),
    };
  }
};

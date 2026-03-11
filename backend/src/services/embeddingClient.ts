declare const fetch: (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const DEFAULT_SERVICE_URL = 'http://localhost:8081';
const DEFAULT_TIMEOUT_MS = 1500;

export type EmbeddingProvider = 'worker' | 'voyage' | 'jina' | 'disabled';
export type EmbeddingStatus =
  | 'ok'
  | 'disabled'
  | 'misconfigured'
  | 'timeout'
  | 'unauthorized'
  | 'unavailable'
  | 'invalid_response';

export type EmbeddingResult = {
  embeddings: number[][];
  status: EmbeddingStatus;
  provider: EmbeddingProvider;
  model?: string;
  reason?: string;
};

export type EmbeddingHealth = {
  ok: boolean;
  status: EmbeddingStatus;
  provider: EmbeddingProvider;
  model?: string;
  reason?: string;
};

interface EmbedResponse {
  embeddings: number[][];
  dimension: number;
  model: string;
}

interface ManagedEmbedItem {
  embedding?: unknown;
}

interface ManagedEmbedResponse {
  data: ManagedEmbedItem[];
  model?: string;
}

const isProvider = (value: string | undefined): value is EmbeddingProvider =>
  value === 'worker' || value === 'voyage' || value === 'jina' || value === 'disabled';

const getProvider = (): EmbeddingProvider => {
  const envValue = process.env.EMBEDDING_PROVIDER;
  if (isProvider(envValue)) return envValue;
  return 'worker';
};

const isEmbedResponse = (value: unknown): value is EmbedResponse => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.embeddings);
};

const isManagedEmbedResponse = (value: unknown): value is ManagedEmbedResponse => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.data);
};

const getWorkerServiceUrl = () => process.env.EMBEDDING_SERVICE_URL || DEFAULT_SERVICE_URL;

const getManagedBaseUrl = (provider: EmbeddingProvider): string => {
  const override = process.env.EMBEDDING_BASE_URL;
  if (override) return override;
  if (provider === 'voyage') return 'https://api.voyageai.com/v1/embeddings';
  if (provider === 'jina') return 'https://api.jina.ai/v1/embeddings';
  return '';
};

const getManagedModel = (): string | undefined => process.env.EMBEDDING_MODEL;

const getTimeoutMs = () => Number(process.env.SEARCH_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError';

const safeParseJson = async (response: { json: () => Promise<unknown> }): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

const toReasonText = (payload: unknown): string | undefined => {
  if (!payload) return undefined;
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload);
  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const detail = record.detail ?? record.message ?? record.error ?? record.error_message;
    if (typeof detail === 'string') return detail;
    return JSON.stringify(payload);
  }
  return undefined;
};

const buildHttpReason = (status: number, detail?: string): string =>
  detail ? `http_${status}: ${detail}` : `http_${status}`;

const extractManagedEmbeddings = (payload: ManagedEmbedResponse): number[][] | null => {
  const embeddings = payload.data
    .map((item) => (Array.isArray(item.embedding) ? item.embedding : null))
    .filter((embedding): embedding is number[] => Boolean(embedding));
  return embeddings.length > 0 ? embeddings : null;
};

const requestWorker = async (texts: string[]): Promise<EmbeddingResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(`${getWorkerServiceUrl()}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? 'unauthorized' : 'unavailable';
      const payload = await safeParseJson(response);
      const reason = buildHttpReason(response.status, toReasonText(payload));
      return { embeddings: [], status, provider: 'worker', reason };
    }

    const payload = await response.json();
    if (!isEmbedResponse(payload)) {
      return { embeddings: [], status: 'invalid_response', provider: 'worker', reason: 'invalid_response' };
    }

    return { embeddings: payload.embeddings, status: 'ok', provider: 'worker', model: payload.model };
  } catch (error) {
    const status = isAbortError(error) ? 'timeout' : 'unavailable';
    const reason = isAbortError(error)
      ? 'timeout'
      : `network: ${error instanceof Error ? error.message : 'unknown'}`;
    return { embeddings: [], status, provider: 'worker', reason };
  } finally {
    clearTimeout(timeoutId);
  }
};

const requestManaged = async (provider: EmbeddingProvider, texts: string[]): Promise<EmbeddingResult> => {
  const apiKey = process.env.EMBEDDING_API_KEY;
  const model = getManagedModel();
  if (!apiKey || !model) {
    return { embeddings: [], status: 'misconfigured', provider, reason: 'missing_api_key_or_model' };
  }

  const baseUrl = getManagedBaseUrl(provider);
  if (!baseUrl) {
    return { embeddings: [], status: 'misconfigured', provider, model, reason: 'missing_base_url' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? 'unauthorized' : 'unavailable';
      const payload = await safeParseJson(response);
      const reason = buildHttpReason(response.status, toReasonText(payload));
      return { embeddings: [], status, provider, model, reason };
    }

    const payload = await response.json();
    if (isEmbedResponse(payload)) {
      return { embeddings: payload.embeddings, status: 'ok', provider, model: payload.model || model };
    }

    if (isManagedEmbedResponse(payload)) {
      const embeddings = extractManagedEmbeddings(payload);
      if (!embeddings) {
      return { embeddings: [], status: 'invalid_response', provider, model, reason: 'invalid_response' };
      }
      return { embeddings, status: 'ok', provider, model: payload.model || model };
    }

    return { embeddings: [], status: 'invalid_response', provider, model, reason: 'invalid_response' };
  } catch (error) {
    const status = isAbortError(error) ? 'timeout' : 'unavailable';
  const reason = isAbortError(error)
    ? 'timeout'
    : `network: ${error instanceof Error ? error.message : 'unknown'}`;
  return { embeddings: [], status, provider, model, reason };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const embedTextsDetailed = async (texts: string[]): Promise<EmbeddingResult> => {
  if (texts.length === 0) {
    return { embeddings: [], status: 'invalid_response', provider: getProvider() };
  }

  const provider = getProvider();
  if (provider === 'disabled') {
    return { embeddings: [], status: 'disabled', provider };
  }

  if (provider === 'worker') {
    return requestWorker(texts);
  }

  return requestManaged(provider, texts);
};

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const result = await embedTextsDetailed(texts);
  return result.embeddings;
};

export const getEmbeddingHealth = async (): Promise<EmbeddingHealth> => {
  const provider = getProvider();
  if (provider === 'disabled') {
    return { ok: false, status: 'disabled', provider, reason: 'disabled' };
  }

  if (provider !== 'worker') {
    const apiKey = process.env.EMBEDDING_API_KEY;
    const model = getManagedModel();
    if (!apiKey || !model) {
      return { ok: false, status: 'misconfigured', provider, model, reason: 'missing_api_key_or_model' };
    }

    const result = await embedTextsDetailed(['health-check']);
    return {
      ok: result.status === 'ok',
      status: result.status,
      provider,
      model: result.model || model,
      reason: result.reason,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(`${getWorkerServiceUrl()}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.ok ? 'ok' : 'unavailable',
      provider,
      reason: response.ok ? undefined : buildHttpReason(response.status),
    };
  } catch (error) {
    const status = isAbortError(error) ? 'timeout' : 'unavailable';
    const reason = isAbortError(error)
      ? 'timeout'
      : `network: ${error instanceof Error ? error.message : 'unknown'}`;
    return { ok: false, status, provider, reason };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const checkEmbeddingHealth = async (): Promise<boolean> => {
  const result = await getEmbeddingHealth();
  return result.ok;
};

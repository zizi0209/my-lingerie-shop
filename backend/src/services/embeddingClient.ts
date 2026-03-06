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

interface EmbedResponse {
  embeddings: number[][];
  dimension: number;
  model: string;
}

const isEmbedResponse = (value: unknown): value is EmbedResponse => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.embeddings);
};

const getServiceUrl = () => process.env.EMBEDDING_SERVICE_URL || DEFAULT_SERVICE_URL;

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
  if (texts.length === 0) return [];

  const timeoutMs = Number(process.env.SEARCH_TIMEOUT_MS || 1500);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getServiceUrl()}/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    if (!isEmbedResponse(payload)) {
      return [];
    }

    return payload.embeddings;
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
};

export const checkEmbeddingHealth = async (): Promise<boolean> => {
  const timeoutMs = Number(process.env.SEARCH_TIMEOUT_MS || 1500);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getServiceUrl()}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

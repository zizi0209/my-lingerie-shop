/**
 * Utility function for fetching API with timeout and error handling
 * Returns null if fetch fails (graceful degradation)
 */
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit & { timeout?: number }
): Promise<T | null> {
  const { timeout = 5000, ...fetchOptions } = options || {};
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[fetchApi] ${endpoint} returned ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[fetchApi] ${endpoint} timeout`);
    } else {
      console.warn(`[fetchApi] ${endpoint} failed`);
    }
    return null;
  }
}

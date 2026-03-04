const DEFAULT_LOCAL_API_URL = 'http://localhost:5000/api';

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const resolved = envUrl || DEFAULT_LOCAL_API_URL;

  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost';
    if (!isLocalhost && resolved.includes('localhost')) {
      console.warn('[API] NEXT_PUBLIC_API_URL đang trỏ về localhost trong môi trường production.');
    }
  }

  return resolved;
};

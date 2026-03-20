const DEFAULT_LOCAL_API_URL = 'http://localhost:5000/api';
const DEFAULT_PROD_API_PATH = '/api';

const isLocalhostHost = (host?: string): boolean => {
  if (!host) return false;
  return host === 'localhost' || host === '127.0.0.1';
};

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (envUrl) {
    if (typeof window !== 'undefined' && !isLocalhostHost(window.location.hostname)) {
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        console.warn('[API] NEXT_PUBLIC_API_URL đang trỏ về localhost trong môi trường production.');
        return DEFAULT_PROD_API_PATH;
      }
    }
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    return isLocalhostHost(window.location.hostname) ? DEFAULT_LOCAL_API_URL : DEFAULT_PROD_API_PATH;
  }

  return process.env.NODE_ENV === 'production' ? DEFAULT_PROD_API_PATH : DEFAULT_LOCAL_API_URL;
};

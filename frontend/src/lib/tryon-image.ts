const INVALID_TRYON_HOSTS = new Set([
  'via.placeholder.com',
  'placeholder.com',
]);

const ALLOW_SEED_IMAGES = process.env.NODE_ENV !== 'production';

export function isValidTryOnGarmentUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('data:')) return false;
  if (!ALLOW_SEED_IMAGES && lower.includes('/images/seed/')) return false;

  try {
    const parsed = new URL(trimmed, 'http://localhost');
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    if (hostname && INVALID_TRYON_HOSTS.has(hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

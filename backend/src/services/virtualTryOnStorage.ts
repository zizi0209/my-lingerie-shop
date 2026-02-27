import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';
const GCS_TRYON_BUCKET = process.env.GCS_TRYON_BUCKET || '';
const GCS_TRYON_PREFIX = process.env.GCS_TRYON_PREFIX || 'virtual-tryon';
const GCS_SIGNED_URL_TTL_SECONDS = process.env.GCS_TRYON_SIGNED_URL_TTL_SECONDS;
const GCS_CLIENT_EMAIL = process.env.GCS_CLIENT_EMAIL || '';
const GCS_PRIVATE_KEY = process.env.GCS_PRIVATE_KEY || '';
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';

let gcsStorage: Storage | null = null;

function getSignedUrlTtlSeconds(): number {
  const parsed = Number(GCS_SIGNED_URL_TTL_SECONDS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 600;
  }
  return Math.min(Math.max(parsed, 60), 3600);
}

function getGcsStorage(): Storage | null {
  if (!GCS_TRYON_BUCKET) {
    return null;
  }

  if (!gcsStorage) {
    const options: { projectId?: string; credentials?: { client_email: string; private_key: string } } = {};
    if (GCP_PROJECT_ID) {
      options.projectId = GCP_PROJECT_ID;
    }
    if (GCS_CLIENT_EMAIL && GCS_PRIVATE_KEY) {
      options.credentials = {
        client_email: GCS_CLIENT_EMAIL,
        private_key: GCS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }
    gcsStorage = Object.keys(options).length > 0 ? new Storage(options) : new Storage();
  }

  return gcsStorage;
}

function parseBase64Image(base64: string): { data: string; mimeType: string; extension: string } {
  if (base64.startsWith('data:')) {
    const [meta, data] = base64.split(',');
    const mimeMatch = meta.match(/^data:([^;]+);base64$/);
    const mimeType = mimeMatch?.[1] ?? 'image/jpeg';
    const extension = mimeType === 'image/png'
      ? 'png'
      : mimeType === 'image/webp'
        ? 'webp'
        : mimeType === 'image/gif'
          ? 'gif'
          : 'jpg';
    return { data, mimeType, extension };
  }

  if (base64.startsWith('/9j/')) {
    return { data: base64, mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (base64.startsWith('iVBOR')) {
    return { data: base64, mimeType: 'image/png', extension: 'png' };
  }
  if (base64.startsWith('UklGR')) {
    return { data: base64, mimeType: 'image/webp', extension: 'webp' };
  }

  return { data: base64, mimeType: 'image/jpeg', extension: 'jpg' };
}

async function uploadToGcs(base64Image: string): Promise<string> {
  const storage = getGcsStorage();
  if (!storage) {
    throw new Error('GCS_TRYON_BUCKET not configured');
  }

  const { data, mimeType, extension } = parseBase64Image(base64Image);
  const buffer = Buffer.from(data, 'base64');
  const objectName = `${GCS_TRYON_PREFIX}/${Date.now()}-${randomUUID()}.${extension}`;
  const bucket = storage.bucket(GCS_TRYON_BUCKET);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    contentType: mimeType,
    resumable: false,
    metadata: {
      cacheControl: 'private, max-age=0, no-transform',
    },
  });

  const expires = Date.now() + getSignedUrlTtlSeconds() * 1000;
  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires });
  return signedUrl;
}

async function uploadToImgbb(base64Image: string): Promise<string> {
  if (!IMGBB_API_KEY) {
    throw new Error('IMGBB_API_KEY not configured');
  }

  let imageData = base64Image;
  if (base64Image.startsWith('data:')) {
    imageData = base64Image.split(',')[1];
  }

  const formData = new URLSearchParams();
  formData.append('key', IMGBB_API_KEY);
  formData.append('image', imageData);
  formData.append('expiration', '600');

  const response = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    console.log('[imgbb] Upload failed:', response.status, text);
    throw new Error(`imgbb upload failed: ${response.status}`);
  }

  const result = await response.json() as {
    success: boolean;
    data?: { url: string };
    error?: { message: string };
  };

  if (!result.success || !result.data?.url) {
    throw new Error(result.error?.message || 'imgbb upload failed');
  }

  console.log('[imgbb] Uploaded:', result.data.url);
  return result.data.url;
}

function isImgbbConfigured(): boolean {
  return IMGBB_API_KEY.length > 0;
}

function isGcsConfigured(): boolean {
  return GCS_TRYON_BUCKET.length > 0;
}

function ensureDataUrl(base64: string): string {
  if (base64.startsWith('data:')) {
    return base64;
  }
  if (base64.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${base64}`;
  }
  if (base64.startsWith('iVBOR')) {
    return `data:image/png;base64,${base64}`;
  }
  if (base64.startsWith('UklGR')) {
    return `data:image/webp;base64,${base64}`;
  }
  return `data:image/jpeg;base64,${base64}`;
}

export async function uploadToTemporaryUrl(base64Image: string, label: string): Promise<string> {
  if (isGcsConfigured()) {
    try {
      console.log(`[GCS] Uploading ${label} image...`);
      const url = await uploadToGcs(base64Image);
      console.log(`[GCS] Uploaded ${label} image`);
      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      console.warn(`[GCS] Upload failed, fallback to imgbb: ${message}`);
    }
  }

  if (isImgbbConfigured()) {
    console.log(`[imgbb] Uploading ${label} image...`);
    return uploadToImgbb(base64Image);
  }

  return ensureDataUrl(base64Image);
}

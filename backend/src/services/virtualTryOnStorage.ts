import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { cloudinary } from '../config/cloudinary';

const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';
const GCS_TRYON_BUCKET = process.env.GCS_TRYON_BUCKET || '';
const GCS_TRYON_PREFIX = process.env.GCS_TRYON_PREFIX || 'virtual-tryon';
const GCS_TRYON_OUTPUT_PREFIX = process.env.GCS_TRYON_OUTPUT_PREFIX || `${GCS_TRYON_PREFIX}/outputs`;
const GCS_TRYON_UPLOAD_PREFIX = process.env.GCS_TRYON_UPLOAD_PREFIX || `${GCS_TRYON_PREFIX}/uploads`;
const GCS_SIGNED_URL_TTL_SECONDS = process.env.GCS_TRYON_SIGNED_URL_TTL_SECONDS;
const GCS_CLIENT_EMAIL = process.env.GCS_CLIENT_EMAIL || '';
const GCS_PRIVATE_KEY = process.env.GCS_PRIVATE_KEY || '';
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '';
const TRYON_STORAGE_PROVIDER = process.env.TRYON_STORAGE_PROVIDER || 'auto';
const TRYON_CLOUDINARY_FOLDER = process.env.TRYON_CLOUDINARY_FOLDER || 'virtual-tryon';

export type TryOnStorageProvider = 'gcs' | 'cloudinary';

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

function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
  );
}

export function getTryOnStorageProvider(): TryOnStorageProvider | null {
  if (TRYON_STORAGE_PROVIDER === 'gcs') {
    return isGcsConfigured() ? 'gcs' : null;
  }
  if (TRYON_STORAGE_PROVIDER === 'cloudinary') {
    return isCloudinaryConfigured() ? 'cloudinary' : null;
  }

  if (isGcsConfigured()) return 'gcs';
  if (isCloudinaryConfigured()) return 'cloudinary';
  return null;
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

function mapMimeTypeToExtension(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'video/mpeg') return 'mpeg';
  if (mimeType === 'video/mov') return 'mov';
  if (mimeType === 'video/avi') return 'avi';
  return 'bin';
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

function parseGcsUri(gcsUri: string): { bucket: string; objectPath: string } {
  const normalized = gcsUri.replace('gs://', '');
  const parts = normalized.split('/');
  const bucket = parts.shift();
  const objectPath = parts.join('/');
  if (!bucket || !objectPath) {
    throw new Error('Invalid GCS URI');
  }
  return { bucket, objectPath };
}

export function isGcsUri(value: string): boolean {
  return value.startsWith('gs://');
}

export async function createTryOnUploadSignedUrl(options: {
  contentType: string;
  extension?: string;
  category?: string;
}): Promise<{
  uploadUrl: string;
  uploadMethod: 'PUT' | 'POST';
  uploadFields?: Record<string, string>;
  provider: TryOnStorageProvider;
  gcsUri?: string;
  objectPath?: string;
  expiresInSeconds: number;
}> {
  const provider = getTryOnStorageProvider();
  if (!provider) {
    throw new Error('TRYON storage provider is not configured');
  }

  if (provider === 'gcs') {
    const storage = getGcsStorage();
    if (!storage) {
      throw new Error('GCS_TRYON_BUCKET not configured');
    }

    const extension = options.extension || mapMimeTypeToExtension(options.contentType);
    const safeCategory = options.category ? options.category.replace(/[^a-zA-Z0-9-_]/g, '') : 'generic';
    const objectPath = `${GCS_TRYON_UPLOAD_PREFIX}/${safeCategory}/${Date.now()}-${randomUUID()}.${extension}`;
    const bucket = storage.bucket(GCS_TRYON_BUCKET);
    const file = bucket.file(objectPath);

    const expiresInSeconds = getSignedUrlTtlSeconds();
    const expires = Date.now() + expiresInSeconds * 1000;
    const [uploadUrl] = await file.getSignedUrl({
      action: 'write',
      expires,
      contentType: options.contentType,
    });

    return {
      uploadUrl,
      uploadMethod: 'PUT',
      provider,
      gcsUri: `gs://${GCS_TRYON_BUCKET}/${objectPath}`,
      objectPath,
      expiresInSeconds,
    };
  }

  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary chưa được cấu hình');
  }

  const safeCategory = options.category ? options.category.replace(/[^a-zA-Z0-9-_]/g, '') : 'generic';
  const folder = `${TRYON_CLOUDINARY_FOLDER}/${safeCategory}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET || ''
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    uploadMethod: 'POST',
    provider,
    uploadFields: {
      api_key: process.env.CLOUDINARY_API_KEY || '',
      timestamp: String(timestamp),
      signature,
      folder,
    },
    expiresInSeconds: 600,
  };
}

export async function getSignedReadUrlForGcsUri(gcsUri: string): Promise<string> {
  const storage = getGcsStorage();
  if (!storage) {
    throw new Error('GCS_TRYON_BUCKET not configured');
  }

  const { bucket, objectPath } = parseGcsUri(gcsUri);
  const file = storage.bucket(bucket).file(objectPath);
  const expires = Date.now() + getSignedUrlTtlSeconds() * 1000;
  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires });
  return signedUrl;
}

export async function downloadGcsUriAsBase64(gcsUri: string): Promise<string> {
  const storage = getGcsStorage();
  if (!storage) {
    throw new Error('GCS_TRYON_BUCKET not configured');
  }

  const { bucket, objectPath } = parseGcsUri(gcsUri);
  const [buffer] = await storage.bucket(bucket).file(objectPath).download();
  return buffer.toString('base64');
}

export async function uploadBase64ToGcs(options: {
  base64: string;
  mimeType: string;
  prefix?: string;
}): Promise<{ gcsUri: string; signedUrl: string }> {
  const storage = getGcsStorage();
  if (!storage) {
    throw new Error('GCS_TRYON_BUCKET not configured');
  }

  const { base64, mimeType } = options;
  const extension = mapMimeTypeToExtension(mimeType);
  const prefix = options.prefix || GCS_TRYON_OUTPUT_PREFIX;
  const objectName = `${prefix}/${Date.now()}-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(base64, 'base64');
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
  return {
    gcsUri: `gs://${GCS_TRYON_BUCKET}/${objectName}`,
    signedUrl,
  };
}

export async function uploadBase64ToTryOnStorage(options: {
  base64: string;
  mimeType: string;
  prefix?: string;
}): Promise<{ url: string; storageUri?: string }> {
  const provider = getTryOnStorageProvider();
  if (provider === 'gcs') {
    const result = await uploadBase64ToGcs(options);
    return { url: result.signedUrl, storageUri: result.gcsUri };
  }

  if (provider === 'cloudinary') {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary chưa được cấu hình');
    }
    const dataUrl = ensureDataUrl(options.base64);
    const folder = options.prefix || `${TRYON_CLOUDINARY_FOLDER}/outputs`;
    const uploadResult = await cloudinary.uploader.upload(dataUrl, {
      folder,
      resource_type: 'image',
    });
    return { url: uploadResult.secure_url };
  }

  throw new Error('TRYON storage provider is not configured');
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

export function isTryOnGcsConfigured(): boolean {
  return getTryOnStorageProvider() === 'gcs' && isGcsConfigured();
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

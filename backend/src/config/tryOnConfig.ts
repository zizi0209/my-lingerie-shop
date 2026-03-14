import { z } from 'zod';
import { getTryOnStorageProvider, isTryOnGcsConfigured } from '../services/virtualTryOnStorage';

const VERTEX_PROJECT_ID = process.env.VERTEX_AI_PROJECT_ID
  || process.env.GCP_PROJECT_ID
  || process.env.GOOGLE_CLOUD_PROJECT
  || '';
const VERTEX_LOCATION = process.env.VERTEX_AI_LOCATION
  || process.env.GOOGLE_CLOUD_LOCATION
  || '';
const VERTEX_TRYON_MODEL_ID = process.env.VERTEX_TRYON_MODEL_ID || 'virtual-try-on-001';

const TRYON_STORAGE_PROVIDER = process.env.TRYON_STORAGE_PROVIDER || 'auto';
const GCS_TRYON_BUCKET = process.env.GCS_TRYON_BUCKET || '';
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
const SIGNED_URL_TTL_RAW = process.env.GCS_TRYON_SIGNED_URL_TTL_SECONDS;
const VERTEX_SAMPLE_COUNT_RAW = process.env.VERTEX_TRYON_SAMPLE_COUNT;

const parseOptionalNumber = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const shouldValidateTryOnConfig = (): boolean => {
  if (process.env.TRYON_VALIDATE_CONFIG === 'false') return false;
  return Boolean(
    process.env.TRYON_JOB_STORE
    || process.env.TRYON_STORAGE_PROVIDER
    || process.env.VERTEX_AI_PROJECT_ID
    || process.env.VERTEX_AI_LOCATION
    || process.env.VERTEX_TRYON_MODEL_ID
  );
};

const tryOnEnvSchema = z.object({
  vertexProjectId: z.string().min(1, 'VERTEX_AI_PROJECT_ID là bắt buộc'),
  vertexLocation: z.string().min(1, 'VERTEX_AI_LOCATION là bắt buộc'),
  vertexModelId: z.string().min(1, 'VERTEX_TRYON_MODEL_ID là bắt buộc'),
  storageProvider: z.enum(['gcs', 'cloudinary', 'auto']),
  gcsBucket: z.string().optional(),
  cloudinaryCloudName: z.string().optional(),
  cloudinaryApiKey: z.string().optional(),
  cloudinaryApiSecret: z.string().optional(),
  signedUrlTtlSeconds: z.number().optional(),
  vertexSampleCount: z.number().optional(),
}).superRefine((values, ctx) => {
  if (values.storageProvider === 'gcs' && !values.gcsBucket) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'GCS_TRYON_BUCKET là bắt buộc khi TRYON_STORAGE_PROVIDER=gcs' });
  }

  if (values.storageProvider === 'cloudinary') {
    if (!values.cloudinaryCloudName || !values.cloudinaryApiKey || !values.cloudinaryApiSecret) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Thiếu CLOUDINARY_* khi TRYON_STORAGE_PROVIDER=cloudinary' });
    }
  }

  if (values.storageProvider === 'auto' && !values.gcsBucket && !values.cloudinaryCloudName) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'TRYON_STORAGE_PROVIDER=auto yêu cầu cấu hình GCS hoặc Cloudinary' });
  }

  if (values.signedUrlTtlSeconds !== undefined && (!Number.isFinite(values.signedUrlTtlSeconds) || values.signedUrlTtlSeconds <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'GCS_TRYON_SIGNED_URL_TTL_SECONDS không hợp lệ' });
  }

  if (values.vertexSampleCount !== undefined && (!Number.isFinite(values.vertexSampleCount) || values.vertexSampleCount <= 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'VERTEX_TRYON_SAMPLE_COUNT phải > 0' });
  }
});

export function validateTryOnConfig(): void {
  if (!shouldValidateTryOnConfig()) return;

  const parsed = tryOnEnvSchema.safeParse({
    vertexProjectId: VERTEX_PROJECT_ID,
    vertexLocation: VERTEX_LOCATION,
    vertexModelId: VERTEX_TRYON_MODEL_ID,
    storageProvider: TRYON_STORAGE_PROVIDER as 'gcs' | 'cloudinary' | 'auto',
    gcsBucket: GCS_TRYON_BUCKET || undefined,
    cloudinaryCloudName: CLOUDINARY_CLOUD_NAME || undefined,
    cloudinaryApiKey: CLOUDINARY_API_KEY || undefined,
    cloudinaryApiSecret: CLOUDINARY_API_SECRET || undefined,
    signedUrlTtlSeconds: parseOptionalNumber(SIGNED_URL_TTL_RAW),
    vertexSampleCount: parseOptionalNumber(VERTEX_SAMPLE_COUNT_RAW),
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ');
    throw new Error(`[Config][TryOn] ${message}`);
  }

  const resolvedProvider = getTryOnStorageProvider();
  if (!resolvedProvider) {
    throw new Error('[Config][TryOn] Try-on storage chưa được cấu hình hợp lệ');
  }
}

export interface TryOnHealthSnapshot {
  available: boolean;
  provider: string;
  modelId: string;
  location: string;
  projectId: string;
  storageProvider: string | null;
  storageConfigured: boolean;
  vertexConfigured: boolean;
  videoEnabled: boolean;
  localVideoDisabled: boolean;
  reasons: string[];
}

export function getTryOnHealthSnapshot(): TryOnHealthSnapshot {
  const storageProvider = getTryOnStorageProvider();
  const vertexConfigured = Boolean(VERTEX_PROJECT_ID && VERTEX_LOCATION);
  const storageConfigured = Boolean(storageProvider);
  const localVideoDisabled = process.env.NODE_ENV === 'development';
  const videoEnabled = !localVideoDisabled
    && process.env.FREE_MODE_DISABLE_VIDEO !== 'true'
    && storageProvider === 'gcs'
    && isTryOnGcsConfigured();
  const reasons: string[] = [];

  if (!VERTEX_PROJECT_ID) reasons.push('Thiếu VERTEX_AI_PROJECT_ID');
  if (!VERTEX_LOCATION) reasons.push('Thiếu VERTEX_AI_LOCATION');
  if (!storageConfigured) reasons.push('Chưa cấu hình storage cho try-on');

  return {
    available: vertexConfigured && storageConfigured,
    provider: 'Vertex-AI',
    modelId: VERTEX_TRYON_MODEL_ID,
    location: VERTEX_LOCATION,
    projectId: VERTEX_PROJECT_ID,
    storageProvider: storageProvider ?? null,
    storageConfigured,
    vertexConfigured,
    videoEnabled,
    localVideoDisabled,
    reasons,
  };
}

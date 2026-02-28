import { Firestore, type DocumentData } from '@google-cloud/firestore';
import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';

const FIRESTORE_PROJECT_ID = process.env.FIRESTORE_PROJECT_ID
  || process.env.GCP_PROJECT_ID
  || process.env.GOOGLE_CLOUD_PROJECT
  || '';
const FIRESTORE_CLIENT_EMAIL = process.env.FIRESTORE_CLIENT_EMAIL || process.env.GCS_CLIENT_EMAIL || '';
const FIRESTORE_PRIVATE_KEY = process.env.FIRESTORE_PRIVATE_KEY || process.env.GCS_PRIVATE_KEY || '';
const TRYON_JOB_COLLECTION = process.env.TRYON_JOB_COLLECTION || 'virtual_tryon_jobs';
const TRYON_JOB_STORE = process.env.TRYON_JOB_STORE || 'auto';
const DATABASE_URL = process.env.DATABASE_URL || '';

const TRYON_JOB_STATUSES = ['queued', 'processing', 'completed', 'failed'] as const;
export type TryOnJobStatus = (typeof TRYON_JOB_STATUSES)[number];

export interface TryOnJobRecord {
  jobId: string;
  status: TryOnJobStatus;
  provider?: string;
  errorCode?: string;
  errorMessage?: string;
  processingTime?: number;
  resultImage?: string;
  resultImageGcsUri?: string;
  resultVideo?: string;
  resultVideoGcsUri?: string;
  personImageGcsUri?: string;
  garmentImageGcsUri?: string;
  personImageUrl?: string;
  garmentImageUrl?: string;
  wantsVideo?: boolean;
  videoDurationSeconds?: number;
  createdAt: number;
  updatedAt: number;
  userId?: string;
  productId?: string;
}

export interface CreateTryOnJobInput {
  jobId?: string;
  status: TryOnJobStatus;
  provider?: string;
  errorCode?: string;
  errorMessage?: string;
  processingTime?: number;
  resultImage?: string;
  resultImageGcsUri?: string;
  resultVideo?: string;
  resultVideoGcsUri?: string;
  personImageGcsUri?: string;
  garmentImageGcsUri?: string;
  personImageUrl?: string;
  garmentImageUrl?: string;
  wantsVideo?: boolean;
  videoDurationSeconds?: number;
  userId?: string;
  productId?: string;
}

let firestoreClient: Firestore | null = null;
let postgresReady = false;

type TryOnJobStore = 'firestore' | 'postgres';

interface PostgresTryOnJobRow {
  job_id: string;
  status: string;
  provider: string | null;
  error_code: string | null;
  error_message: string | null;
  processing_time: number | null;
  result_image: string | null;
  result_image_gcs_uri: string | null;
  result_video: string | null;
  result_video_gcs_uri: string | null;
  person_image_gcs_uri: string | null;
  garment_image_gcs_uri: string | null;
  person_image_url: string | null;
  garment_image_url: string | null;
  wants_video: boolean | null;
  video_duration_seconds: number | null;
  created_at: number;
  updated_at: number;
  user_id: string | null;
  product_id: string | null;
}

function isFirestoreConfigured(): boolean {
  return Boolean(FIRESTORE_PROJECT_ID || (FIRESTORE_CLIENT_EMAIL && FIRESTORE_PRIVATE_KEY));
}

function isPostgresConfigured(): boolean {
  return DATABASE_URL.length > 0;
}

function getFirestore(): Firestore | null {
  if (!isFirestoreConfigured()) {
    return null;
  }

  if (!firestoreClient) {
    const options: { projectId?: string; credentials?: { client_email: string; private_key: string } } = {};
    if (FIRESTORE_PROJECT_ID) {
      options.projectId = FIRESTORE_PROJECT_ID;
    }
    if (FIRESTORE_CLIENT_EMAIL && FIRESTORE_PRIVATE_KEY) {
      options.credentials = {
        client_email: FIRESTORE_CLIENT_EMAIL,
        private_key: FIRESTORE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    }
    firestoreClient = Object.keys(options).length > 0 ? new Firestore(options) : new Firestore();
  }

  return firestoreClient;
}

function getTryOnJobStore(): TryOnJobStore | null {
  if (TRYON_JOB_STORE === 'firestore') {
    return isFirestoreConfigured() ? 'firestore' : null;
  }
  if (TRYON_JOB_STORE === 'postgres') {
    return isPostgresConfigured() ? 'postgres' : null;
  }

  if (isFirestoreConfigured()) return 'firestore';
  if (isPostgresConfigured()) return 'postgres';
  return null;
}

function isTryOnJobStatus(value: unknown): value is TryOnJobStatus {
  return typeof value === 'string' && TRYON_JOB_STATUSES.includes(value as TryOnJobStatus);
}

function toTryOnJobRecord(jobId: string, data: DocumentData | undefined): TryOnJobRecord | null {
  if (!data || !isTryOnJobStatus(data.status)) {
    return null;
  }

  const createdAt = typeof data.createdAt === 'number' ? data.createdAt : Date.now();
  const updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : createdAt;

  return {
    jobId,
    status: data.status,
    provider: typeof data.provider === 'string' ? data.provider : undefined,
    errorCode: typeof data.errorCode === 'string' ? data.errorCode : undefined,
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    processingTime: typeof data.processingTime === 'number' ? data.processingTime : undefined,
    resultImage: typeof data.resultImage === 'string' ? data.resultImage : undefined,
    resultImageGcsUri: typeof data.resultImageGcsUri === 'string' ? data.resultImageGcsUri : undefined,
    resultVideo: typeof data.resultVideo === 'string' ? data.resultVideo : undefined,
    resultVideoGcsUri: typeof data.resultVideoGcsUri === 'string' ? data.resultVideoGcsUri : undefined,
    personImageGcsUri: typeof data.personImageGcsUri === 'string' ? data.personImageGcsUri : undefined,
    garmentImageGcsUri: typeof data.garmentImageGcsUri === 'string' ? data.garmentImageGcsUri : undefined,
    personImageUrl: typeof data.personImageUrl === 'string' ? data.personImageUrl : undefined,
    garmentImageUrl: typeof data.garmentImageUrl === 'string' ? data.garmentImageUrl : undefined,
    wantsVideo: typeof data.wantsVideo === 'boolean' ? data.wantsVideo : undefined,
    videoDurationSeconds: typeof data.videoDurationSeconds === 'number' ? data.videoDurationSeconds : undefined,
    createdAt,
    updatedAt,
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    productId: typeof data.productId === 'string' ? data.productId : undefined,
  };
}

function toTryOnJobRecordFromRow(row: PostgresTryOnJobRow): TryOnJobRecord | null {
  if (!isTryOnJobStatus(row.status)) {
    return null;
  }

  return {
    jobId: row.job_id,
    status: row.status,
    provider: row.provider ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    processingTime: row.processing_time ?? undefined,
    resultImage: row.result_image ?? undefined,
    resultImageGcsUri: row.result_image_gcs_uri ?? undefined,
    resultVideo: row.result_video ?? undefined,
    resultVideoGcsUri: row.result_video_gcs_uri ?? undefined,
    personImageGcsUri: row.person_image_gcs_uri ?? undefined,
    garmentImageGcsUri: row.garment_image_gcs_uri ?? undefined,
    personImageUrl: row.person_image_url ?? undefined,
    garmentImageUrl: row.garment_image_url ?? undefined,
    wantsVideo: row.wants_video ?? undefined,
    videoDurationSeconds: row.video_duration_seconds ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id ?? undefined,
    productId: row.product_id ?? undefined,
  };
}

async function ensurePostgresSchema(): Promise<void> {
  if (postgresReady) {
    return;
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS virtual_tryon_jobs (
      job_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      provider TEXT,
      error_code TEXT,
      error_message TEXT,
      processing_time INTEGER,
      result_image TEXT,
      result_image_gcs_uri TEXT,
      result_video TEXT,
      result_video_gcs_uri TEXT,
      person_image_gcs_uri TEXT,
      garment_image_gcs_uri TEXT,
      person_image_url TEXT,
      garment_image_url TEXT,
      wants_video BOOLEAN,
      video_duration_seconds INTEGER,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      user_id TEXT,
      product_id TEXT
    );
  `);

  postgresReady = true;
}

export function isTryOnJobStoreEnabled(): boolean {
  return Boolean(getTryOnJobStore());
}

export async function createTryOnJob(input: CreateTryOnJobInput): Promise<TryOnJobRecord | null> {
  const now = Date.now();
  const jobId = input.jobId ?? randomUUID();
  const record: TryOnJobRecord = {
    jobId,
    status: input.status,
    provider: input.provider,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    processingTime: input.processingTime,
    resultImage: input.resultImage,
    resultImageGcsUri: input.resultImageGcsUri,
    resultVideo: input.resultVideo,
    resultVideoGcsUri: input.resultVideoGcsUri,
    personImageGcsUri: input.personImageGcsUri,
    garmentImageGcsUri: input.garmentImageGcsUri,
    personImageUrl: input.personImageUrl,
    garmentImageUrl: input.garmentImageUrl,
    wantsVideo: input.wantsVideo,
    videoDurationSeconds: input.videoDurationSeconds,
    createdAt: now,
    updatedAt: now,
    userId: input.userId,
    productId: input.productId,
  };

  const store = getTryOnJobStore();
  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) {
      return null;
    }
    await firestore.collection(TRYON_JOB_COLLECTION).doc(jobId).set(record, { merge: true });
    return record;
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    await prisma.$executeRaw`
      INSERT INTO virtual_tryon_jobs (
        job_id, status, provider, error_code, error_message, processing_time,
        result_image, result_image_gcs_uri, result_video, result_video_gcs_uri,
        person_image_gcs_uri, garment_image_gcs_uri, person_image_url, garment_image_url,
        wants_video, video_duration_seconds, created_at, updated_at, user_id, product_id
      ) VALUES (
        ${record.jobId}, ${record.status}, ${record.provider}, ${record.errorCode}, ${record.errorMessage}, ${record.processingTime},
        ${record.resultImage}, ${record.resultImageGcsUri}, ${record.resultVideo}, ${record.resultVideoGcsUri},
        ${record.personImageGcsUri}, ${record.garmentImageGcsUri}, ${record.personImageUrl}, ${record.garmentImageUrl},
        ${record.wantsVideo}, ${record.videoDurationSeconds}, ${record.createdAt}, ${record.updatedAt}, ${record.userId}, ${record.productId}
      )
      ON CONFLICT (job_id) DO UPDATE SET
        status = EXCLUDED.status,
        provider = EXCLUDED.provider,
        error_code = EXCLUDED.error_code,
        error_message = EXCLUDED.error_message,
        processing_time = EXCLUDED.processing_time,
        result_image = EXCLUDED.result_image,
        result_image_gcs_uri = EXCLUDED.result_image_gcs_uri,
        result_video = EXCLUDED.result_video,
        result_video_gcs_uri = EXCLUDED.result_video_gcs_uri,
        person_image_gcs_uri = EXCLUDED.person_image_gcs_uri,
        garment_image_gcs_uri = EXCLUDED.garment_image_gcs_uri,
        person_image_url = EXCLUDED.person_image_url,
        garment_image_url = EXCLUDED.garment_image_url,
        wants_video = EXCLUDED.wants_video,
        video_duration_seconds = EXCLUDED.video_duration_seconds,
        updated_at = EXCLUDED.updated_at,
        user_id = EXCLUDED.user_id,
        product_id = EXCLUDED.product_id
    `;
    return record;
  }

  return null;
}

export async function updateTryOnJob(jobId: string, patch: Partial<TryOnJobRecord>): Promise<boolean> {
  const store = getTryOnJobStore();
  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) {
      return false;
    }

    const payload: Partial<TryOnJobRecord> = {
      ...patch,
      updatedAt: Date.now(),
    };

    await firestore.collection(TRYON_JOB_COLLECTION).doc(jobId).set(payload, { merge: true });
    return true;
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    const existing = await getTryOnJob(jobId);
    const now = Date.now();
    const merged: TryOnJobRecord = {
      jobId,
      status: patch.status ?? existing?.status ?? 'queued',
      provider: patch.provider ?? existing?.provider,
      errorCode: patch.errorCode ?? existing?.errorCode,
      errorMessage: patch.errorMessage ?? existing?.errorMessage,
      processingTime: patch.processingTime ?? existing?.processingTime,
      resultImage: patch.resultImage ?? existing?.resultImage,
      resultImageGcsUri: patch.resultImageGcsUri ?? existing?.resultImageGcsUri,
      resultVideo: patch.resultVideo ?? existing?.resultVideo,
      resultVideoGcsUri: patch.resultVideoGcsUri ?? existing?.resultVideoGcsUri,
      personImageGcsUri: patch.personImageGcsUri ?? existing?.personImageGcsUri,
      garmentImageGcsUri: patch.garmentImageGcsUri ?? existing?.garmentImageGcsUri,
      personImageUrl: patch.personImageUrl ?? existing?.personImageUrl,
      garmentImageUrl: patch.garmentImageUrl ?? existing?.garmentImageUrl,
      wantsVideo: patch.wantsVideo ?? existing?.wantsVideo,
      videoDurationSeconds: patch.videoDurationSeconds ?? existing?.videoDurationSeconds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      userId: patch.userId ?? existing?.userId,
      productId: patch.productId ?? existing?.productId,
    };

    await prisma.$executeRaw`
      INSERT INTO virtual_tryon_jobs (
        job_id, status, provider, error_code, error_message, processing_time,
        result_image, result_image_gcs_uri, result_video, result_video_gcs_uri,
        person_image_gcs_uri, garment_image_gcs_uri, person_image_url, garment_image_url,
        wants_video, video_duration_seconds, created_at, updated_at, user_id, product_id
      ) VALUES (
        ${merged.jobId}, ${merged.status}, ${merged.provider}, ${merged.errorCode}, ${merged.errorMessage}, ${merged.processingTime},
        ${merged.resultImage}, ${merged.resultImageGcsUri}, ${merged.resultVideo}, ${merged.resultVideoGcsUri},
        ${merged.personImageGcsUri}, ${merged.garmentImageGcsUri}, ${merged.personImageUrl}, ${merged.garmentImageUrl},
        ${merged.wantsVideo}, ${merged.videoDurationSeconds}, ${merged.createdAt}, ${merged.updatedAt}, ${merged.userId}, ${merged.productId}
      )
      ON CONFLICT (job_id) DO UPDATE SET
        status = EXCLUDED.status,
        provider = EXCLUDED.provider,
        error_code = EXCLUDED.error_code,
        error_message = EXCLUDED.error_message,
        processing_time = EXCLUDED.processing_time,
        result_image = EXCLUDED.result_image,
        result_image_gcs_uri = EXCLUDED.result_image_gcs_uri,
        result_video = EXCLUDED.result_video,
        result_video_gcs_uri = EXCLUDED.result_video_gcs_uri,
        person_image_gcs_uri = EXCLUDED.person_image_gcs_uri,
        garment_image_gcs_uri = EXCLUDED.garment_image_gcs_uri,
        person_image_url = EXCLUDED.person_image_url,
        garment_image_url = EXCLUDED.garment_image_url,
        wants_video = EXCLUDED.wants_video,
        video_duration_seconds = EXCLUDED.video_duration_seconds,
        updated_at = EXCLUDED.updated_at,
        user_id = EXCLUDED.user_id,
        product_id = EXCLUDED.product_id
    `;
    return true;
  }

  return false;
}

export async function getTryOnJob(jobId: string): Promise<TryOnJobRecord | null> {
  const store = getTryOnJobStore();
  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) {
      return null;
    }

    const snapshot = await firestore.collection(TRYON_JOB_COLLECTION).doc(jobId).get();
    if (!snapshot.exists) {
      return null;
    }

    return toTryOnJobRecord(snapshot.id, snapshot.data());
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    const rows = await prisma.$queryRaw<PostgresTryOnJobRow[]>`
      SELECT * FROM virtual_tryon_jobs WHERE job_id = ${jobId} LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      return null;
    }
    return toTryOnJobRecordFromRow(row);
  }

  return null;
}

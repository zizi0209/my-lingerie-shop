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
const TRYON_JOB_TTL_SECONDS = Number(process.env.TRYON_JOB_TTL_SECONDS || '86400');
const TRYON_JOB_LEASE_SECONDS = Number(process.env.TRYON_JOB_LEASE_SECONDS || '300');
const TRYON_JOB_MAX_ATTEMPTS = Number(process.env.TRYON_JOB_MAX_ATTEMPTS || '3');

const TRYON_JOB_STATUSES = ['queued', 'processing', 'completed', 'failed', 'expired'] as const;
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
  attemptCount?: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  processingStartedAt?: number;
  deadLetteredAt?: number;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  idempotencyKey?: string;
  leaseOwner?: string;
  leaseExpiresAt?: number;
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
  attemptCount?: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  processingStartedAt?: number;
  deadLetteredAt?: number;
  expiresAt?: number;
  idempotencyKey?: string;
  leaseOwner?: string;
  leaseExpiresAt?: number;
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
  attempt_count: number | null;
  last_attempt_at: number | null;
  next_retry_at: number | null;
  processing_started_at: number | null;
  dead_lettered_at: number | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  idempotency_key: string | null;
  lease_owner: string | null;
  lease_expires_at: number | null;
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
    attemptCount: typeof data.attemptCount === 'number' ? data.attemptCount : undefined,
    lastAttemptAt: typeof data.lastAttemptAt === 'number' ? data.lastAttemptAt : undefined,
    nextRetryAt: typeof data.nextRetryAt === 'number' ? data.nextRetryAt : undefined,
    processingStartedAt: typeof data.processingStartedAt === 'number' ? data.processingStartedAt : undefined,
    deadLetteredAt: typeof data.deadLetteredAt === 'number' ? data.deadLetteredAt : undefined,
    createdAt,
    updatedAt,
    expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : undefined,
    idempotencyKey: typeof data.idempotencyKey === 'string' ? data.idempotencyKey : undefined,
    leaseOwner: typeof data.leaseOwner === 'string' ? data.leaseOwner : undefined,
    leaseExpiresAt: typeof data.leaseExpiresAt === 'number' ? data.leaseExpiresAt : undefined,
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    productId: typeof data.productId === 'string' ? data.productId : undefined,
  };
}

function toTryOnJobRecordFromRow(row: PostgresTryOnJobRow): TryOnJobRecord | null {
  if (!isTryOnJobStatus(row.status)) {
    return null;
  }

  const normalizeNumber = (value: number | bigint | null): number | undefined => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    return undefined;
  };

  return {
    jobId: row.job_id,
    status: row.status,
    provider: row.provider ?? undefined,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    processingTime: normalizeNumber(row.processing_time),
    resultImage: row.result_image ?? undefined,
    resultImageGcsUri: row.result_image_gcs_uri ?? undefined,
    resultVideo: row.result_video ?? undefined,
    resultVideoGcsUri: row.result_video_gcs_uri ?? undefined,
    personImageGcsUri: row.person_image_gcs_uri ?? undefined,
    garmentImageGcsUri: row.garment_image_gcs_uri ?? undefined,
    personImageUrl: row.person_image_url ?? undefined,
    garmentImageUrl: row.garment_image_url ?? undefined,
    wantsVideo: row.wants_video ?? undefined,
    videoDurationSeconds: normalizeNumber(row.video_duration_seconds),
    attemptCount: normalizeNumber(row.attempt_count),
    lastAttemptAt: normalizeNumber(row.last_attempt_at),
    nextRetryAt: normalizeNumber(row.next_retry_at),
    processingStartedAt: normalizeNumber(row.processing_started_at),
    deadLetteredAt: normalizeNumber(row.dead_lettered_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    expiresAt: normalizeNumber(row.expires_at),
    idempotencyKey: row.idempotency_key ?? undefined,
    leaseOwner: row.lease_owner ?? undefined,
    leaseExpiresAt: normalizeNumber(row.lease_expires_at),
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
      attempt_count INTEGER,
      last_attempt_at BIGINT,
      next_retry_at BIGINT,
      processing_started_at BIGINT,
      dead_lettered_at BIGINT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      expires_at BIGINT,
      idempotency_key TEXT,
      lease_owner TEXT,
      lease_expires_at BIGINT,
      user_id TEXT,
      product_id TEXT
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE virtual_tryon_jobs
    ADD COLUMN IF NOT EXISTS attempt_count INTEGER,
    ADD COLUMN IF NOT EXISTS last_attempt_at BIGINT,
    ADD COLUMN IF NOT EXISTS next_retry_at BIGINT,
    ADD COLUMN IF NOT EXISTS processing_started_at BIGINT,
    ADD COLUMN IF NOT EXISTS dead_lettered_at BIGINT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_tryon_jobs_status_updated
    ON virtual_tryon_jobs (status, updated_at DESC);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_tryon_jobs_retry
    ON virtual_tryon_jobs (next_retry_at, status);
  `);

  postgresReady = true;
}

export function isTryOnJobStoreEnabled(): boolean {
  return Boolean(getTryOnJobStore());
}

export function getTryOnJobMaxAttempts(): number {
  return TRYON_JOB_MAX_ATTEMPTS > 0 ? TRYON_JOB_MAX_ATTEMPTS : 3;
}

export async function createTryOnJob(input: CreateTryOnJobInput): Promise<TryOnJobRecord | null> {
  const now = Date.now();
  const jobId = input.jobId ?? randomUUID();
  const expiresAt = input.expiresAt ?? now + TRYON_JOB_TTL_SECONDS * 1000;
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
    attemptCount: input.attemptCount ?? 0,
    lastAttemptAt: input.lastAttemptAt,
    nextRetryAt: input.nextRetryAt,
    processingStartedAt: input.processingStartedAt,
    deadLetteredAt: input.deadLetteredAt,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    idempotencyKey: input.idempotencyKey,
    leaseOwner: input.leaseOwner,
    leaseExpiresAt: input.leaseExpiresAt,
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
        wants_video, video_duration_seconds, attempt_count, last_attempt_at,
        next_retry_at, processing_started_at, dead_lettered_at, created_at, updated_at,
        expires_at, idempotency_key, lease_owner, lease_expires_at,
        user_id, product_id
      ) VALUES (
        ${record.jobId}, ${record.status}, ${record.provider}, ${record.errorCode}, ${record.errorMessage}, ${record.processingTime},
        ${record.resultImage}, ${record.resultImageGcsUri}, ${record.resultVideo}, ${record.resultVideoGcsUri},
        ${record.personImageGcsUri}, ${record.garmentImageGcsUri}, ${record.personImageUrl}, ${record.garmentImageUrl},
        ${record.wantsVideo}, ${record.videoDurationSeconds}, ${record.attemptCount}, ${record.lastAttemptAt},
        ${record.nextRetryAt}, ${record.processingStartedAt}, ${record.deadLetteredAt}, ${record.createdAt}, ${record.updatedAt},
        ${record.expiresAt}, ${record.idempotencyKey}, ${record.leaseOwner}, ${record.leaseExpiresAt},
        ${record.userId}, ${record.productId}
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
        attempt_count = EXCLUDED.attempt_count,
        last_attempt_at = EXCLUDED.last_attempt_at,
        next_retry_at = EXCLUDED.next_retry_at,
        processing_started_at = EXCLUDED.processing_started_at,
        dead_lettered_at = EXCLUDED.dead_lettered_at,
        updated_at = EXCLUDED.updated_at,
        expires_at = EXCLUDED.expires_at,
        idempotency_key = EXCLUDED.idempotency_key,
        lease_owner = EXCLUDED.lease_owner,
        lease_expires_at = EXCLUDED.lease_expires_at,
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
      attemptCount: patch.attemptCount ?? existing?.attemptCount ?? 0,
      lastAttemptAt: patch.lastAttemptAt ?? existing?.lastAttemptAt,
      nextRetryAt: patch.nextRetryAt ?? existing?.nextRetryAt,
      processingStartedAt: patch.processingStartedAt ?? existing?.processingStartedAt,
      deadLetteredAt: patch.deadLetteredAt ?? existing?.deadLetteredAt,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      expiresAt: patch.expiresAt ?? existing?.expiresAt,
      idempotencyKey: patch.idempotencyKey ?? existing?.idempotencyKey,
      leaseOwner: patch.leaseOwner ?? existing?.leaseOwner,
      leaseExpiresAt: patch.leaseExpiresAt ?? existing?.leaseExpiresAt,
      userId: patch.userId ?? existing?.userId,
      productId: patch.productId ?? existing?.productId,
    };

    await prisma.$executeRaw`
      INSERT INTO virtual_tryon_jobs (
        job_id, status, provider, error_code, error_message, processing_time,
        result_image, result_image_gcs_uri, result_video, result_video_gcs_uri,
        person_image_gcs_uri, garment_image_gcs_uri, person_image_url, garment_image_url,
        wants_video, video_duration_seconds, attempt_count, last_attempt_at,
        next_retry_at, processing_started_at, dead_lettered_at, created_at, updated_at,
        expires_at, idempotency_key, lease_owner, lease_expires_at,
        user_id, product_id
      ) VALUES (
        ${merged.jobId}, ${merged.status}, ${merged.provider}, ${merged.errorCode}, ${merged.errorMessage}, ${merged.processingTime},
        ${merged.resultImage}, ${merged.resultImageGcsUri}, ${merged.resultVideo}, ${merged.resultVideoGcsUri},
        ${merged.personImageGcsUri}, ${merged.garmentImageGcsUri}, ${merged.personImageUrl}, ${merged.garmentImageUrl},
        ${merged.wantsVideo}, ${merged.videoDurationSeconds}, ${merged.attemptCount}, ${merged.lastAttemptAt},
        ${merged.nextRetryAt}, ${merged.processingStartedAt}, ${merged.deadLetteredAt}, ${merged.createdAt}, ${merged.updatedAt},
        ${merged.expiresAt}, ${merged.idempotencyKey}, ${merged.leaseOwner}, ${merged.leaseExpiresAt},
        ${merged.userId}, ${merged.productId}
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
        attempt_count = EXCLUDED.attempt_count,
        last_attempt_at = EXCLUDED.last_attempt_at,
        next_retry_at = EXCLUDED.next_retry_at,
        processing_started_at = EXCLUDED.processing_started_at,
        dead_lettered_at = EXCLUDED.dead_lettered_at,
        updated_at = EXCLUDED.updated_at,
        expires_at = EXCLUDED.expires_at,
        idempotency_key = EXCLUDED.idempotency_key,
        lease_owner = EXCLUDED.lease_owner,
        lease_expires_at = EXCLUDED.lease_expires_at,
        user_id = EXCLUDED.user_id,
        product_id = EXCLUDED.product_id
    `;
    return true;
  }

  return false;
}

function isJobExpired(record: TryOnJobRecord, now: number): boolean {
  return Boolean(record.expiresAt && record.expiresAt > 0 && now > record.expiresAt);
}

export async function markTryOnJobExpired(jobId: string, message?: string): Promise<boolean> {
  const store = getTryOnJobStore();
  if (!store) return false;
  const payload = {
    status: 'expired' as TryOnJobStatus,
    errorMessage: message ?? 'Job đã hết hạn',
    updatedAt: Date.now(),
  };

  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) return false;
    await firestore.collection(TRYON_JOB_COLLECTION).doc(jobId).set(payload, { merge: true });
    return true;
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    await prisma.$executeRaw`
      UPDATE virtual_tryon_jobs
      SET status = ${payload.status}, error_message = ${payload.errorMessage}, updated_at = ${payload.updatedAt}
      WHERE job_id = ${jobId}
    `;
    return true;
  }

  return false;
}

export async function markTryOnJobRetryScheduled(jobId: string, options: {
  nextRetryAt: number;
  attemptCount: number;
  errorMessage?: string;
  errorCode?: string;
}): Promise<boolean> {
  return updateTryOnJob(jobId, {
    status: 'queued',
    nextRetryAt: options.nextRetryAt,
    attemptCount: options.attemptCount,
    lastAttemptAt: Date.now(),
    errorMessage: options.errorMessage,
    errorCode: options.errorCode,
  });
}

export async function markTryOnJobDeadLetter(jobId: string, options: {
  errorMessage: string;
  errorCode?: string;
}): Promise<boolean> {
  return updateTryOnJob(jobId, {
    status: 'failed',
    errorMessage: options.errorMessage,
    errorCode: options.errorCode || 'DEAD_LETTER',
    deadLetteredAt: Date.now(),
  });
}

export async function claimNextQueuedJobs(limit: number, now = Date.now()): Promise<TryOnJobRecord[]> {
  const store = getTryOnJobStore();
  if (!store) return [];
  const safeLimit = Math.max(1, Math.min(limit, 50));

  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) return [];
    const snapshot = await firestore
      .collection(TRYON_JOB_COLLECTION)
      .where('status', '==', 'queued')
      .orderBy('createdAt', 'asc')
      .limit(safeLimit)
      .get();
    const results: TryOnJobRecord[] = [];
    snapshot.docs.forEach((doc) => {
      const record = toTryOnJobRecord(doc.id, doc.data());
      if (!record) return;
      if (record.nextRetryAt && record.nextRetryAt > now) return;
      results.push(record);
    });
    return results;
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    const rows = await prisma.$queryRaw<PostgresTryOnJobRow[]>`
      SELECT * FROM virtual_tryon_jobs
      WHERE status = 'queued'
        AND (next_retry_at IS NULL OR next_retry_at <= ${now})
      ORDER BY created_at ASC
      LIMIT ${safeLimit}
    `;
    return rows
      .map((row) => toTryOnJobRecordFromRow(row))
      .filter((record): record is TryOnJobRecord => Boolean(record));
  }

  return [];
}

export async function getTryOnJobByIdempotencyKey(
  idempotencyKey: string
): Promise<TryOnJobRecord | null> {
  const store = getTryOnJobStore();
  if (!store) return null;

  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) return null;
    const snapshot = await firestore
      .collection(TRYON_JOB_COLLECTION)
      .where('idempotencyKey', '==', idempotencyKey)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return toTryOnJobRecord(doc.id, doc.data());
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    const rows = await prisma.$queryRaw<PostgresTryOnJobRow[]>`
      SELECT * FROM virtual_tryon_jobs WHERE idempotency_key = ${idempotencyKey} LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return toTryOnJobRecordFromRow(row);
  }

  return null;
}

export async function acquireTryOnJobLease(jobId: string, owner: string): Promise<boolean> {
  const store = getTryOnJobStore();
  if (!store) return false;
  const now = Date.now();
  const leaseExpiresAt = now + TRYON_JOB_LEASE_SECONDS * 1000;

  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) return false;
    const ref = firestore.collection(TRYON_JOB_COLLECTION).doc(jobId);
    return firestore.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return false;
      const data = snapshot.data();
      const currentLease = typeof data?.leaseExpiresAt === 'number' ? data.leaseExpiresAt : 0;
      if (currentLease && currentLease > now) {
        return false;
      }
      tx.set(ref, { leaseOwner: owner, leaseExpiresAt }, { merge: true });
      return true;
    });
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    const updated = await prisma.$executeRaw`
      UPDATE virtual_tryon_jobs
      SET lease_owner = ${owner}, lease_expires_at = ${leaseExpiresAt}
      WHERE job_id = ${jobId} AND (lease_expires_at IS NULL OR lease_expires_at < ${now})
    `;
    return Number(updated) > 0;
  }

  return false;
}

export async function releaseTryOnJobLease(jobId: string, owner: string): Promise<boolean> {
  const store = getTryOnJobStore();
  if (!store) return false;

  if (store === 'firestore') {
    const firestore = getFirestore();
    if (!firestore) return false;
    await firestore.collection(TRYON_JOB_COLLECTION).doc(jobId).set(
      { leaseOwner: null, leaseExpiresAt: null, updatedAt: Date.now() },
      { merge: true }
    );
    return true;
  }

  if (store === 'postgres') {
    await ensurePostgresSchema();
    await prisma.$executeRaw`
      UPDATE virtual_tryon_jobs
      SET lease_owner = NULL, lease_expires_at = NULL, updated_at = ${Date.now()}
      WHERE job_id = ${jobId} AND (lease_owner = ${owner} OR lease_owner IS NULL)
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

    const record = toTryOnJobRecord(snapshot.id, snapshot.data());
    if (record && isJobExpired(record, Date.now()) && record.status !== 'completed' && record.status !== 'failed') {
      await markTryOnJobExpired(record.jobId);
      return { ...record, status: 'expired' };
    }
    return record;
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
    const record = toTryOnJobRecordFromRow(row);
    if (record && isJobExpired(record, Date.now()) && record.status !== 'completed' && record.status !== 'failed') {
      await markTryOnJobExpired(record.jobId);
      return { ...record, status: 'expired' };
    }
    return record;
  }

  return null;
}

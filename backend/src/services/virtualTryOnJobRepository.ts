import { Firestore, type DocumentData } from '@google-cloud/firestore';
import { randomUUID } from 'crypto';

const FIRESTORE_PROJECT_ID = process.env.FIRESTORE_PROJECT_ID
  || process.env.GCP_PROJECT_ID
  || process.env.GOOGLE_CLOUD_PROJECT
  || '';
const FIRESTORE_CLIENT_EMAIL = process.env.FIRESTORE_CLIENT_EMAIL || process.env.GCS_CLIENT_EMAIL || '';
const FIRESTORE_PRIVATE_KEY = process.env.FIRESTORE_PRIVATE_KEY || process.env.GCS_PRIVATE_KEY || '';
const TRYON_JOB_COLLECTION = process.env.TRYON_JOB_COLLECTION || 'virtual_tryon_jobs';

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
  userId?: string;
  productId?: string;
}

let firestoreClient: Firestore | null = null;

function isFirestoreConfigured(): boolean {
  return Boolean(FIRESTORE_PROJECT_ID || (FIRESTORE_CLIENT_EMAIL && FIRESTORE_PRIVATE_KEY));
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
    createdAt,
    updatedAt,
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    productId: typeof data.productId === 'string' ? data.productId : undefined,
  };
}

export function isTryOnJobStoreEnabled(): boolean {
  return Boolean(getFirestore());
}

export async function createTryOnJob(input: CreateTryOnJobInput): Promise<TryOnJobRecord | null> {
  const firestore = getFirestore();
  if (!firestore) {
    return null;
  }

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
    createdAt: now,
    updatedAt: now,
    userId: input.userId,
    productId: input.productId,
  };

  await firestore.collection(TRYON_JOB_COLLECTION).doc(jobId).set(record, { merge: true });
  return record;
}

export async function updateTryOnJob(jobId: string, patch: Partial<TryOnJobRecord>): Promise<boolean> {
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

export async function getTryOnJob(jobId: string): Promise<TryOnJobRecord | null> {
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

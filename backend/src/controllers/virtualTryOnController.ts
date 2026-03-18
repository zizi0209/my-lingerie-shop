import { Request, Response } from 'express';
import { getTryOnHealthSnapshot } from '../config/tryOnConfig';
import {
  acquireTryOnJobLease,
  createTryOnJob,
  getTryOnJobMaxAttempts,
  getTryOnJobByIdempotencyKey,
  markTryOnJobDeadLetter,
  markTryOnJobRetryScheduled,
  updateTryOnJob,
  getTryOnJob,
  releaseTryOnJobLease,
  isTryOnJobStoreEnabled,
} from '../services/virtualTryOnJobRepository';
import {
  createTryOnUploadSignedUrl,
  deleteTryOnAsset,
  getSignedReadUrlForGcsUri,
  getTryOnStorageProvider,
  isGcsUri,
} from '../services/virtualTryOnStorage';
import {
  checkVertexTryOnReadiness,
  generateVeoVideoFromImage,
  processVertexTryOnFromGcs,
  processVertexTryOnFromUrl,
  storeTryOnResult,
  VertexApiError,
} from '../services/vertexTryOnService';
import { createHash, randomUUID } from 'crypto';

const QUEUE_ESTIMATE_MS = Number(process.env.TRYON_QUEUE_ESTIMATE_MS || '120000');
const PROCESS_ESTIMATE_MS = Number(process.env.TRYON_PROCESS_ESTIMATE_MS || '120000');
const TRYON_JOB_RETRY_BASE_SECONDS = Number(process.env.TRYON_JOB_RETRY_BASE_SECONDS || '30');
const TRYON_JOB_RETRY_MAX_SECONDS = Number(process.env.TRYON_JOB_RETRY_MAX_SECONDS || '300');
const TRYON_MAX_VIDEO_DURATION_SECONDS = Number(process.env.TRYON_MAX_VIDEO_DURATION_SECONDS || '10');
const TRYON_FAIL_FAST_MS = Number(process.env.TRYON_FAIL_FAST_MS || '90000');
const TRYON_STRICT_FAIL_FAST = process.env.TRYON_STRICT_FAIL_FAST !== 'false';
const VERTEX_TRYON_MODEL_ID = process.env.VERTEX_TRYON_MODEL_ID || 'virtual-try-on-001';
const TRYON_WORKER_WEBHOOK_URL = process.env.TRYON_WORKER_WEBHOOK_URL || '';
const TRYON_WORKER_TOKEN = process.env.TRYON_WORKER_TOKEN;
const TRYON_METRICS_TOKEN = process.env.TRYON_METRICS_TOKEN;
const TRYON_PROCESS_MAX_CONCURRENCY_RAW = process.env.TRYON_PROCESS_MAX_CONCURRENCY;
const TRYON_LOCAL_INLINE_PROCESS = process.env.TRYON_LOCAL_INLINE_PROCESS === 'true';

const INVALID_TRYON_HOSTS = new Set([
  'via.placeholder.com',
  'placeholder.com',
]);

let activeTryOnProcesses = 0;

function resolveTryOnProcessLimit(): number {
  const fallback = process.env.NODE_ENV === 'development' ? '1' : '0';
  const raw = TRYON_PROCESS_MAX_CONCURRENCY_RAW ?? fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function tryAcquireTryOnProcessSlot(): boolean {
  const limit = resolveTryOnProcessLimit();
  if (limit <= 0) return true;
  if (activeTryOnProcesses >= limit) return false;
  activeTryOnProcesses += 1;
  return true;
}

function releaseTryOnProcessSlot(): void {
  if (activeTryOnProcesses > 0) {
    activeTryOnProcesses -= 1;
  }
}

function logTryOnTelemetry(event: Record<string, unknown>): void {
  console.log('[TryOn][Telemetry]', JSON.stringify({
    timestamp: Date.now(),
    ...event,
  }));
}

function shouldInlineTryOnProcessing(): boolean {
  return TRYON_LOCAL_INLINE_PROCESS || process.env.NODE_ENV === 'development';
}

function isConfigFailure(errorCode?: string, message?: string): boolean {
  if (errorCode === 'TRYON_CLOUD_NOT_READY') return true;
  if (errorCode === 'VERTEX_SAFETY_BLOCKED') return false;
  if (errorCode && errorCode.startsWith('VERTEX_')) return true;
  const normalized = (message || '').toLowerCase();
  return normalized.includes('config')
    || normalized.includes('cấu hình')
    || normalized.includes('thiếu')
    || normalized.includes('permission')
    || normalized.includes('unauthenticated')
    || normalized.includes('not found')
    || normalized.includes('vertex')
    || normalized.includes('not configured');
}

function deriveJobApiStatus(job: Awaited<ReturnType<typeof getTryOnJob>>) {
  if (!job) return null;
  const now = Date.now();
  const maxAttempts = getTryOnJobMaxAttempts();
  let status: typeof job.status | 'retry_scheduled' | 'dead_letter' | 'failed_config' | 'failed_provider' = job.status;
  let retryable = false;
  let errorStage: 'config' | 'provider' | 'retry' | 'system' | undefined;
  let statusReason: string | undefined;
  const providerHint = job.provider || 'Vertex-AI';

  if (status === 'queued' && job.nextRetryAt && job.nextRetryAt > now) {
    status = 'retry_scheduled';
    retryable = true;
    errorStage = 'retry';
    statusReason = 'Job đang chờ retry';
  } else if (status === 'failed') {
    if (job.deadLetteredAt) {
      status = 'dead_letter';
      errorStage = 'provider';
      statusReason = 'Job đã vào dead-letter';
    } else if (isConfigFailure(job.errorCode, job.errorMessage)) {
      status = 'failed_config';
      errorStage = 'config';
      statusReason = 'Thiếu hoặc sai cấu hình cloud';
    } else {
      status = 'failed_provider';
      errorStage = 'provider';
      statusReason = 'Lỗi xử lý từ provider';
    }
  }

  return {
    status,
    retryable,
    errorStage,
    statusReason,
    providerHint,
    maxAttempts,
  };
}

function buildJobStatusPayload(job: Awaited<ReturnType<typeof getTryOnJob>>) {
  if (!job) return null;
  const derived = deriveJobApiStatus(job);
  const etaMs = job.status === 'queued'
    ? QUEUE_ESTIMATE_MS
    : job.status === 'processing'
      ? PROCESS_ESTIMATE_MS
      : undefined;
  const now = Date.now();
  const processingStartedAt = job.processingStartedAt || (job.status === 'processing' ? job.updatedAt : undefined);
  const queuedDurationMs = job.status === 'queued'
    ? now - job.createdAt
    : processingStartedAt
      ? processingStartedAt - job.createdAt
      : undefined;
  const processingDurationMs = typeof job.processingTime === 'number'
    ? job.processingTime
    : job.status === 'processing' && processingStartedAt
      ? now - processingStartedAt
      : undefined;
  return {
    ...job,
    status: derived?.status ?? job.status,
    retryable: derived?.retryable ?? false,
    maxAttempts: derived?.maxAttempts,
    errorStage: derived?.errorStage,
    statusReason: derived?.statusReason,
    providerHint: derived?.providerHint,
    etaMs,
    queuedDurationMs,
    processingDurationMs,
  };
}

function buildIdempotencyKey(params: {
  personImageGcsUri?: string;
  garmentImageGcsUri?: string;
  personImageUrl?: string;
  garmentImageUrl?: string;
  wantsVideo?: boolean;
  videoDurationSeconds?: number;
  productId?: string;
}): string {
  const payload = [
    params.personImageGcsUri || params.personImageUrl || '',
    params.garmentImageGcsUri || params.garmentImageUrl || '',
    params.productId || '',
    params.wantsVideo ? '1' : '0',
    params.videoDurationSeconds?.toString() || '',
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

async function cleanupTryOnInputs(job: {
  personImageGcsUri?: string;
  garmentImageGcsUri?: string;
  personImageUrl?: string;
  garmentImageUrl?: string;
}): Promise<void> {
  const targets = [
    { gcsUri: job.personImageGcsUri, url: job.personImageUrl },
    { gcsUri: job.garmentImageGcsUri, url: job.garmentImageUrl },
  ];
  await Promise.all(
    targets.map(async (target) => {
      if (!target.gcsUri && !target.url) return;
      await deleteTryOnAsset({ gcsUri: target.gcsUri, url: target.url });
    })
  );
}

function computeNextRetryAt(attempt: number): number {
  const base = Math.max(5, TRYON_JOB_RETRY_BASE_SECONDS);
  const max = Math.max(base, TRYON_JOB_RETRY_MAX_SECONDS);
  const delaySeconds = Math.min(max, base * Math.pow(2, Math.max(0, attempt - 1)));
  const jitter = Math.random() * 5;
  return Date.now() + Math.round((delaySeconds + jitter) * 1000);
}

function isRetryableJobError(message: string, errorCode?: string): boolean {
  if (TRYON_STRICT_FAIL_FAST) return false;
  if (errorCode) {
    if (errorCode === 'VERTEX_UNAVAILABLE') return true;
    if (errorCode === 'VERTEX_SAFETY_BLOCKED') return false;
    if (errorCode.startsWith('VERTEX_')) return false;
  }
  const normalized = message.toLowerCase();
  if (normalized.includes('thiếu') || normalized.includes('invalid') || normalized.includes('không hợp lệ')) {
    return false;
  }
  if (normalized.includes('expired') || normalized.includes('hết hạn')) {
    return false;
  }
  return true;
}

function isValidExternalImageUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.toLowerCase().startsWith('data:')) return false;
  try {
    const parsed = new URL(trimmed);
    const isHttp = parsed.protocol === 'http:';
    const isHttps = parsed.protocol === 'https:';
    if (!isHttp && !isHttps) return false;
    if (process.env.NODE_ENV === 'production' && !isHttps) return false;
    if (INVALID_TRYON_HOSTS.has(parsed.hostname.toLowerCase())) return false;
    if (process.env.NODE_ENV === 'production' && parsed.pathname.toLowerCase().includes('/images/seed/')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function resolveFailFastElapsedMs(job: Awaited<ReturnType<typeof getTryOnJob>>, now: number): number | null {
  if (!job) return null;
  if (job.status === 'queued') {
    return now - job.createdAt;
  }
  if (job.status === 'processing') {
    const startedAt = job.processingStartedAt || job.updatedAt;
    return now - startedAt;
  }
  return null;
}

async function enforceFailFast(job: Awaited<ReturnType<typeof getTryOnJob>>): Promise<Awaited<ReturnType<typeof getTryOnJob>>> {
  if (!job || !TRYON_STRICT_FAIL_FAST) return job;
  const now = Date.now();
  const elapsed = resolveFailFastElapsedMs(job, now);
  if (elapsed === null || elapsed <= TRYON_FAIL_FAST_MS) {
    return job;
  }

  const message = `Quá thời gian chờ ${Math.round(TRYON_FAIL_FAST_MS / 1000)}s`;
  await markTryOnJobDeadLetter(job.jobId, {
    errorMessage: message,
    errorCode: 'PROVIDER_TIMEOUT',
    modelName: VERTEX_TRYON_MODEL_ID,
    latencyMs: elapsed,
  });
  logTryOnTelemetry({
    event: 'job_fail_fast_timeout',
    jobId: job.jobId,
    elapsedMs: elapsed,
    status: job.status,
  });
  return getTryOnJob(job.jobId);
}

async function enqueueTryOnJob(jobId: string, baseUrl?: string): Promise<void> {
  const targetBaseUrl = TRYON_WORKER_WEBHOOK_URL || baseUrl;
  if (!targetBaseUrl) {
    return;
  }

  const endpoint = targetBaseUrl.replace(/\/$/, '') + `/virtual-tryon/jobs/${jobId}/process`;
  const headers = TRYON_WORKER_TOKEN ? { 'x-worker-token': TRYON_WORKER_TOKEN } : undefined;

  void fetch(endpoint, {
    method: 'POST',
    headers,
  }).then(() => {
    logTryOnTelemetry({
      event: 'job_webhook_enqueued',
      jobId,
      targetBaseUrl,
    });
  }).catch((error) => {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.warn('[TryOn][Worker] Enqueue thất bại:', message);
    logTryOnTelemetry({
      event: 'job_enqueue_failed',
      jobId,
      error: message,
      targetBaseUrl,
    });
  });
}

async function processTryOnJobInternal(jobId: string): Promise<{ status: number; payload: Record<string, unknown> }> {
  let jobRecord: Awaited<ReturnType<typeof getTryOnJob>> | null = null;
  let attemptCount = 0;
  let leaseOwner: string | null = null;
  let leaseAcquired = false;
  let shouldCleanup = false;
  let concurrencyAcquired = false;
  let processingStartedAt: number | undefined;
  try {
    if (!isTryOnJobStoreEnabled()) {
      return {
        status: 501,
        payload: {
          success: false,
          error: 'Try-on job tracking is not configured',
        },
      };
    }

    if (!tryAcquireTryOnProcessSlot()) {
      return {
        status: 429,
        payload: {
          success: false,
          error: 'Worker đang bận, vui lòng thử lại sau',
        },
      };
    }
    concurrencyAcquired = true;

    const job = await getTryOnJob(jobId);
    jobRecord = await enforceFailFast(job);
    if (!jobRecord) {
      return {
        status: 404,
        payload: {
          success: false,
          error: 'Job not found',
        },
      };
    }

    if (jobRecord.status === 'expired') {
      return {
        status: 410,
        payload: {
          success: false,
          error: jobRecord.errorMessage || 'Job đã hết hạn',
        },
      };
    }

    if (jobRecord.status === 'failed' && jobRecord.errorCode === 'PROVIDER_TIMEOUT') {
      return {
        status: 408,
        payload: {
          success: false,
          error: jobRecord.errorMessage || 'Quá thời gian chờ xử lý',
          errorCode: 'PROVIDER_TIMEOUT',
        },
      };
    }

    if (jobRecord.status === 'completed') {
      return {
        status: 200,
        payload: {
          success: true,
          data: {
            jobId,
            resultImage: jobRecord.resultImage,
            resultImageGcsUri: jobRecord.resultImageGcsUri,
            resultVideo: jobRecord.resultVideo,
            resultVideoGcsUri: jobRecord.resultVideoGcsUri,
            processingTime: jobRecord.processingTime,
          },
        },
      };
    }

    const health = getTryOnHealthSnapshot();
    if (!health.available) {
      const message = `Google Cloud chưa sẵn sàng: ${health.reasons.join(', ') || 'Thiếu cấu hình'}`;
      await markTryOnJobDeadLetter(jobId, {
        errorMessage: message,
        errorCode: 'TRYON_CLOUD_NOT_READY',
        modelName: VERTEX_TRYON_MODEL_ID,
      });
      return {
        status: 503,
        payload: {
          success: false,
          error: message,
          errorCode: 'TRYON_CLOUD_NOT_READY',
          data: { reasons: health.reasons },
        },
      };
    }

    const readiness = await checkVertexTryOnReadiness();
    if (!readiness.available) {
      const message = readiness.errorMessage || 'Google Cloud chưa sẵn sàng cho VTON';
      const errorCode = readiness.errorCode || 'TRYON_CLOUD_NOT_READY';
      await markTryOnJobDeadLetter(jobId, {
        errorMessage: message,
        errorCode,
        modelName: VERTEX_TRYON_MODEL_ID,
      });
      return {
        status: 503,
        payload: {
          success: false,
          error: message,
          errorCode,
        },
      };
    }

    if (!jobRecord.personImageGcsUri && !jobRecord.personImageUrl) {
      return {
        status: 422,
        payload: {
          success: false,
          error: 'Thiếu dữ liệu ảnh người trong job',
        },
      };
    }

    if (!jobRecord.garmentImageGcsUri && !jobRecord.garmentImageUrl) {
      return {
        status: 422,
        payload: {
          success: false,
          error: 'Thiếu dữ liệu ảnh sản phẩm trong job',
        },
      };
    }

    if (jobRecord.status === 'processing') {
      return {
        status: 409,
        payload: {
          success: false,
          error: 'Job đang xử lý',
        },
      };
    }

    if (jobRecord.nextRetryAt && jobRecord.nextRetryAt > Date.now()) {
      return {
        status: 409,
        payload: {
          success: false,
          error: 'Job đang chờ retry',
          data: { nextRetryAt: jobRecord.nextRetryAt },
        },
      };
    }

    leaseOwner = randomUUID();
    leaseAcquired = await acquireTryOnJobLease(jobId, leaseOwner);
    if (!leaseAcquired) {
      return {
        status: 409,
        payload: {
          success: false,
          error: 'Job đang được worker khác xử lý',
        },
      };
    }

    attemptCount = (jobRecord.attemptCount ?? 0) + 1;
    processingStartedAt = Date.now();
    await updateTryOnJob(jobId, {
      status: 'processing',
      provider: 'vertex-ai-tryon',
      attemptCount,
      lastAttemptAt: processingStartedAt,
      nextRetryAt: undefined,
      processingStartedAt,
    });

    logTryOnTelemetry({
      event: 'job_processing_start',
      jobId,
      attemptCount,
      provider: 'vertex-ai-tryon',
    });

    shouldCleanup = false;

    const startTime = Date.now();
    const tryOnResult = jobRecord.personImageGcsUri && jobRecord.garmentImageGcsUri
      ? await processVertexTryOnFromGcs({
        personImageGcsUri: jobRecord.personImageGcsUri,
        garmentImageGcsUri: jobRecord.garmentImageGcsUri,
      })
      : await processVertexTryOnFromUrl({
        personImageUrl: jobRecord.personImageUrl || '',
        garmentImageUrl: jobRecord.garmentImageUrl || '',
      });

    const storedImage = await storeTryOnResult({
      base64Image: tryOnResult.base64Image,
      mimeType: tryOnResult.mimeType,
    });

    let resultVideoGcsUri: string | undefined;
    let resultVideoSignedUrl: string | undefined;

    const storageProvider = getTryOnStorageProvider();
    const devVideoEnabled = process.env.TRYON_DEV_ENABLE_VIDEO === 'true';
    const localVideoDisabled = process.env.NODE_ENV === 'development' && !devVideoEnabled;
    const videoDisabled = localVideoDisabled
      || process.env.FREE_MODE_DISABLE_VIDEO === 'true'
      || storageProvider !== 'gcs';

    if (jobRecord.wantsVideo) {
      if (videoDisabled) {
        throw new Error('Video yêu cầu GCS và bật cấu hình video');
      }

      const veoResult = await generateVeoVideoFromImage({
        imageGcsUri: storedImage.storageUri || '',
        durationSeconds: jobRecord.videoDurationSeconds,
        mimeType: tryOnResult.mimeType,
      });
      resultVideoGcsUri = veoResult.gcsUri;
      resultVideoSignedUrl = await getSignedReadUrlForGcsUri(veoResult.gcsUri);
    }

    const processingTime = Date.now() - startTime;

    await updateTryOnJob(jobId, {
      status: 'completed',
      provider: 'vertex-ai-tryon',
      modelName: VERTEX_TRYON_MODEL_ID,
      latencyMs: processingTime,
      processingTime,
      resultImage: storedImage.signedUrl,
      resultImageGcsUri: storedImage.storageUri,
      resultVideo: resultVideoSignedUrl,
      resultVideoGcsUri,
      processingStartedAt,
    });

    logTryOnTelemetry({
      event: 'job_completed',
      jobId,
      provider: 'vertex-ai-tryon',
      modelName: VERTEX_TRYON_MODEL_ID,
      latencyMs: processingTime,
      wantsVideo: Boolean(jobRecord.wantsVideo),
      videoDisabled,
      localVideoDisabled,
    });

    shouldCleanup = true;

    return {
      status: 200,
      payload: {
        success: true,
        data: {
          jobId,
          resultImage: storedImage.signedUrl,
          resultImageGcsUri: storedImage.storageUri,
          resultVideo: resultVideoSignedUrl,
          resultVideoGcsUri,
          processingTime,
        },
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    const vertexErrorCode = error instanceof VertexApiError ? error.code : undefined;
    const supportCode = error instanceof VertexApiError ? error.supportCode : undefined;
    if (vertexErrorCode === 'VERTEX_SAFETY_BLOCKED' && jobId && jobRecord) {
      const personImageSource = jobRecord.personImageGcsUri
        ? 'gcs'
        : jobRecord.personImageUrl
          ? 'url'
          : 'unknown';
      const garmentImageSource = jobRecord.garmentImageGcsUri
        ? 'gcs'
        : jobRecord.garmentImageUrl
          ? 'url'
          : 'unknown';
      logTryOnTelemetry({
        event: 'job_safety_blocked',
        jobId,
        provider: 'vertex-ai-tryon',
        modelName: VERTEX_TRYON_MODEL_ID,
        productId: jobRecord.productId,
        userId: jobRecord.userId,
        personImageSource,
        garmentImageSource,
        supportCode,
      });
    }
    let retryAt: number | null = null;
    if (jobId && jobRecord) {
      const latencyMs = processingStartedAt ? Date.now() - processingStartedAt : undefined;
      const currentAttempt = attemptCount || jobRecord.attemptCount || 0;
      const maxAttempts = getTryOnJobMaxAttempts();
      const canRetry = isRetryableJobError(message, vertexErrorCode) && currentAttempt < maxAttempts;
      const configFailure = isConfigFailure(vertexErrorCode || jobRecord.errorCode, message);
      const resolvedErrorCode = vertexErrorCode || (configFailure ? 'TRYON_CLOUD_NOT_READY' : 'PROVIDER_UNAVAILABLE');

      if (canRetry) {
        const nextRetryAt = computeNextRetryAt(currentAttempt + 1);
        retryAt = nextRetryAt;
        await markTryOnJobRetryScheduled(jobId, {
          nextRetryAt,
          attemptCount: currentAttempt + 1,
          errorMessage: message,
          errorCode: 'RETRY_SCHEDULED',
          modelName: VERTEX_TRYON_MODEL_ID,
          latencyMs,
        });
      } else {
        await markTryOnJobDeadLetter(jobId, {
          errorMessage: message,
          errorCode: resolvedErrorCode,
          modelName: VERTEX_TRYON_MODEL_ID,
          latencyMs,
        });
        shouldCleanup = true;
      }

      logTryOnTelemetry({
        event: canRetry ? 'job_retry_scheduled' : 'job_failed',
        jobId,
        provider: 'vertex-ai-tryon',
        modelName: VERTEX_TRYON_MODEL_ID,
        latencyMs,
        error: message,
        errorCode: vertexErrorCode,
        supportCode,
        nextRetryAt: retryAt ?? undefined,
      });
    }
    if (retryAt) {
      return {
        status: 202,
        payload: {
          success: false,
          error: message,
          data: { nextRetryAt: retryAt },
        },
      };
    }
    return {
      status: 500,
      payload: {
        success: false,
        error: message,
        errorCode: vertexErrorCode,
      },
    };
  } finally {
    if (leaseAcquired && leaseOwner && jobId) {
      await releaseTryOnJobLease(jobId, leaseOwner);
    }
    if (concurrencyAcquired) {
      releaseTryOnProcessSlot();
    }
    if (shouldCleanup && jobId) {
      const job = await getTryOnJob(jobId);
      if (job) {
        await cleanupTryOnInputs(job);
      }
    }
  }
}

function triggerInlineTryOn(jobId: string, source: 'job_created' | 'job_reused'): void {
  logTryOnTelemetry({
    event: 'job_inline_processing_started',
    jobId,
    source,
  });
  void processTryOnJobInternal(jobId).then((result) => {
    if (result.status >= 400) {
      logTryOnTelemetry({
        event: 'job_inline_processing_failed',
        jobId,
        status: result.status,
      });
    }
  }).catch((error) => {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    logTryOnTelemetry({
      event: 'job_inline_processing_failed',
      jobId,
      error: message,
    });
  });
}
 
 export async function tryOn(req: Request, res: Response) {
   try {
    return res.status(410).json({
      success: false,
      error: 'Luồng xử lý đồng bộ đã được ngưng. Vui lòng dùng /virtual-tryon/jobs để tạo job bất đồng bộ.',
      errorCode: 'PROVIDER_UNAVAILABLE',
      retryAfterSeconds: 5,
    });
   } catch (error) {
     console.error('Virtual try-on error:', error);
     const message = error instanceof Error ? error.message : 'Internal server error';
     return res.status(500).json({
       success: false,
       error: message,
       message: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
     });
   }
 }

export async function getJobStatus(req: Request, res: Response) {
  try {
    if (!isTryOnJobStoreEnabled()) {
      return res.status(501).json({
        success: false,
        error: 'Try-on job tracking is not configured',
      });
    }

    const jobId = req.params.id;
    const job = await getTryOnJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const enforcedJob = await enforceFailFast(job);
    if (!enforcedJob) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    const payload = buildJobStatusPayload(enforcedJob);

    return res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.error('Get job status error:', error);
    return res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'development' ? message : 'Failed to get job status',
    });
  }
}

export async function createUploadUrl(req: Request, res: Response) {
  try {
    if (!getTryOnStorageProvider()) {
      return res.status(501).json({
        success: false,
        error: 'Try-on storage chưa được cấu hình',
      });
    }

    const { contentType, extension, category, contentLength } = req.body as {
      contentType?: string;
      extension?: string;
      category?: string;
      contentLength?: number;
    };

    if (!contentType || typeof contentType !== 'string' || !contentType.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'contentType không hợp lệ',
      });
    }

    if (typeof contentLength === 'number' && contentLength <= 0) {
      return res.status(400).json({
        success: false,
        error: 'contentLength không hợp lệ',
      });
    }

    const upload = await createTryOnUploadSignedUrl({
      contentType,
      extension,
      category,
      contentLength,
    });

    return res.json({
      success: true,
      data: upload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}

export async function createTryOnJobAsync(req: Request, res: Response) {
  try {
    if (!isTryOnJobStoreEnabled()) {
      return res.status(501).json({
        success: false,
        error: 'Try-on job tracking is not configured',
      });
    }

    const health = getTryOnHealthSnapshot();
    if (!health.available) {
      return res.status(503).json({
        success: false,
        error: 'Google Cloud chưa sẵn sàng cho VTON',
        errorCode: 'TRYON_CLOUD_NOT_READY',
        data: { reasons: health.reasons },
      });
    }

    const readiness = await checkVertexTryOnReadiness();
    if (!readiness.available) {
      return res.status(503).json({
        success: false,
        error: readiness.errorMessage || 'Google Cloud chưa sẵn sàng cho VTON',
        errorCode: readiness.errorCode || 'TRYON_CLOUD_NOT_READY',
      });
    }

    const {
      personImageGcsUri,
      garmentImageGcsUri,
      personImageUrl,
      garmentImageUrl,
      wantsVideo,
      videoDurationSeconds,
      userId,
      productId,
    } = req.body as {
      personImageGcsUri?: string;
      garmentImageGcsUri?: string;
      personImageUrl?: string;
      garmentImageUrl?: string;
      wantsVideo?: boolean;
      videoDurationSeconds?: number;
      userId?: string;
      productId?: string;
    };

    const storageProvider = getTryOnStorageProvider();
    if (!storageProvider) {
      return res.status(501).json({
        success: false,
        error: 'Try-on storage chưa được cấu hình',
      });
    }

    const expectsGcs = storageProvider === 'gcs';
    const expectsUrl = storageProvider === 'cloudinary';

    if (expectsGcs) {
      if (!personImageGcsUri || !garmentImageGcsUri) {
        return res.status(400).json({
          success: false,
          error: 'personImageGcsUri và garmentImageGcsUri là bắt buộc',
        });
      }

      if (!isGcsUri(personImageGcsUri) || !isGcsUri(garmentImageGcsUri)) {
        return res.status(400).json({
          success: false,
          error: 'GCS URI không hợp lệ',
        });
      }
    }

    if (expectsUrl) {
      if (!personImageUrl || !garmentImageUrl) {
        return res.status(400).json({
          success: false,
          error: 'personImageUrl và garmentImageUrl là bắt buộc',
        });
      }

      if (!isValidExternalImageUrl(personImageUrl)) {
        return res.status(400).json({
          success: false,
          error: 'personImageUrl không hợp lệ',
          errorCode: 'TRYON_INVALID_INPUT',
        });
      }

      if (!isValidExternalImageUrl(garmentImageUrl)) {
        return res.status(400).json({
          success: false,
          error: 'garmentImageUrl không hợp lệ',
          errorCode: 'TRYON_INVALID_GARMENT_URL',
        });
      }
    }

    if (typeof videoDurationSeconds === 'number' && videoDurationSeconds > TRYON_MAX_VIDEO_DURATION_SECONDS) {
      return res.status(400).json({
        success: false,
        error: `videoDurationSeconds tối đa ${TRYON_MAX_VIDEO_DURATION_SECONDS}s`,
      });
    }

    if (productId && typeof productId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'productId không hợp lệ',
      });
    }

    const idempotencyKey = buildIdempotencyKey({
      personImageGcsUri,
      garmentImageGcsUri,
      personImageUrl,
      garmentImageUrl,
      wantsVideo: Boolean(wantsVideo),
      videoDurationSeconds: typeof videoDurationSeconds === 'number' ? videoDurationSeconds : undefined,
      productId,
    });

    const host = req.get('host');
    const baseUrl = host ? `${req.protocol}://${host}/api` : undefined;
    const existing = await getTryOnJobByIdempotencyKey(idempotencyKey);
    if (existing && existing.status !== 'failed' && existing.status !== 'expired') {
      if (existing.status === 'queued') {
        if (shouldInlineTryOnProcessing()) {
          triggerInlineTryOn(existing.jobId, 'job_reused');
        } else {
          await enqueueTryOnJob(existing.jobId, baseUrl);
        }
      }
      logTryOnTelemetry({
        event: 'job_reused',
        jobId: existing.jobId,
        status: existing.status,
      });
      const payload = buildJobStatusPayload(existing);
      return res.json({
        success: true,
        data: payload,
      });
    }

    const jobRecord = await createTryOnJob({
      status: 'queued',
      personImageGcsUri,
      garmentImageGcsUri,
      personImageUrl,
      garmentImageUrl,
      wantsVideo: Boolean(wantsVideo),
      videoDurationSeconds: typeof videoDurationSeconds === 'number' ? videoDurationSeconds : undefined,
      userId,
      productId,
      idempotencyKey,
      attemptCount: 0,
    });

    if (!jobRecord) {
      return res.status(500).json({
        success: false,
        error: 'Không thể tạo job',
      });
    }

    logTryOnTelemetry({
      event: 'job_created',
      jobId: jobRecord.jobId,
      wantsVideo: Boolean(wantsVideo),
      storageProvider,
    });

    if (shouldInlineTryOnProcessing()) {
      triggerInlineTryOn(jobRecord.jobId, 'job_created');
    } else {
      await enqueueTryOnJob(jobRecord.jobId, baseUrl);
    }

    const payload = buildJobStatusPayload(jobRecord);

    return res.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}

export async function processTryOnJob(req: Request, res: Response) {
  let jobId: string | undefined;
  try {
    if (!isTryOnJobStoreEnabled()) {
      return res.status(501).json({
        success: false,
        error: 'Try-on job tracking is not configured',
      });
    }

    if (TRYON_WORKER_TOKEN) {
      const tokenHeader = req.headers['x-worker-token'];
      if (!tokenHeader || tokenHeader !== TRYON_WORKER_TOKEN) {
        return res.status(403).json({
          success: false,
          error: 'Worker token không hợp lệ',
        });
      }
    }

    jobId = req.params.id;
    const result = await processTryOnJobInternal(jobId);
    return res.status(result.status).json(result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    return res.status(500).json({
      success: false,
      error: message,
      errorCode: error instanceof VertexApiError ? error.code : undefined,
    });
  }
}

export async function resetHealth(_req: Request, res: Response) {
  try {
    return res.json({
      success: true,
      message: 'Vertex-only mode: no provider health state to reset',
    });
  } catch (error) {
    console.error('Reset health error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset health stats',
    });
  }
}

export async function getHealthStats(_req: Request, res: Response) {
  try {
    const stats = getTryOnHealthSnapshot();
    
    return res.json({
      success: true,
      data: {
        vertex: stats,
      },
    });
  } catch (error) {
    console.error('Health stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get health stats',
    });
  }
}

export async function getTryOnMetrics(req: Request, res: Response) {
  try {
    if (TRYON_METRICS_TOKEN) {
      const tokenHeader = req.headers['x-metrics-token'];
      if (!tokenHeader || tokenHeader !== TRYON_METRICS_TOKEN) {
        return res.status(403).json({
          success: false,
          error: 'Metrics token không hợp lệ',
        });
      }
    }

    const stats = getTryOnHealthSnapshot();
    return res.json({
      success: true,
      data: {
        providerHealth: {
          vertex: stats,
        },
      },
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
    });
  }
}
 
 export async function getStatus(_req: Request, res: Response) {
   try {
    const status = getTryOnHealthSnapshot();
 
     return res.json({
       success: true,
       data: {
        available: status.available,
        providers: [
          {
            name: status.provider,
            available: status.available,
            reason: status.reasons.join('; '),
          },
        ],
       },
     });
   } catch (error) {
     console.error('Status check error:', error);
     return res.status(500).json({
       success: false,
       error: 'Failed to check status',
     });
   }
 }
 
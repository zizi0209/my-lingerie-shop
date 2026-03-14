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
  generateVeoVideoFromImage,
  processVertexTryOnFromGcs,
  processVertexTryOnFromUrl,
  storeTryOnResult,
} from '../services/vertexTryOnService';
import { createHash, randomUUID } from 'crypto';

const QUEUE_ESTIMATE_MS = Number(process.env.TRYON_QUEUE_ESTIMATE_MS || '120000');
const PROCESS_ESTIMATE_MS = Number(process.env.TRYON_PROCESS_ESTIMATE_MS || '120000');
const TRYON_JOB_RETRY_BASE_SECONDS = Number(process.env.TRYON_JOB_RETRY_BASE_SECONDS || '30');
const TRYON_JOB_RETRY_MAX_SECONDS = Number(process.env.TRYON_JOB_RETRY_MAX_SECONDS || '300');
const TRYON_MAX_VIDEO_DURATION_SECONDS = Number(process.env.TRYON_MAX_VIDEO_DURATION_SECONDS || '10');
const VERTEX_TRYON_MODEL_ID = process.env.VERTEX_TRYON_MODEL_ID || 'virtual-try-on-001';
const TRYON_WORKER_WEBHOOK_URL = process.env.TRYON_WORKER_WEBHOOK_URL || '';
const TRYON_WORKER_TOKEN = process.env.TRYON_WORKER_TOKEN;
const TRYON_METRICS_TOKEN = process.env.TRYON_METRICS_TOKEN;

function logTryOnTelemetry(event: Record<string, unknown>): void {
  console.log('[TryOn][Telemetry]', JSON.stringify({
    timestamp: Date.now(),
    ...event,
  }));
}

function buildJobStatusPayload(job: Awaited<ReturnType<typeof getTryOnJob>>) {
  if (!job) return null;
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

function isRetryableJobError(message: string): boolean {
  const normalized = message.toLowerCase();
  if (normalized.includes('thiếu') || normalized.includes('invalid') || normalized.includes('không hợp lệ')) {
    return false;
  }
  if (normalized.includes('expired') || normalized.includes('hết hạn')) {
    return false;
  }
  return true;
}

async function enqueueTryOnJob(jobId: string): Promise<void> {
  if (!TRYON_WORKER_WEBHOOK_URL) {
    return;
  }

  try {
    await fetch(TRYON_WORKER_WEBHOOK_URL.replace(/\/$/, '') + `/virtual-tryon/jobs/${jobId}/process`, {
      method: 'POST',
      headers: TRYON_WORKER_TOKEN ? { 'x-worker-token': TRYON_WORKER_TOKEN } : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    console.warn('[TryOn][Worker] Enqueue thất bại:', message);
  }
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

    const payload = buildJobStatusPayload(job);

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

    const existing = await getTryOnJobByIdempotencyKey(idempotencyKey);
    if (existing && existing.status !== 'failed' && existing.status !== 'expired') {
      if (existing.status === 'queued') {
        await enqueueTryOnJob(existing.jobId);
      }
      logTryOnTelemetry({
        event: 'job_reused',
        jobId: existing.jobId,
        status: existing.status,
      });
      return res.json({
        success: true,
        data: existing,
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

    await enqueueTryOnJob(jobRecord.jobId);

    return res.json({
      success: true,
      data: jobRecord,
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
  let jobRecord: Awaited<ReturnType<typeof getTryOnJob>> | null = null;
  let attemptCount = 0;
  let leaseOwner: string | null = null;
  let leaseAcquired = false;
  let shouldCleanup = false;
  let processingStartedAt: number | undefined;
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
    const job = await getTryOnJob(jobId);
    jobRecord = job;
    if (!jobRecord) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (jobRecord.status === 'expired') {
      return res.status(410).json({
        success: false,
        error: jobRecord.errorMessage || 'Job đã hết hạn',
      });
    }

    if (jobRecord.status === 'completed') {
      return res.json({
        success: true,
        data: {
          jobId,
          resultImage: jobRecord.resultImage,
          resultImageGcsUri: jobRecord.resultImageGcsUri,
          resultVideo: jobRecord.resultVideo,
          resultVideoGcsUri: jobRecord.resultVideoGcsUri,
          processingTime: jobRecord.processingTime,
        },
      });
    }

    if (!jobRecord.personImageGcsUri && !jobRecord.personImageUrl) {
      return res.status(422).json({
        success: false,
        error: 'Thiếu dữ liệu ảnh người trong job',
      });
    }

    if (!jobRecord.garmentImageGcsUri && !jobRecord.garmentImageUrl) {
      return res.status(422).json({
        success: false,
        error: 'Thiếu dữ liệu ảnh sản phẩm trong job',
      });
    }

    if (jobRecord.status === 'processing') {
      return res.status(409).json({
        success: false,
        error: 'Job đang xử lý',
      });
    }

    if (jobRecord.nextRetryAt && jobRecord.nextRetryAt > Date.now()) {
      return res.status(409).json({
        success: false,
        error: 'Job đang chờ retry',
        data: { nextRetryAt: jobRecord.nextRetryAt },
      });
    }

    leaseOwner = randomUUID();
    leaseAcquired = await acquireTryOnJobLease(jobId, leaseOwner);
    if (!leaseAcquired) {
      return res.status(409).json({
        success: false,
        error: 'Job đang được worker khác xử lý',
      });
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
    const localVideoDisabled = process.env.NODE_ENV === 'development';
    const videoDisabled = localVideoDisabled
      || process.env.FREE_MODE_DISABLE_VIDEO === 'true'
      || storageProvider !== 'gcs';

    if (jobRecord.wantsVideo && !videoDisabled) {
      try {
        const veoResult = await generateVeoVideoFromImage({
          imageGcsUri: storedImage.storageUri || '',
          durationSeconds: jobRecord.videoDurationSeconds,
          mimeType: tryOnResult.mimeType,
        });
        resultVideoGcsUri = veoResult.gcsUri;
        resultVideoSignedUrl = await getSignedReadUrlForGcsUri(veoResult.gcsUri);
      } catch (videoError) {
        const message = videoError instanceof Error ? videoError.message : 'Lỗi video không xác định';
        console.warn('[TryOn][Video] Bỏ qua video do lỗi:', message);
      }
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

    return res.json({
      success: true,
      data: {
        jobId,
        resultImage: storedImage.signedUrl,
        resultImageGcsUri: storedImage.storageUri,
        resultVideo: resultVideoSignedUrl,
        resultVideoGcsUri,
        processingTime,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lỗi không xác định';
    let retryAt: number | null = null;
    if (jobId && jobRecord) {
      const latencyMs = processingStartedAt ? Date.now() - processingStartedAt : undefined;
      const currentAttempt = attemptCount || jobRecord.attemptCount || 0;
      const maxAttempts = getTryOnJobMaxAttempts();
      const canRetry = isRetryableJobError(message) && currentAttempt < maxAttempts;

      if (canRetry) {
        const nextRetryAt = computeNextRetryAt(currentAttempt + 1);
        retryAt = nextRetryAt;
        await markTryOnJobRetryScheduled(jobId, {
          nextRetryAt,
          attemptCount: currentAttempt + 1,
          errorMessage: message,
          modelName: VERTEX_TRYON_MODEL_ID,
          latencyMs,
        });
      } else {
        await markTryOnJobDeadLetter(jobId, {
          errorMessage: message,
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
        nextRetryAt: retryAt ?? undefined,
      });
    }
    if (retryAt) {
      return res.status(202).json({
        success: false,
        error: message,
        data: { nextRetryAt: retryAt },
      });
    }
    return res.status(500).json({
      success: false,
      error: message,
    });
  } finally {
    if (leaseAcquired && leaseOwner && jobId) {
      await releaseTryOnJobLease(jobId, leaseOwner);
    }
    if (shouldCleanup && jobId) {
      const job = await getTryOnJob(jobId);
      if (job) {
        await cleanupTryOnInputs(job);
      }
    }
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
 
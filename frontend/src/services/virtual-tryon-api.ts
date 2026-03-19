import {
  TryOnRequest,
  TryOnResult,
  TryOnErrorCode,
  SignedUploadResponse,
  CreateTryOnJobResponse,
  TryOnJobStatusResponse,
  VideoFromImageResponse,
} from '@/types/virtual-tryon';
 
 const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const ENV_ENABLE_REMOTE_TRYON = process.env.NEXT_PUBLIC_ENABLE_REMOTE_TRYON;
 
 type ProgressCallback = (progress: number, message?: string) => void;

type Abortable = { signal?: AbortSignal };

interface TryOnErrorPayload {
  error?: string;
  message?: string;
  errorCode?: TryOnErrorCode;
  retryAfterSeconds?: number;
  errorStage?: string;
  providerHint?: string;
  videoStatus?: 'pending' | 'completed' | 'failed' | 'skipped';
  videoErrorMessage?: string;
}

interface PublicConfigPayload {
  enable_remote_tryon?: string;
}

interface RemoteTryOnConfig {
  enabled: boolean;
}

interface GenerateVideoFromImageApiResponse {
  success?: boolean;
  data?: VideoFromImageResponse;
  error?: string;
  errorCode?: string;
}

interface SignedUploadPayload {
  contentType: string;
  extension?: string;
  category?: string;
  contentLength?: number;
}

const normalizeBoolean = (value?: string): boolean | null => {
  if (value === undefined) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
};

let cachedRemoteConfig: RemoteTryOnConfig | null = null;
let remoteConfigPromise: Promise<RemoteTryOnConfig> | null = null;

async function fetchPublicConfig(): Promise<PublicConfigPayload> {
  const response = await fetch(`${API_BASE_URL}/public/config`);
  if (!response.ok) {
    throw new Error('Không thể tải public config');
  }
  const payload = (await response.json()) as { data?: PublicConfigPayload; success?: boolean };
  if (!payload.success || !payload.data) {
    return {};
  }
  return payload.data;
}

async function getRemoteConfig(): Promise<RemoteTryOnConfig> {
  if (cachedRemoteConfig) return cachedRemoteConfig;
  if (remoteConfigPromise) return remoteConfigPromise;

  remoteConfigPromise = (async () => {
    let publicConfig: PublicConfigPayload = {};
    try {
      publicConfig = await fetchPublicConfig();
    } catch (error) {
      console.warn('[TryOn][Remote] Không thể lấy public config:', error);
    }

    const envEnabled = normalizeBoolean(ENV_ENABLE_REMOTE_TRYON);
    const runtimeEnabled = normalizeBoolean(publicConfig.enable_remote_tryon);
    const enabled = envEnabled ?? runtimeEnabled ?? true;

    cachedRemoteConfig = { enabled };
    return cachedRemoteConfig;
  })();

  return remoteConfigPromise;
}

export async function isRemoteTryOnEnabled(): Promise<boolean> {
  const config = await getRemoteConfig();
  return config.enabled;
}
 
 async function blobToBase64(blob: Blob): Promise<string> {
   return new Promise((resolve, reject) => {
     const reader = new FileReader();
     reader.onloadend = () => resolve(reader.result as string);
     reader.onerror = reject;
     reader.readAsDataURL(blob);
   });
 }
 
const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_POLL_TIMEOUT_MS = 90 * 1000;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true }
    );
  });
}

function toTryOnResult(params: {
  originalImage: string;
  productId: string;
  productName: string;
  provider?: string;
  jobId?: string;
  resultImage?: string;
  resultVideo?: string;
  resultImageGcsUri?: string;
  resultVideoGcsUri?: string;
  videoStatus?: 'pending' | 'completed' | 'failed' | 'skipped';
  videoErrorMessage?: string;
  processingTime?: number;
  qualityScore?: number;
  modelName?: string;
  seed?: number;
  latencyMs?: number;
  fallbackReason?: string;
}): TryOnResult {
  if (!params.resultImage) {
    throw new Error('Không nhận được ảnh kết quả từ hệ thống AI');
  }

  return {
    originalImage: params.originalImage,
    resultImage: params.resultImage,
    resultVideo: params.resultVideo,
    resultImageGcsUri: params.resultImageGcsUri,
    resultVideoGcsUri: params.resultVideoGcsUri,
    videoStatus: params.videoStatus,
    videoErrorMessage: params.videoErrorMessage,
    processingTime: params.processingTime,
    jobId: params.jobId,
    source: 'cloud',
    productId: params.productId,
    productName: params.productName,
    timestamp: Date.now(),
    provider: params.provider,
    qualityScore: params.qualityScore,
    modelName: params.modelName,
    seed: params.seed,
    latencyMs: params.latencyMs,
    fallbackReason: params.fallbackReason,
  };
}

async function requestSignedUploadUrl(
  payload: SignedUploadPayload,
  options?: Abortable
): Promise<SignedUploadResponse> {
  const response = await fetch(`${API_BASE_URL}/virtual-tryon/uploads/signed-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Lỗi kết nối' }))) as TryOnErrorPayload;
    throw new Error(error.message || error.error || 'Không thể tạo upload URL');
  }

  const result = (await response.json()) as { success?: boolean; data?: SignedUploadResponse; error?: string };
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Không thể tạo upload URL');
  }

  return result.data;
}

async function uploadFileToSignedUrl(
  upload: SignedUploadResponse,
  file: File | Blob,
  contentType: string,
  options?: Abortable
): Promise<{ assetUrl?: string }> {
  const method = upload.uploadMethod ?? 'PUT';

  if (method === 'POST') {
    const formData = new FormData();
    if (upload.uploadFields) {
      Object.entries(upload.uploadFields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    formData.append('file', file);

    const response = await fetch(upload.uploadUrl, {
      method: 'POST',
      body: formData,
      signal: options?.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Upload Cloudinary thất bại: ${response.status} ${text}`);
    }

    const payload = (await response.json()) as { secure_url?: string };
    return { assetUrl: payload.secure_url };
  }

  const response = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
    signal: options?.signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upload GCS thất bại: ${response.status} ${text}`);
  }

  return {};
}

async function createAsyncTryOnJob(
  payload: {
    personImageGcsUri?: string;
    garmentImageGcsUri?: string;
    personImageUrl?: string;
    garmentImageUrl?: string;
    wantsVideo?: boolean;
    videoDurationSeconds?: number;
    productId?: string;
  },
  options?: Abortable
): Promise<CreateTryOnJobResponse> {
  const response = await fetch(`${API_BASE_URL}/virtual-tryon/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Lỗi kết nối' }))) as TryOnErrorPayload;
    const errorCode = error.errorCode ? `${error.errorCode}: ` : '';
    throw new Error(`${errorCode}${error.message || error.error || 'Không thể tạo job'}`);
  }

  const result = (await response.json()) as { success?: boolean; data?: CreateTryOnJobResponse; error?: string };
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Không thể tạo job');
  }

  return result.data;
}

async function fetchTryOnJob(jobId: string, options?: Abortable): Promise<TryOnJobStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/virtual-tryon/jobs/${jobId}`, {
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Lỗi kết nối' }))) as TryOnErrorPayload;
    const errorCode = error.errorCode ? `${error.errorCode}: ` : '';
    throw new Error(`${errorCode}${error.message || error.error || 'Không thể lấy trạng thái job'}`);
  }

  const result = (await response.json()) as { success?: boolean; data?: TryOnJobStatusResponse; error?: string };
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Không thể lấy trạng thái job');
  }

  return result.data;
}

async function pollTryOnJob(
  jobId: string,
  options: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
  onProgress?: ProgressCallback
): Promise<TryOnJobStatusResponse> {
  const start = Date.now();
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;

  while (Date.now() - start < timeoutMs) {
    const data = await fetchTryOnJob(jobId, { signal: options.signal });
    if (data.status === 'retry_scheduled') {
      if (data.nextRetryAt && data.nextRetryAt > Date.now()) {
        const retrySeconds = Math.max(1, Math.round((data.nextRetryAt - Date.now()) / 1000));
        onProgress?.(45, `Đang chờ retry sau ${retrySeconds}s...`);
      } else {
        onProgress?.(45, 'Đang chờ retry...');
      }
    }
    if (data.status === 'queued') {
      if (data.nextRetryAt && data.nextRetryAt > Date.now()) {
        const retrySeconds = Math.max(1, Math.round((data.nextRetryAt - Date.now()) / 1000));
        onProgress?.(45, `Đang chờ retry sau ${retrySeconds}s...`);
      } else {
        const etaSeconds = data.etaMs ? Math.round(data.etaMs / 1000) : undefined;
        onProgress?.(50, etaSeconds ? `Đang chờ trong hàng đợi GPU (~${etaSeconds}s)...` : 'Đang chờ trong hàng đợi GPU...');
      }
    }
    if (data.status === 'processing') {
      const etaSeconds = data.etaMs ? Math.round(data.etaMs / 1000) : undefined;
      onProgress?.(75, etaSeconds ? `AI đang xử lý trên GPU (~${etaSeconds}s)...` : 'AI đang xử lý trên GPU...');
    }
    if (data.status === 'completed') {
      return data;
    }
    if (data.status === 'failed_config') {
      throw new Error(`TRYON_CLOUD_NOT_READY: ${data.errorMessage || 'Cấu hình Google Cloud chưa sẵn sàng'}`);
    }
    if (data.status === 'dead_letter') {
      const errorCode = data.errorCode ? `${data.errorCode}: ` : 'DEAD_LETTER: ';
      throw new Error(`${errorCode}${data.errorMessage || 'Job đã thất bại sau nhiều lần retry'}`);
    }
    if (data.status === 'failed_provider' || data.status === 'failed') {
      const errorCode = data.errorCode ? `${data.errorCode}: ` : 'PROVIDER_UNAVAILABLE: ';
      throw new Error(`${errorCode}${data.errorMessage || 'Job xử lý thất bại'}`);
    }
    if (data.status === 'expired') {
      throw new Error(`REMOTE_EXPIRED: ${data.errorMessage || 'Job đã hết hạn'}`);
    }

    await sleep(intervalMs, options.signal);
  }

  throw new Error('REMOTE_TIMEOUT: AI đang xử lý quá lâu. Vui lòng thử lại sau.');
}

async function processVirtualTryOnAsyncCloud(
  request: TryOnRequest & { wantsVideo?: boolean; videoDurationSeconds?: number },
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<TryOnResult> {
  onProgress?.(8, 'Đang chuẩn bị upload ảnh...');

  const garmentBlob = await (await fetch(request.garmentImageUrl, { signal })).blob();
  const garmentContentType = garmentBlob.type || 'image/jpeg';

  const [personUpload, garmentUpload] = await Promise.all([
    requestSignedUploadUrl(
      {
        contentType: request.personImage.type || 'image/jpeg',
        category: 'person',
        contentLength: request.personImage.size,
      },
      { signal }
    ),
    requestSignedUploadUrl(
      { contentType: garmentContentType, category: 'garment', contentLength: garmentBlob.size },
      { signal }
    ),
  ]);

  onProgress?.(18, 'Đang upload ảnh lên Cloud Storage...');
  const personUploadResult = await uploadFileToSignedUrl(
    personUpload,
    request.personImage,
    request.personImage.type || 'image/jpeg',
    { signal }
  );
  const garmentUploadResult = await uploadFileToSignedUrl(
    garmentUpload,
    garmentBlob,
    garmentContentType,
    { signal }
  );

  if (personUpload.provider === 'cloudinary' && !personUploadResult.assetUrl) {
    throw new Error('Không nhận được URL ảnh người từ Cloudinary');
  }
  if (garmentUpload.provider === 'cloudinary' && !garmentUploadResult.assetUrl) {
    throw new Error('Không nhận được URL ảnh sản phẩm từ Cloudinary');
  }

  onProgress?.(35, 'Đang tạo job xử lý...');
  const job = await createAsyncTryOnJob(
    {
      personImageGcsUri: personUpload.gcsUri,
      garmentImageGcsUri: garmentUpload.gcsUri,
      personImageUrl: personUploadResult.assetUrl,
      garmentImageUrl: garmentUploadResult.assetUrl,
      wantsVideo: request.wantsVideo,
      videoDurationSeconds: request.videoDurationSeconds,
      productId: request.productId,
    },
    { signal }
  );

  onProgress?.(45, 'Đang xếp hàng GPU xử lý...');

  const originalImage = await blobToBase64(request.personImage);
  const jobStatus = await pollTryOnJob(
    job.jobId,
    { intervalMs: DEFAULT_POLL_INTERVAL_MS, timeoutMs: DEFAULT_POLL_TIMEOUT_MS, signal },
    onProgress
  );

  onProgress?.(100, 'Hoàn thành!');

  return toTryOnResult({
    originalImage,
    productId: request.productId,
    productName: request.productName,
    provider: jobStatus.provider,
    jobId: job.jobId,
    resultImage: jobStatus.resultImage,
    resultVideo: jobStatus.resultVideo,
    resultImageGcsUri: jobStatus.resultImageGcsUri,
    resultVideoGcsUri: jobStatus.resultVideoGcsUri,
    videoStatus: jobStatus.videoStatus,
    videoErrorMessage: jobStatus.videoErrorMessage,
    processingTime: jobStatus.processingTime,
    qualityScore: jobStatus.qualityScore,
    modelName: jobStatus.modelName,
    seed: jobStatus.seed,
    latencyMs: jobStatus.latencyMs,
    fallbackReason: jobStatus.fallbackReason,
  });
}
 
export async function processVirtualTryOn(
  request: TryOnRequest & { wantsVideo?: boolean; videoDurationSeconds?: number },
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<TryOnResult> {
  const remoteEnabled = await isRemoteTryOnEnabled();
  if (!remoteEnabled) {
    throw new Error('REMOTE_DISABLED');
  }

  return processVirtualTryOnAsyncCloud(request, onProgress, signal);
}

export async function generateVideoFromExistingImage(params: {
  resultImageGcsUri: string;
  videoDurationSeconds?: number;
  productId?: string;
  productName?: string;
}): Promise<{ success: boolean; result?: TryOnResult; error?: string }> {
  const response = await fetch(`${API_BASE_URL}/virtual-tryon/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resultImageGcsUri: params.resultImageGcsUri,
      videoDurationSeconds: params.videoDurationSeconds,
    }),
  });

  let payload: GenerateVideoFromImageApiResponse = {};
  try {
    payload = (await response.json()) as GenerateVideoFromImageApiResponse;
  } catch {
    payload = {};
  }

  const data = payload.data;
  const productId = params.productId ?? 'video-test';
  const productName = params.productName ?? 'Video test';

  if (!response.ok || !payload.success) {
    const message = payload.error || 'Không thể tạo video thử đồ';
    if (data?.resultImage) {
      return {
        success: false,
        error: message,
        result: toTryOnResult({
          originalImage: data.resultImage,
          productId,
          productName,
          resultImage: data.resultImage,
          resultVideo: data.resultVideo,
          resultImageGcsUri: data.resultImageGcsUri,
          resultVideoGcsUri: data.resultVideoGcsUri,
          videoStatus: data.videoStatus ?? 'failed',
          videoErrorMessage: data.videoErrorMessage ?? message,
        }),
      };
    }
    return { success: false, error: message };
  }

  if (!data?.resultImage) {
    return { success: false, error: 'Không nhận được ảnh kết quả' };
  }

  return {
    success: true,
    result: toTryOnResult({
      originalImage: data.resultImage,
      productId,
      productName,
      resultImage: data.resultImage,
      resultVideo: data.resultVideo,
      resultImageGcsUri: data.resultImageGcsUri,
      resultVideoGcsUri: data.resultVideoGcsUri,
      videoStatus: data.videoStatus,
      videoErrorMessage: data.videoErrorMessage,
    }),
  };
}
 
 export async function checkServiceStatus(): Promise<{
   available: boolean;
   providers: Array<{ name: string; available: boolean }>;
   videoEnabled: boolean;
   videoReasons: string[];
 }> {
   try {
     const response = await fetch(`${API_BASE_URL}/virtual-tryon/status`);
     
     if (!response.ok) {
       return { available: false, providers: [], videoEnabled: false, videoReasons: [] };
     }
 
     const result = await response.json();
     return {
       available: result.data?.available ?? false,
       providers: result.data?.providers ?? [],
       videoEnabled: result.data?.videoEnabled ?? false,
       videoReasons: result.data?.videoReasons ?? [],
     };
   } catch {
     return { available: false, providers: [], videoEnabled: false, videoReasons: [] };
   }
 }
 
 export function getErrorMessage(error: Error): string {
  const rawMessage = error.message;
  const message = rawMessage.toLowerCase();

  if (message.includes('tryon_cloud_not_ready')) {
    return 'Google Cloud chưa sẵn sàng cho VTON. Vui lòng thử lại sau.';
  }
  if (message.includes('vertex_safety_blocked') || message.includes('safety blocked') || message.includes('safety filter')) {
    return 'Ảnh bị bộ lọc an toàn của dịch vụ AI chặn nên không thể xử lý. Vui lòng thử ảnh khác: khung hình rộng hơn, ít hở da hơn, nền đơn giản, hoặc ảnh sản phẩm dạng flat lay/mannequin.';
  }
  if (message.includes('dead_letter')) {
    return 'Job xử lý thất bại sau nhiều lần retry. Vui lòng thử lại sau.';
  }
  if (message.includes('retry_scheduled')) {
    return 'Job đang được lên lịch retry. Vui lòng chờ thêm.';
  }
  if (message.includes('provider_timeout') || message.includes('quá thời gian')) {
    return 'Vượt quá thời gian chờ 90 giây. Vui lòng thử lại.';
  }
   
   if (message.includes('busy') || message.includes('bận')) {
     return 'Hệ thống đang bận. Vui lòng thử lại sau vài phút.';
   }
   if (message.includes('timeout') || message.includes('thời gian')) {
     return 'Kết nối quá thời gian. Vui lòng thử lại.';
   }
  if (message.includes('rate') || message.includes('quota')) {
    return 'Hệ thống đang quá tải. Vui lòng thử lại sau.';
  }
  if (message.includes('remote_disabled')) {
    return 'Hệ thống AI đang tạm tắt. Vui lòng thử lại sau.';
  }
   if (message.includes('network') || message.includes('fetch') || message.includes('kết nối')) {
     return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
   }
   
   // Return original message if it's in Vietnamese
  if (/[\u00C0-\u1EF9]/.test(rawMessage)) {
    return rawMessage;
   }
   
   return 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
 }

 
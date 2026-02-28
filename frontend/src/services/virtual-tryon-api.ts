import {
  TryOnRequest,
  TryOnResult,
  TryOnErrorCode,
  SignedUploadResponse,
  CreateTryOnJobResponse,
  TryOnJobStatusResponse,
} from '@/types/virtual-tryon';
 
 const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const ENV_ENABLE_REMOTE_TRYON = process.env.NEXT_PUBLIC_ENABLE_REMOTE_TRYON;
 
 type ProgressCallback = (progress: number, message?: string) => void;

type Abortable = { signal?: AbortSignal };

interface TryOnErrorPayload {
  error?: string;
  message?: string;
  errorCode?: TryOnErrorCode;
}

interface PublicConfigPayload {
  enable_remote_tryon?: string;
}

interface RemoteTryOnConfig {
  enabled: boolean;
}

interface SignedUploadPayload {
  contentType: string;
  extension?: string;
  category?: string;
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
 
 async function urlToBase64(url: string): Promise<string> {
   const response = await fetch(url);
   const blob = await response.blob();
   return blobToBase64(blob);
 }

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_POLL_TIMEOUT_MS = 10 * 60 * 1000;

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
  processingTime?: number;
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
    processingTime: params.processingTime,
    jobId: params.jobId,
    source: 'cloud',
    productId: params.productId,
    productName: params.productName,
    timestamp: Date.now(),
    provider: params.provider,
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
    throw new Error(error.message || error.error || 'Không thể tạo job');
  }

  const result = (await response.json()) as { success?: boolean; data?: CreateTryOnJobResponse; error?: string };
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Không thể tạo job');
  }

  return result.data;
}

async function triggerTryOnJob(jobId: string, options?: Abortable): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/virtual-tryon/jobs/${jobId}/process`, {
    method: 'POST',
    signal: options?.signal,
  });

  if (!response.ok) {
    console.warn('[TryOn][Cloud] Trigger job thất bại:', response.status);
  }
}

async function fetchTryOnJob(jobId: string, options?: Abortable): Promise<TryOnJobStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/virtual-tryon/jobs/${jobId}`, {
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: 'Lỗi kết nối' }))) as TryOnErrorPayload;
    throw new Error(error.message || error.error || 'Không thể lấy trạng thái job');
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
    if (data.status === 'queued') {
      onProgress?.(50, 'Đang chờ trong hàng đợi...');
    }
    if (data.status === 'processing') {
      onProgress?.(75, 'Đang xử lý AI...');
    }
    if (data.status === 'completed') {
      return data;
    }
    if (data.status === 'failed') {
      throw new Error(data.errorMessage || 'Job xử lý thất bại');
    }

    await sleep(intervalMs, options.signal);
  }

  throw new Error('AI đang xử lý quá lâu. Vui lòng thử lại sau.');
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
      { contentType: request.personImage.type || 'image/jpeg', category: 'person' },
      { signal }
    ),
    requestSignedUploadUrl(
      { contentType: garmentContentType, category: 'garment' },
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

  onProgress?.(45, 'Đang xếp hàng xử lý...');
  await triggerTryOnJob(job.jobId, { signal });

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
    processingTime: jobStatus.processingTime,
  });
}
 
export async function processVirtualTryOn(
  request: TryOnRequest & { wantsVideo?: boolean; videoDurationSeconds?: number },
  onProgress?: ProgressCallback,
  signal?: AbortSignal
): Promise<TryOnResult> {
  const remoteEnabled = await isRemoteTryOnEnabled();
  if (remoteEnabled) {
    return processVirtualTryOnAsyncCloud(request, onProgress, signal);
  }

  onProgress?.(10, 'Đang chuẩn bị hình ảnh...');

  const personImageBase64 = await blobToBase64(request.personImage);
  const garmentImageBase64 = await urlToBase64(request.garmentImageUrl);

  onProgress?.(30, 'Đang gửi đến hệ thống AI...');

  const response = await fetch(`${API_BASE_URL}/virtual-tryon/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personImage: personImageBase64,
      garmentImage: garmentImageBase64,
    }),
    signal,
  });

  onProgress?.(80, 'Đang xử lý kết quả...');

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ message: 'Lỗi kết nối' }))) as TryOnErrorPayload;
    const mapped = mapTryOnErrorCode(error.errorCode, error.message || error.error);
    throw new Error(mapped);
  }

  const result = await response.json() as {
    success?: boolean;
    data?: { resultImage?: string; provider?: string };
    error?: string;
    message?: string;
    errorCode?: TryOnErrorCode;
  };

  if (!result.success) {
    const mapped = mapTryOnErrorCode(result.errorCode as TryOnErrorCode | undefined, result.message || result.error);
    throw new Error(mapped || 'Không thể xử lý hình ảnh');
  }

  onProgress?.(100, 'Hoàn thành!');

  const resultData = result.data;
  if (!resultData?.resultImage) {
    throw new Error('Không nhận được ảnh kết quả từ hệ thống AI');
  }

  return {
    originalImage: personImageBase64,
    resultImage: resultData.resultImage,
    productId: request.productId,
    productName: request.productName,
    timestamp: Date.now(),
    provider: resultData.provider,
    source: 'local',
  };
}
 
 export async function checkServiceStatus(): Promise<{
   available: boolean;
   providers: Array<{ name: string; available: boolean }>;
 }> {
   try {
     const response = await fetch(`${API_BASE_URL}/virtual-tryon/status`);
     
     if (!response.ok) {
       return { available: false, providers: [] };
     }
 
     const result = await response.json();
     return {
       available: result.data?.available ?? false,
       providers: result.data?.providers ?? [],
     };
   } catch {
     return { available: false, providers: [] };
   }
 }
 
 export function getErrorMessage(error: Error): string {
   const message = error.message.toLowerCase();
   
   if (message.includes('busy') || message.includes('bận')) {
     return 'Hệ thống đang bận. Vui lòng thử lại sau vài phút.';
   }
   if (message.includes('timeout') || message.includes('thời gian')) {
     return 'Kết nối quá thời gian. Vui lòng thử lại.';
   }
  if (message.includes('rate') || message.includes('quota')) {
    return 'Hệ thống đang quá tải. Vui lòng thử lại sau.';
  }
   if (message.includes('network') || message.includes('fetch') || message.includes('kết nối')) {
     return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.';
   }
   
   // Return original message if it's in Vietnamese
   if (/[\u00C0-\u1EF9]/.test(error.message)) {
     return error.message;
   }
   
   return 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
 }

function mapTryOnErrorCode(
  code?: TryOnErrorCode,
  fallbackMessage?: string
): string {
  switch (code) {
    case 'INPUT_GARMENT_MODEL_WORN':
      return 'Ảnh sản phẩm phải là ảnh lingerie riêng (đã tách nền), không dùng ảnh người mẫu mặc đồ.';
    case 'INPUT_GARMENT_TOO_SMALL':
      return 'Ảnh sản phẩm quá nhỏ. Vui lòng dùng ảnh rõ nét, độ phân giải cao.';
    case 'USER_IMAGE_TOO_SMALL':
      return 'Ảnh người quá nhỏ. Vui lòng dùng ảnh rõ nét, toàn thân.';
    case 'USER_IMAGE_ASPECT_RATIO':
      return 'Tỷ lệ ảnh người không phù hợp. Vui lòng dùng ảnh toàn thân thẳng đứng.';
    case 'INPUT_IMAGE_UNSUPPORTED':
      return 'Định dạng ảnh không được hỗ trợ.';
    case 'INPUT_GARMENT_INVALID':
    case 'USER_IMAGE_INVALID':
      return fallbackMessage || 'Không thể đọc ảnh đầu vào. Vui lòng thử ảnh khác.';
    case 'PROVIDER_TIMEOUT':
      return 'AI đang xử lý quá lâu. Vui lòng thử lại sau.';
    case 'PROVIDER_RATE_LIMITED':
      return 'Hệ thống đang quá tải. Vui lòng thử lại sau.';
    case 'PROVIDER_UNAVAILABLE':
      return 'AI đang bận. Vui lòng thử lại sau vài phút.';
    default:
      return fallbackMessage || 'Không thể xử lý hình ảnh.';
  }
}
 
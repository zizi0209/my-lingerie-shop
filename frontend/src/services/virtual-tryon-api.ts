import { TryOnRequest, TryOnResult, TryOnErrorCode } from '@/types/virtual-tryon';
 
 const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const ENV_ENABLE_REMOTE_TRYON = process.env.NEXT_PUBLIC_ENABLE_REMOTE_TRYON;
 
 type ProgressCallback = (progress: number, message?: string) => void;

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
 
 export async function processVirtualTryOn(
   request: TryOnRequest,
   onProgress?: ProgressCallback
 ): Promise<TryOnResult> {
   onProgress?.(10, 'Đang chuẩn bị hình ảnh...');
 
   // Convert images to base64
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
 
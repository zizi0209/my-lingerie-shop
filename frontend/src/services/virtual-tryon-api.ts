import { TryOnRequest, TryOnResult, TryOnErrorCode } from '@/types/virtual-tryon';
 
 const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
 
 type ProgressCallback = (progress: number, message?: string) => void;

interface TryOnErrorPayload {
  error?: string;
  message?: string;
  errorCode?: TryOnErrorCode;
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
 
   const result = await response.json();
 
  if (!result.success) {
    const mapped = mapTryOnErrorCode(result.errorCode as TryOnErrorCode | undefined, result.message || result.error);
    throw new Error(mapped || 'Không thể xử lý hình ảnh');
  }
 
   onProgress?.(100, 'Hoàn thành!');
 
   return {
     originalImage: personImageBase64,
     resultImage: result.data.resultImage,
     productId: request.productId,
     productName: request.productName,
     timestamp: Date.now(),
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
    default:
      return fallbackMessage || 'Không thể xử lý hình ảnh.';
  }
}
 
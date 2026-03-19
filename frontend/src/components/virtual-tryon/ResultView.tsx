'use client';
 
 import { Download, RefreshCw, ShoppingCart } from 'lucide-react';
 import { TryOnResult } from '@/types/virtual-tryon';
 
 interface ResultViewProps {
   result: TryOnResult;
   onTryAgain: () => void;
   onAddToCart?: () => void;
   onDownload: () => void;
  onDownloadVideo?: () => void;
  onGenerateVideo?: (durationSeconds: number) => void;
  videoGenerationPending?: boolean;
  videoGenerationEnabled?: boolean;
  videoGenerationReasons?: string[];
  videoDurationSeconds?: number;
  onVideoDurationChange?: (value: number) => void;
 }
 
const VIDEO_DURATION_OPTIONS = [4, 6, 8, 10];

export function ResultView({
  result,
  onTryAgain,
  onAddToCart,
  onDownload,
  onDownloadVideo,
  onGenerateVideo,
  videoGenerationPending,
  videoGenerationEnabled = true,
  videoGenerationReasons = [],
  videoDurationSeconds = 8,
  onVideoDurationChange,
}: ResultViewProps) {
  const qualityLabel = typeof result.qualityScore === 'number'
    ? `${Math.round(result.qualityScore * 100)}%`
    : undefined;
  const showVideoWarning = result.videoStatus === 'failed' || result.videoStatus === 'skipped';
  const videoWarningMessage = result.videoErrorMessage
    || (result.videoStatus === 'failed'
      ? 'Video thử đồ chưa tạo được, bạn vẫn có thể tải ảnh kết quả.'
      : 'Video thử đồ chưa sẵn sàng, bạn vẫn có thể tải ảnh kết quả.');
  const shouldShowVideoCard = !result.resultVideo && onGenerateVideo;
  const videoAvailabilityMessage = !videoGenerationEnabled
    ? videoGenerationReasons[0] || 'Video thử đồ chưa sẵn sàng trên môi trường này.'
    : undefined;

  const metadataItems = [
    result.provider ? { label: 'Provider', value: result.provider } : null,
    result.modelName ? { label: 'Model', value: result.modelName } : null,
    qualityLabel ? { label: 'Chất lượng', value: qualityLabel } : null,
    typeof result.latencyMs === 'number' ? { label: 'Latency', value: `${Math.round(result.latencyMs / 1000)}s` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

   return (
     <div className="space-y-4 sm:space-y-6">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
         <div>
           <p className="text-sm text-gray-500 mb-2">Ảnh gốc</p>
           <img
             src={result.originalImage}
             alt="Original"
             className="w-full h-48 sm:h-64 object-contain rounded-lg bg-gray-100"
           />
         </div>
        <div>
          <p className="text-sm text-gray-500 mb-2">Kết quả thử đồ</p>
           <img
             src={result.resultImage}
             alt="Result"
             className="w-full h-48 sm:h-64 object-contain rounded-lg bg-gray-100"
           />
         </div>
       </div>

      {showVideoWarning && !shouldShowVideoCard && (
        <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-700">
          {videoWarningMessage}
        </div>
      )}

      {shouldShowVideoCard && (
        <div className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-800">Tạo video từ ảnh này</p>
            <p className="text-xs text-gray-500">Video mất thêm thời gian xử lý và có thể không khả dụng với một số ảnh.</p>
          </div>

          {videoAvailabilityMessage && (
            <div className="text-xs text-amber-600">{videoAvailabilityMessage}</div>
          )}

          <div className="flex flex-wrap gap-2">
            {VIDEO_DURATION_OPTIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => onVideoDurationChange?.(duration)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  videoDurationSeconds === duration
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                }`}
              >
                {duration}s
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onGenerateVideo?.(videoDurationSeconds)}
            disabled={!videoGenerationEnabled || videoGenerationPending}
            className="w-full rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {videoGenerationPending ? 'Đang tạo video từ ảnh đã render...' : 'Tạo video'}
          </button>

          {showVideoWarning && (
            <div className="text-xs text-amber-700">{videoWarningMessage}</div>
          )}
        </div>
      )}

      {result.resultVideo && (
        <div>
          <p className="text-sm text-gray-500 mb-2">Video thử đồ</p>
          <video
            controls
            src={result.resultVideo}
            className="w-full max-h-80 rounded-lg bg-black"
          />
        </div>
      )}
 
       <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
         <p className="font-medium text-gray-800 text-sm sm:text-base">{result.productName}</p>
       </div>

      {metadataItems.length > 0 && (
        <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Thông tin xử lý</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {metadataItems.map((item) => (
              <div key={item.label} className="text-xs sm:text-sm text-gray-600">
                <span className="font-medium text-gray-700">{item.label}:</span> {item.value}
              </div>
            ))}
          </div>
        </div>
      )}
 
       <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
         {onAddToCart && (
           <button
             type="button"
             onClick={onAddToCart}
             className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 px-4 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm sm:text-base font-medium"
           >
             <ShoppingCart className="w-4 h-4" />
             Thêm vào giỏ
           </button>
         )}
         <button
           type="button"
           onClick={onDownload}
           className="flex items-center justify-center gap-2 py-2.5 sm:py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
         >
           <Download className="w-4 h-4" />
           Tải ảnh
         </button>
        {result.resultVideo && onDownloadVideo && (
          <button
            type="button"
            onClick={onDownloadVideo}
            className="flex items-center justify-center gap-2 py-2.5 sm:py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Download className="w-4 h-4" />
            Tải video
          </button>
        )}
         <button
           type="button"
           onClick={onTryAgain}
           className="flex items-center justify-center gap-2 py-2.5 sm:py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
         >
           <RefreshCw className="w-4 h-4" />
           Thử ảnh khác
         </button>
       </div>
     </div>
   );
 }
 
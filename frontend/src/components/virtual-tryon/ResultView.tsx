'use client';
 
 import { Download, RefreshCw, ShoppingCart } from 'lucide-react';
 import { TryOnResult } from '@/types/virtual-tryon';
 
 interface ResultViewProps {
   result: TryOnResult;
   onTryAgain: () => void;
   onAddToCart?: () => void;
   onDownload: () => void;
  onDownloadVideo?: () => void;
 }
 
export function ResultView({ result, onTryAgain, onAddToCart, onDownload, onDownloadVideo }: ResultViewProps) {
  const qualityLabel = typeof result.qualityScore === 'number'
    ? `${Math.round(result.qualityScore * 100)}%`
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
 
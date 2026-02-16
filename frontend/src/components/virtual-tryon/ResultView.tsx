'use client';
 
 import { Download, RefreshCw, ShoppingCart } from 'lucide-react';
 import { TryOnResult } from '@/types/virtual-tryon';
 
 interface ResultViewProps {
   result: TryOnResult;
   onTryAgain: () => void;
   onAddToCart?: () => void;
   onDownload: () => void;
 }
 
 export function ResultView({ result, onTryAgain, onAddToCart, onDownload }: ResultViewProps) {
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
 
       <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
         <p className="font-medium text-gray-800 text-sm sm:text-base">{result.productName}</p>
       </div>
 
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
 
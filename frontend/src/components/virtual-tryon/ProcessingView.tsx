'use client';
 
 import { useState, useEffect } from 'react';
 import { Loader2, Lightbulb, Clock } from 'lucide-react';
 import { TryOnQueueInfo } from '@/types/virtual-tryon';
 
 interface ProcessingViewProps {
   progress: number;
   queueInfo: TryOnQueueInfo | null;
   personImage: string | null;
   onContinueShopping?: () => void;
   onCancel?: () => void;
 }
 
 export function ProcessingView({
   progress,
   queueInfo,
   personImage,
   onContinueShopping,
   onCancel,
 }: ProcessingViewProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format elapsed time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Estimate remaining time based on progress
  const getEstimatedRemaining = () => {
    if (progress <= 30) return '1-3 phút';
    if (progress <= 80) return '30 giây - 2 phút';
    if (progress < 100) return 'Sắp xong...';
    return 'Hoàn thành!';
  };
 
   return (
     <div className="space-y-4 sm:space-y-6">
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div>
           <p className="text-sm text-gray-500 mb-2">Ảnh đã upload</p>
           {personImage && (
             <img
               src={personImage}
               alt="Your photo"
               className="w-full h-40 sm:h-48 object-contain rounded-lg bg-gray-100"
             />
           )}
         </div>
         <div>
           <p className="text-sm text-gray-500 mb-2">Đang xử lý</p>
           <div className="w-full h-40 sm:h-48 flex flex-col items-center justify-center bg-gray-100 rounded-lg">
             <Loader2 className="w-10 sm:w-12 h-10 sm:h-12 text-pink-500 animate-spin mb-3 sm:mb-4" />
             {queueInfo && (
               <p className="text-sm text-gray-600 mb-2">
                 Vị trí hàng đợi: {queueInfo.position} / {queueInfo.total}
               </p>
             )}
             <div className="w-24 sm:w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
               <div
                 className="h-full bg-pink-500 transition-all duration-300"
                 style={{ width: `${progress}%` }}
               />
             </div>
            <div className="text-center mt-2 space-y-1">
              <p className="text-xs sm:text-sm text-gray-600 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Đã chờ: {formatTime(elapsedTime)}
              </p>
              <p className="text-xs text-gray-400">
                Ước tính còn: {getEstimatedRemaining()}
              </p>
            </div>
           </div>
         </div>
       </div>
 
       <div className="p-2 sm:p-3 bg-yellow-50 rounded-lg">
         <div className="flex gap-2">
           <Lightbulb className="w-4 sm:w-5 h-4 sm:h-5 text-yellow-600 flex-shrink-0" />
           <p className="text-xs sm:text-sm text-yellow-700">
             <strong>Mẹo:</strong> Bạn có thể đóng modal và tiếp tục xem sản phẩm khác.
           </p>
         </div>
       </div>
 
       <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
         {onContinueShopping && (
           <button
             type="button"
             onClick={onContinueShopping}
             className="flex-1 py-2.5 sm:py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
           >
             Tiếp tục shopping
           </button>
         )}
         {onCancel && (
           <button
             type="button"
             onClick={onCancel}
             className="py-2.5 sm:py-2 px-4 text-red-600 hover:bg-red-50 rounded-lg text-sm"
           >
             Hủy xử lý
           </button>
         )}
       </div>
     </div>
   );
 }
 
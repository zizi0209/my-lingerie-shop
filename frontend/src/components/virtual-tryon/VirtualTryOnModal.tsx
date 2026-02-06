'use client';
 
 import { useState, useCallback, useEffect } from 'react';
 import { X, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
 import { PhotoUploader } from './PhotoUploader';
 import { ConsentCheckbox } from './ConsentCheckbox';
 import { ProcessingView } from './ProcessingView';
 import { ResultView } from './ResultView';
 import { useVirtualTryOn } from '@/hooks/useVirtualTryOn';
 
 interface Product {
   id: string;
   name: string;
   imageUrl: string;
 }
 
 interface VirtualTryOnModalProps {
   isOpen: boolean;
   onClose: () => void;
   product: Product;
   onAddToCart?: () => void;
 }
 
 export function VirtualTryOnModal({ isOpen, onClose, product, onAddToCart }: VirtualTryOnModalProps) {
   const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
   const [consent, setConsent] = useState(false);
   const { status, progress, queueInfo, result, error, startTryOn, reset, isLoading, isCompleted } =
     useVirtualTryOn();
 
   const handleStartTryOn = useCallback(async () => {
     if (!selectedPhoto || !consent) return;
 
     try {
       await startTryOn({
         personImage: selectedPhoto,
         garmentImageUrl: product.imageUrl,
         productId: product.id,
         productName: product.name,
       });
     } catch {
       // Error is handled in state
     }
   }, [selectedPhoto, consent, startTryOn, product]);
 
   const handleTryAgain = useCallback(() => {
     setSelectedPhoto(null);
     reset();
   }, [reset]);
 
   const handleDownload = useCallback(() => {
     if (!result?.resultImage) return;
     const link = document.createElement('a');
     link.href = result.resultImage;
     link.download = `tryon-${product.name}.jpg`;
     link.click();
   }, [result, product.name]);
 
   const personImagePreview = selectedPhoto ? URL.createObjectURL(selectedPhoto) : null;
 
   useEffect(() => {
     return () => {
       if (personImagePreview) {
         URL.revokeObjectURL(personImagePreview);
       }
     };
   }, [personImagePreview]);
 
   if (!isOpen) return null;
 
   return (
     <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
       <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto sm:m-4">
         <div className="sticky top-0 bg-white flex items-center justify-between p-3 sm:p-4 border-b z-10">
           <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2 truncate">
             ✨ Phòng thử đồ ảo - {product.name}
           </h2>
           <button
             type="button"
             onClick={onClose}
             className="p-1 hover:bg-gray-100 rounded"
           >
             <X className="w-5 h-5" />
           </button>
         </div>
 
         <div className="p-4 sm:p-6">
           {error && (
             <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
               <div className="flex items-start gap-3">
                 <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                 <div className="flex-1">
                   <p className="text-red-700 font-medium">Không thể kết nối</p>
                   <p className="text-red-600 text-sm mt-1">{error}</p>
                   <button
                     type="button"
                     onClick={reset}
                     className="mt-3 inline-flex items-center gap-2 text-sm text-red-700 hover:text-red-800 font-medium"
                   >
                     <RefreshCw className="w-4 h-4" />
                     Thử lại
                   </button>
                 </div>
               </div>
             </div>
           )}
 
           {isLoading && (
             <ProcessingView
               progress={progress}
               queueInfo={queueInfo}
               personImage={personImagePreview}
               onContinueShopping={onClose}
               onCancel={reset}
             />
           )}
 
           {isCompleted && result && (
             <ResultView
               result={result}
               onTryAgain={handleTryAgain}
               onAddToCart={onAddToCart}
               onDownload={handleDownload}
             />
           )}
 
           {status === 'idle' && (
             <>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                 <div>
                   <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Ảnh của bạn</h3>
                   <PhotoUploader
                     onPhotoSelected={setSelectedPhoto}
                     selectedPhoto={selectedPhoto}
                     onClear={() => setSelectedPhoto(null)}
                   />
                 </div>
                 <div className="hidden md:block">
                   <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">Sản phẩm</h3>
                   <img
                     src={product.imageUrl}
                     alt={product.name}
                     className="w-full h-48 sm:h-64 object-contain rounded-lg bg-gray-100"
                   />
                   <p className="mt-2 text-center text-gray-600">{product.name}</p>
                 </div>
               </div>
 
               <div className="p-3 bg-orange-50 rounded-lg mb-4 sm:mb-6">
                 <div className="flex gap-2">
                   <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
                   <p className="text-xs sm:text-sm text-orange-700">
                     <strong>Lưu ý:</strong> Thời gian xử lý 1-5 phút tùy lượng người dùng.
                   </p>
                 </div>
               </div>
 
               <div className="mb-4 sm:mb-6">
                 <ConsentCheckbox checked={consent} onChange={setConsent} />
               </div>
 
               <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
                 <button
                   type="button"
                   onClick={onClose}
                   className="py-2.5 sm:py-2 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
                 >
                   Đóng
                 </button>
                 <button
                   type="button"
                   onClick={handleStartTryOn}
                   disabled={!selectedPhoto || !consent}
                   className="flex-1 py-2.5 sm:py-2 px-6 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium"
                 >
                   ✨ Thử đồ ngay
                 </button>
               </div>
             </>
           )}
         </div>
       </div>
     </div>
   );
 }
 
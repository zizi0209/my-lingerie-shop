'use client';
 
import { useState, useCallback, useEffect, useMemo } from 'react';
 import { X, AlertTriangle, RefreshCw, ArrowLeft, Sparkles, Shield, ImageIcon } from 'lucide-react';
 import { PhotoUploader } from './PhotoUploader';
 import { ConsentCheckbox } from './ConsentCheckbox';
 import { ProcessingView } from './ProcessingView';
 import { ResultView } from './ResultView';
import { PoseGuide, PoseGuideTips } from './PoseGuide';
import { TryOnModeSelector, type TryOnMode } from './TryOnModeSelector';
import { LiveTryOnModal } from './LiveTryOnModal';
 import { useVirtualTryOn } from '@/hooks/useVirtualTryOn';
import type { PoseValidationResult } from '@/services/pose-detection';
import type { ProductType } from '@/services/clothing-overlay';
 
 interface Product {
   id: string;
   name: string;
   imageUrl: string;
  productType?: ProductType;
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
  const [poseValidation, setPoseValidation] = useState<PoseValidationResult | null>(null);
  const [selectedMode, setSelectedMode] = useState<TryOnMode | null>(null);
  const [showLiveTryOn, setShowLiveTryOn] = useState(false);
   const { status, progress, queueInfo, result, error, startTryOn, reset, isLoading, isCompleted } =
     useVirtualTryOn();
 
  // Check if pose is valid enough to proceed
  const canProceed = useMemo(() => {
    if (!selectedPhoto || !consent) return false;
    if (!poseValidation) return true;
    return poseValidation.valid || poseValidation.score >= 50;
  }, [selectedPhoto, consent, poseValidation]);
 
  const handlePoseValidation = useCallback((validationResult: PoseValidationResult) => {
    setPoseValidation(validationResult);
  }, []);

  const handleSelectMode = useCallback((mode: TryOnMode) => {
    setSelectedMode(mode);
    if (mode === 'live') {
      setShowLiveTryOn(true);
    }
  }, []);

  const handleBackToModeSelect = useCallback(() => {
    setSelectedMode(null);
    setSelectedPhoto(null);
    setPoseValidation(null);
    reset();
  }, [reset]);
 
   const handleStartTryOn = useCallback(async () => {
    if (!canProceed) return;
 
     try {
       await startTryOn({
        personImage: selectedPhoto!,
         garmentImageUrl: product.imageUrl,
         productId: product.id,
         productName: product.name,
       });
     } catch {
       // Error is handled in state
     }
  }, [canProceed, selectedPhoto, startTryOn, product]);
 
   const handleTryAgain = useCallback(() => {
     setSelectedPhoto(null);
    setPoseValidation(null);
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
 
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMode(null);
      setShowLiveTryOn(false);
      setSelectedPhoto(null);
      setPoseValidation(null);
      setConsent(false);
    }
  }, [isOpen]);

   if (!isOpen) return null;
 
  // Show LiveTryOnModal fullscreen
  if (showLiveTryOn) {
    return (
      <LiveTryOnModal
        isOpen={showLiveTryOn}
        onClose={() => {
          setShowLiveTryOn(false);
          setSelectedMode(null);
        }}
        product={product}
      />
    );
  }

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
 
          {status === 'idle' && !selectedMode && (
            <>
              <TryOnModeSelector
                onSelectMode={handleSelectMode}
                productName={product.name}
              />
            </>
          )}

          {status === 'idle' && selectedMode === 'ai' && (
             <>
              {/* Header with back button */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  type="button"
                  onClick={handleBackToModeSelect}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Quay lại"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Tạo ảnh thử đồ bằng AI
                  </h3>
                  <p className="text-sm text-gray-500">Upload ảnh toàn thân để AI tạo ảnh bạn mặc sản phẩm</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                {/* Left: Photo upload/preview - takes 3 cols */}
                <div className="lg:col-span-3">
                  {!selectedPhoto ? (
                    <div className="space-y-4">
                      <PhotoUploader
                        onPhotoSelected={setSelectedPhoto}
                        selectedPhoto={selectedPhoto}
                        onClear={() => {
                          setSelectedPhoto(null);
                          setPoseValidation(null);
                        }}
                      />
                      <PoseGuideTips />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <PoseGuide
                        imageFile={selectedPhoto}
                        onValidationComplete={handlePoseValidation}
                        showOverlay={true}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPhoto(null);
                          setPoseValidation(null);
                        }}
                        className="w-full py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Chọn ảnh khác
                      </button>
                    </div>
                  )}
                 </div>

                {/* Right: Product preview - takes 2 cols */}
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Sản phẩm thử</span>
                    </div>
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-44 object-contain rounded-lg bg-white"
                    />
                    <p className="mt-3 text-center text-sm font-medium text-gray-800">{product.name}</p>
                  </div>

                  {/* Info cards */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                      <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                      <p className="text-xs text-purple-700">Thời gian xử lý: 1-5 phút tùy lượng người dùng</p>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                      <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <p className="text-xs text-green-700">Ảnh được xóa ngay sau khi xử lý xong</p>
                    </div>
                  </div>
                 </div>
               </div>
 
              {/* Consent */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <ConsentCheckbox checked={consent} onChange={setConsent} />
              </div>
 
              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                 <button
                   type="button"
                   onClick={onClose}
                   className="py-2.5 px-6 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                 >
                   Đóng
                 </button>
                 <button
                   type="button"
                   onClick={handleStartTryOn}
                   disabled={!canProceed}
                   className={`flex-1 py-2.5 px-6 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                     canProceed
                       ? 'bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200'
                       : 'bg-gray-300 cursor-not-allowed'
                   }`}
                 >
                   <Sparkles className="w-4 h-4" />
                   {poseValidation && !poseValidation.valid && poseValidation.score < 50
                     ? 'Cần điều chỉnh tư thế'
                     : 'Tạo ảnh thử đồ'}
                 </button>
               </div>
             </>
           )}
         </div>
       </div>
     </div>
   );
 }
 
 'use client';
 
 import { useState, useRef, useCallback, useEffect } from 'react';
 import { X, Camera, RotateCcw, Download, Loader2, AlertCircle } from 'lucide-react';
 import Webcam from 'react-webcam';
import { detectPoseFromVideo, initPoseLandmarkerVideo } from '@/services/pose-detection';
 import {
   calculateOverlayPosition,
   drawClothingOverlay,
   drawMultipleClothingOverlay,
   canOverlay,
   getOverlayGuidance,
   type ProductType,
  type OverlayPosition,
 } from '@/services/clothing-overlay';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
 
 interface Product {
   id: string;
   name: string;
   imageUrl: string;
   productType?: ProductType;
 }
 
 interface LiveTryOnModalProps {
   isOpen: boolean;
   onClose: () => void;
   product: Product;
 }
 
 export function LiveTryOnModal({ isOpen, onClose, product }: LiveTryOnModalProps) {
   const webcamRef = useRef<Webcam>(null);
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const animationRef = useRef<number | null>(null);
   const clothingImageRef = useRef<HTMLImageElement | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const smoothedLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const lastOverlayRef = useRef<OverlayPosition | OverlayPosition[] | null>(null);
  const lastOverlayTimeRef = useRef<number>(0);
  const lostPoseFramesRef = useRef<number>(0);
 
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
   const [isPoseDetected, setIsPoseDetected] = useState(false);
   const [capturedImage, setCapturedImage] = useState<string | null>(null);
 
   const productType: ProductType = product.productType || 'BRA';

  const SMOOTHING_ALPHA = 0.6;
  const OVERLAY_GRACE_MS = 250;
  const MAX_LOST_FRAMES = 6;

  const smoothLandmarks = useCallback(
    (previous: NormalizedLandmark[] | null, next: NormalizedLandmark[]): NormalizedLandmark[] => {
      if (!previous || previous.length !== next.length) return next;
      return next.map((point, index) => {
        const prev = previous[index];
        const prevVisibility = prev.visibility ?? 0;
        const nextVisibility = point.visibility ?? prevVisibility;
        return {
          ...point,
          x: prev.x + (point.x - prev.x) * SMOOTHING_ALPHA,
          y: prev.y + (point.y - prev.y) * SMOOTHING_ALPHA,
          z: prev.z + (point.z - prev.z) * SMOOTHING_ALPHA,
          visibility: prevVisibility + (nextVisibility - prevVisibility) * SMOOTHING_ALPHA,
        };
      });
    },
    [SMOOTHING_ALPHA]
  );
 
   // Load clothing image
   useEffect(() => {
     if (!isOpen) return;
 
     const img = new Image();
     img.crossOrigin = 'anonymous';
     img.onload = () => {
       clothingImageRef.current = img;
       console.log('[LiveTryOn] Clothing image loaded');
     };
     img.onerror = () => {
       console.error('[LiveTryOn] Failed to load clothing image');
       setError('Không thể tải ảnh sản phẩm');
     };
     img.src = product.imageUrl;
 
     return () => {
       clothingImageRef.current = null;
     };
   }, [isOpen, product.imageUrl]);
 
   // Initialize pose landmarker
   useEffect(() => {
     if (!isOpen) return;
 
     setIsLoading(true);
     setError(null);
 
     initPoseLandmarkerVideo()
       .then(() => {
         setIsLoading(false);
         console.log('[LiveTryOn] Pose landmarker ready');
       })
       .catch((err) => {
         console.error('[LiveTryOn] Failed to init pose landmarker:', err);
         setError('Không thể khởi tạo nhận dạng tư thế');
         setIsLoading(false);
       });
 
     return () => {
       if (animationRef.current) {
         cancelAnimationFrame(animationRef.current);
       }
     };
   }, [isOpen]);
 
   // Real-time pose detection and overlay
   const processFrame = useCallback(async () => {
     const video = webcamRef.current?.video;
     const canvas = canvasRef.current;
     const clothingImage = clothingImageRef.current;
 
     if (!video || !canvas || !clothingImage || video.readyState !== 4) {
       animationRef.current = requestAnimationFrame(processFrame);
       return;
     }
 
    // CRITICAL: Validate video is fully ready with valid dimensions
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh || vw <= 0 || vh <= 0) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Throttle to ~30fps and skip first few frames to let video stabilize
    const now = performance.now();
    frameCountRef.current++;
    if (frameCountRef.current < 10 || now - lastProcessTimeRef.current < 33) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    lastProcessTimeRef.current = now;

     const ctx = canvas.getContext('2d');
     if (!ctx) {
       animationRef.current = requestAnimationFrame(processFrame);
       return;
     }
 
     // Set canvas size to match video
     if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = vw;
      canvas.height = vh;
     }
 
     // Clear canvas
     ctx.clearRect(0, 0, canvas.width, canvas.height);
 
     // Detect pose
    let landmarks: Awaited<ReturnType<typeof detectPoseFromVideo>> = null;
    try {
      landmarks = await detectPoseFromVideo(video, now);
    } catch (err) {
      // Silently skip frame on MediaPipe errors
      // Silently handle MediaPipe errors (e.g., ROI issues during initialization)
      // These typically resolve once video is fully ready
      if (!(err instanceof Error && err.message.includes('ROI'))) {
        console.warn('[LiveTryOn] Pose detection error:', err);
      }
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
 
    if (landmarks) {
      lostPoseFramesRef.current = 0;
      smoothedLandmarksRef.current = smoothLandmarks(smoothedLandmarksRef.current, landmarks);
    } else {
      lostPoseFramesRef.current += 1;
    }

    const activeLandmarks = smoothedLandmarksRef.current;
    const canDraw = activeLandmarks ? canOverlay(activeLandmarks, productType) : false;

    if (activeLandmarks && canDraw) {
       setIsPoseDetected(true);
 
       // Calculate overlay position
       const position = calculateOverlayPosition(
        activeLandmarks,
         productType,
         canvas.width,
         canvas.height
       );

      lastOverlayRef.current = position;
      lastOverlayTimeRef.current = now;
 
       // Draw clothing overlay
       if (Array.isArray(position)) {
         // SET: multiple overlays
         drawMultipleClothingOverlay(ctx, [clothingImage, clothingImage], position, {
           opacity: 0.85,
           flipHorizontal: facingMode === 'user',
         });
       } else {
         drawClothingOverlay(ctx, clothingImage, position, {
           opacity: 0.85,
           flipHorizontal: facingMode === 'user',
         });
       }
    } else if (
      lastOverlayRef.current &&
      now - lastOverlayTimeRef.current < OVERLAY_GRACE_MS &&
      lostPoseFramesRef.current <= MAX_LOST_FRAMES
    ) {
      setIsPoseDetected(true);
      const position = lastOverlayRef.current;
      if (Array.isArray(position)) {
        drawMultipleClothingOverlay(ctx, [clothingImage, clothingImage], position, {
          opacity: 0.7,
          flipHorizontal: facingMode === 'user',
        });
      } else {
        drawClothingOverlay(ctx, clothingImage, position, {
          opacity: 0.7,
          flipHorizontal: facingMode === 'user',
        });
      }
     } else {
       setIsPoseDetected(false);
     }
 
     animationRef.current = requestAnimationFrame(processFrame);
   }, [productType, facingMode]);
 
   // Start processing when webcam is ready
   const handleWebcamReady = useCallback(() => {
     console.log('[LiveTryOn] Webcam ready, starting frame processing');
    frameCountRef.current = 0;
    lastProcessTimeRef.current = 0;
    smoothedLandmarksRef.current = null;
    lastOverlayRef.current = null;
    lastOverlayTimeRef.current = 0;
    lostPoseFramesRef.current = 0;
     if (animationRef.current) {
       cancelAnimationFrame(animationRef.current);
     }
     animationRef.current = requestAnimationFrame(processFrame);
   }, [processFrame]);
 
   // Switch camera
   const handleSwitchCamera = useCallback(() => {
     setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
   }, []);
 
   // Capture current frame
   const handleCapture = useCallback(() => {
     const video = webcamRef.current?.video;
     const overlayCanvas = canvasRef.current;
 
     if (!video || !overlayCanvas) return;
 
     // Create a combined canvas
     const captureCanvas = document.createElement('canvas');
     captureCanvas.width = video.videoWidth;
     captureCanvas.height = video.videoHeight;
     const ctx = captureCanvas.getContext('2d');
 
     if (!ctx) return;
 
     // Flip if using front camera
     if (facingMode === 'user') {
       ctx.translate(captureCanvas.width, 0);
       ctx.scale(-1, 1);
     }
 
     // Draw video frame
     ctx.drawImage(video, 0, 0);
 
     // Reset transform for overlay
     if (facingMode === 'user') {
       ctx.setTransform(1, 0, 0, 1, 0, 0);
     }
 
     // Draw overlay canvas on top (already flipped in overlay logic)
     ctx.drawImage(overlayCanvas, 0, 0);
 
     // Get data URL
     const dataUrl = captureCanvas.toDataURL('image/jpeg', 0.9);
     setCapturedImage(dataUrl);
   }, [facingMode]);
 
   // Download captured image
   const handleDownload = useCallback(() => {
     if (!capturedImage) return;
 
     const link = document.createElement('a');
     link.href = capturedImage;
     link.download = `tryon-${product.name}-${Date.now()}.jpg`;
     link.click();
   }, [capturedImage, product.name]);
 
   // Reset captured image
   const handleRetake = useCallback(() => {
     setCapturedImage(null);
   }, []);
 
   // Cleanup on close
   useEffect(() => {
     if (!isOpen) {
       if (animationRef.current) {
         cancelAnimationFrame(animationRef.current);
         animationRef.current = null;
       }
       setCapturedImage(null);
       setIsPoseDetected(false);
     }
   }, [isOpen]);
 
   if (!isOpen) return null;
 
   return (
     <div className="fixed inset-0 z-50 bg-black">
       {/* Header */}
       <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/70 to-transparent p-4">
         <div className="flex items-center justify-between">
           <div className="text-white">
             <h2 className="text-lg font-semibold truncate max-w-[70vw]">
               {product.name}
             </h2>
             <p className="text-sm text-white/70">Xem trước trực tiếp</p>
           </div>
           <button
             type="button"
             onClick={onClose}
             className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
           >
             <X className="w-6 h-6 text-white" />
           </button>
         </div>
       </div>
 
       {/* Main content */}
       <div className="relative w-full h-full flex items-center justify-center">
         {/* Loading state */}
         {isLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
             <div className="text-center text-white">
               <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
               <p>Đang khởi tạo camera...</p>
             </div>
           </div>
         )}
 
         {/* Error state */}
         {error && (
           <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
             <div className="text-center text-white p-6">
               <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
               <p className="text-lg mb-4">{error}</p>
               <button
                 type="button"
                 onClick={onClose}
                 className="px-6 py-2 bg-white text-black rounded-lg"
               >
                 Đóng
               </button>
             </div>
           </div>
         )}
 
         {/* Captured image preview */}
         {capturedImage ? (
           <div className="relative w-full h-full">
             <img
               src={capturedImage}
               alt="Captured"
               className="w-full h-full object-contain"
             />
           </div>
         ) : (
           <>
             {/* Webcam */}
             <Webcam
               ref={webcamRef}
               audio={false}
               videoConstraints={{
                 facingMode,
                 width: { ideal: 1280 },
                 height: { ideal: 720 },
               }}
               onUserMedia={handleWebcamReady}
               onUserMediaError={() => setError('Không thể truy cập camera')}
               mirrored={facingMode === 'user'}
               className="w-full h-full object-contain"
             />
 
             {/* Overlay canvas */}
             <canvas
               ref={canvasRef}
               className="absolute inset-0 w-full h-full object-contain pointer-events-none"
               style={{
                 transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
               }}
             />
           </>
         )}
 
         {/* Pose status indicator */}
         {!capturedImage && !isLoading && !error && (
           <div
             className={`absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-10 transition-colors ${
               isPoseDetected
                 ? 'bg-green-500/80 text-white'
                 : 'bg-yellow-500/80 text-white'
             }`}
           >
             {isPoseDetected ? '✓ Đang overlay' : getOverlayGuidance(productType)}
           </div>
         )}
       </div>
 
       {/* Bottom controls */}
       <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent p-6">
         <div className="flex items-center justify-center gap-6">
           {capturedImage ? (
             <>
               {/* Retake button */}
               <button
                 type="button"
                 onClick={handleRetake}
                 className="flex flex-col items-center gap-1 text-white"
               >
                 <div className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                   <RotateCcw className="w-6 h-6" />
                 </div>
                 <span className="text-xs">Chụp lại</span>
               </button>
 
               {/* Download button */}
               <button
                 type="button"
                 onClick={handleDownload}
                 className="flex flex-col items-center gap-1 text-white"
               >
                 <div className="p-4 rounded-full bg-pink-500 hover:bg-pink-600 transition-colors">
                   <Download className="w-8 h-8" />
                 </div>
                 <span className="text-xs">Tải về</span>
               </button>
 
               {/* Close button */}
               <button
                 type="button"
                 onClick={onClose}
                 className="flex flex-col items-center gap-1 text-white"
               >
                 <div className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                   <X className="w-6 h-6" />
                 </div>
                 <span className="text-xs">Đóng</span>
               </button>
             </>
           ) : (
             <>
               {/* Switch camera button */}
               <button
                 type="button"
                 onClick={handleSwitchCamera}
                 className="flex flex-col items-center gap-1 text-white"
               >
                 <div className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                   <RotateCcw className="w-6 h-6" />
                 </div>
                 <span className="text-xs">Đổi camera</span>
               </button>
 
               {/* Capture button */}
               <button
                 type="button"
                 onClick={handleCapture}
                 disabled={!isPoseDetected}
                 className="flex flex-col items-center gap-1 text-white"
               >
                 <div
                   className={`p-4 rounded-full transition-colors ${
                     isPoseDetected
                       ? 'bg-pink-500 hover:bg-pink-600'
                       : 'bg-gray-500 cursor-not-allowed'
                   }`}
                 >
                   <Camera className="w-8 h-8" />
                 </div>
                 <span className="text-xs">Chụp ảnh</span>
               </button>
 
               {/* Close button */}
               <button
                 type="button"
                 onClick={onClose}
                 className="flex flex-col items-center gap-1 text-white"
               >
                 <div className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                   <X className="w-6 h-6" />
                 </div>
                 <span className="text-xs">Đóng</span>
               </button>
             </>
           )}
         </div>
 
         {/* Privacy notice */}
         <p className="text-center text-white/50 text-xs mt-4">
           🔒 Hình ảnh không được lưu trữ - 100% riêng tư
         </p>
       </div>
     </div>
   );
 }

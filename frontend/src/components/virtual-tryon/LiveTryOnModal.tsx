 'use client';
 
 import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, RotateCcw, Download, Loader2, AlertCircle, Sparkles } from 'lucide-react';
 import Webcam from 'react-webcam';
import { detectPoseFromVideo, initPoseLandmarkerVideo } from '@/services/pose-detection';
import { detectPersonMaskFromVideo, initBodySegmenterVideo } from '@/services/body-segmentation';
import { processVirtualTryOn, getErrorMessage } from '@/services/virtual-tryon-api';
 import {
   calculateOverlayPosition,
   drawClothingOverlay,
   drawMultipleClothingOverlay,
  drawClothingOverlayMesh,
  drawMultipleClothingOverlayMesh,
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
  const lastMetricsRef = useRef<{ shoulderWidth: number; hipWidth: number; torsoHeight: number } | null>(null);
  const consecutiveStableFramesRef = useRef<number>(0);
  const baselineMetricsRef = useRef<{ shoulderWidth: number; hipWidth: number; torsoHeight: number; samples: number } | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastSegmentationTimeRef = useRef<number>(0);
  const targetIntervalRef = useRef<number>(33);
  const statsRef = useRef({
    frames: 0,
    poseDetected: 0,
    overlays: 0,
    dropped: 0,
    segmentationUsed: 0,
    inferenceTotalMs: 0,
    inferenceCount: 0,
    segmentationTotalMs: 0,
    segmentationCount: 0,
    lastLogTime: 0,
  });
 
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
   const [isPoseDetected, setIsPoseDetected] = useState(false);
   const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiResultImage, setAiResultImage] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [aiProgress, setAiProgress] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
 
   const productType: ProductType = product.productType || 'BRA';

  const SMOOTHING_ALPHA = 0.6;
  const OVERLAY_GRACE_MS = 500;
  const MAX_LOST_FRAMES = 10;
  const MIN_STABLE_FRAMES = 1;
  const MAX_METRIC_JUMP = 0.35;
  const MIN_SHOULDER_WIDTH = 0.12;
  const MAX_SHOULDER_WIDTH = 0.75;
  const SEGMENTATION_INTERVAL_MS = 120;
  const CALIBRATION_SAMPLES = 12;
  const CALIBRATION_CLAMP: [number, number] = [0.9, 1.1];
  const USE_MESH_OVERLAY = false;
  const DEBUG_OVERLAY = true;

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

  const drawOverlayWithMask = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      clothingImage: HTMLImageElement,
      position: OverlayPosition | OverlayPosition[],
      opacity: number,
      useMask: boolean
    ) => {
      const overlayCanvas = overlayCanvasRef.current || document.createElement('canvas');
      overlayCanvasRef.current = overlayCanvas;
      overlayCanvas.width = ctx.canvas.width;
      overlayCanvas.height = ctx.canvas.height;

      const overlayCtx = overlayCanvas.getContext('2d');
      if (!overlayCtx) return;

      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      const isMirrored = facingMode === 'user';
      const mirrorPosition = (pos: OverlayPosition): OverlayPosition => ({
        ...pos,
        x: overlayCanvas.width - pos.x - pos.width,
        rotation: pos.rotation - Math.PI,
      });

      if (DEBUG_OVERLAY) {
        overlayCtx.save();
        overlayCtx.strokeStyle = '#22c55e';
        overlayCtx.lineWidth = 2;
        const drawDebug = (pos: OverlayPosition) => {
          const dp = isMirrored ? mirrorPosition(pos) : pos;
          overlayCtx.strokeRect(dp.x, dp.y, dp.width, dp.height);
          overlayCtx.beginPath();
          overlayCtx.arc(dp.x + dp.width / 2, dp.y + dp.height / 2, 4, 0, Math.PI * 2);
          overlayCtx.fillStyle = '#22c55e';
          overlayCtx.fill();
        };
        if (Array.isArray(position)) {
          position.forEach(drawDebug);
        } else {
          drawDebug(position);
        }
        overlayCtx.restore();
      }

      const adjustPos = (pos: OverlayPosition): OverlayPosition =>
        isMirrored ? mirrorPosition(pos) : pos;

      if (Array.isArray(position)) {
        if (USE_MESH_OVERLAY) {
          drawMultipleClothingOverlayMesh(overlayCtx, [clothingImage, clothingImage], position.map(adjustPos), {
            opacity,
          });
        } else {
          drawMultipleClothingOverlay(overlayCtx, [clothingImage, clothingImage], position.map(adjustPos), {
            opacity,
          });
        }
      } else if (USE_MESH_OVERLAY) {
        drawClothingOverlayMesh(overlayCtx, clothingImage, adjustPos(position), {
          opacity,
        });
      } else {
        drawClothingOverlay(overlayCtx, clothingImage, adjustPos(position), {
          opacity,
        });
      }

      const maskCanvas = maskCanvasRef.current;
      if (useMask && maskCanvas) {
        overlayCtx.globalCompositeOperation = 'destination-in';
        overlayCtx.drawImage(maskCanvas, 0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.globalCompositeOperation = 'source-over';
      }

      ctx.drawImage(overlayCanvas, 0, 0);
    },
    [facingMode]
  );

  const computePoseMetrics = useCallback((landmarks: NormalizedLandmark[]) => {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const hipWidth = Math.abs(rightHip.x - leftHip.x);
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipCenterY = (leftHip.y + rightHip.y) / 2;
    const torsoHeight = Math.abs(hipCenterY - shoulderCenterY);

    return { shoulderWidth, hipWidth, torsoHeight };
  }, []);

  const applyCalibrationScale = useCallback(
    (position: OverlayPosition | OverlayPosition[], scale: number): OverlayPosition | OverlayPosition[] => {
      const clampScale = Math.min(CALIBRATION_CLAMP[1], Math.max(CALIBRATION_CLAMP[0], scale));
      const adjust = (pos: OverlayPosition): OverlayPosition => {
        const centerX = pos.x + pos.width / 2;
        const centerY = pos.y + pos.height / 2;
        const width = pos.width * clampScale;
        const height = pos.height * clampScale;
        return {
          ...pos,
          width,
          height,
          x: centerX - width / 2,
          y: centerY - height / 2,
        };
      };
      return Array.isArray(position) ? position.map(adjust) : adjust(position);
    },
    []
  );

  const updateCalibration = useCallback((landmarks: NormalizedLandmark[]) => {
    const metrics = computePoseMetrics(landmarks);
    const baseline = baselineMetricsRef.current;
    if (!baseline) {
      baselineMetricsRef.current = { ...metrics, samples: 1 };
      return;
    }

    if (baseline.samples < CALIBRATION_SAMPLES) {
      const nextSamples = baseline.samples + 1;
      baselineMetricsRef.current = {
        shoulderWidth: (baseline.shoulderWidth * baseline.samples + metrics.shoulderWidth) / nextSamples,
        hipWidth: (baseline.hipWidth * baseline.samples + metrics.hipWidth) / nextSamples,
        torsoHeight: (baseline.torsoHeight * baseline.samples + metrics.torsoHeight) / nextSamples,
        samples: nextSamples,
      };
    }
  }, [computePoseMetrics]);

  const isPoseStable = useCallback(
    (landmarks: NormalizedLandmark[]) => {
      const metrics = computePoseMetrics(landmarks);
      if (metrics.shoulderWidth < MIN_SHOULDER_WIDTH || metrics.shoulderWidth > MAX_SHOULDER_WIDTH) {
        lastMetricsRef.current = metrics;
        return false;
      }

      const previous = lastMetricsRef.current;
      lastMetricsRef.current = metrics;
      if (!previous) return true;

      const shoulderJump = Math.abs(metrics.shoulderWidth - previous.shoulderWidth);
      const hipJump = Math.abs(metrics.hipWidth - previous.hipWidth);
      const torsoJump = Math.abs(metrics.torsoHeight - previous.torsoHeight);

      return shoulderJump <= MAX_METRIC_JUMP && hipJump <= MAX_METRIC_JUMP && torsoJump <= MAX_METRIC_JUMP;
    },
    [computePoseMetrics]
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
 
    initPoseLandmarkerVideo().then((landmarker) => {
      if (!landmarker) {
        setError('Thiếu model nhận dạng tư thế ở local. Vui lòng kiểm tra /public/models và /public/mediapipe/wasm.');
      }
      setIsLoading(false);
      console.log('[LiveTryOn] Pose landmarker ready');
    });

    initBodySegmenterVideo().then((segmenter) => {
      if (!segmenter) {
        console.warn('[LiveTryOn] Segmentation disabled, fallback to pose-only');
      }
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
      statsRef.current.dropped += 1;
       animationRef.current = requestAnimationFrame(processFrame);
       return;
     }
 
    // CRITICAL: Validate video is fully ready with valid dimensions
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh || vw <= 0 || vh <= 0) {
      statsRef.current.dropped += 1;
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Throttle to ~30fps and skip first few frames to let video stabilize
    const now = performance.now();
    frameCountRef.current++;
    if (frameCountRef.current < 10 || now - lastProcessTimeRef.current < targetIntervalRef.current) {
      statsRef.current.dropped += 1;
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
    const inferenceStart = performance.now();
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
    const inferenceTime = performance.now() - inferenceStart;
    statsRef.current.inferenceTotalMs += inferenceTime;
    statsRef.current.inferenceCount += 1;
 
    if (landmarks) {
      lostPoseFramesRef.current = 0;
      smoothedLandmarksRef.current = smoothLandmarks(smoothedLandmarksRef.current, landmarks);
      statsRef.current.poseDetected += 1;
    } else {
      lostPoseFramesRef.current += 1;
    }

    const activeLandmarks = smoothedLandmarksRef.current;
    const stablePose = activeLandmarks ? isPoseStable(activeLandmarks) : false;
    if (stablePose) {
      consecutiveStableFramesRef.current += 1;
    } else {
      consecutiveStableFramesRef.current = 0;
    }
    const canDraw = activeLandmarks
      ? canOverlay(activeLandmarks, productType) && stablePose && consecutiveStableFramesRef.current >= MIN_STABLE_FRAMES
      : false;

    if (activeLandmarks && canDraw) {
       setIsPoseDetected(true);
 
      if (activeLandmarks) {
        updateCalibration(activeLandmarks);
      }

      const baseline = baselineMetricsRef.current;
      const currentMetrics = activeLandmarks ? computePoseMetrics(activeLandmarks) : null;
      const scale = baseline && currentMetrics
        ? currentMetrics.shoulderWidth / baseline.shoulderWidth
        : 1;

      // Calculate overlay position
      const position = applyCalibrationScale(
        calculateOverlayPosition(
        activeLandmarks,
         productType,
         canvas.width,
         canvas.height
        ),
        scale
      );

      lastOverlayRef.current = position;
      lastOverlayTimeRef.current = now;
      statsRef.current.overlays += 1;
 
      const canSegment = now - lastSegmentationTimeRef.current > SEGMENTATION_INTERVAL_MS;
      if (canSegment) {
        lastSegmentationTimeRef.current = now;
        const segmentationStart = performance.now();
        const maskData = await detectPersonMaskFromVideo(video, now);
        const segmentationTime = performance.now() - segmentationStart;
        statsRef.current.segmentationTotalMs += segmentationTime;
        statsRef.current.segmentationCount += 1;
        if (maskData) {
          const maskCanvas = maskCanvasRef.current || document.createElement('canvas');
          maskCanvasRef.current = maskCanvas;
          maskCanvas.width = maskData.width;
          maskCanvas.height = maskData.height;
          const maskCtx = maskCanvas.getContext('2d');
          if (maskCtx) {
            maskCtx.putImageData(maskData, 0, 0);
          }
          statsRef.current.segmentationUsed += 1;
        }
      }

      const useMask = productType !== 'SHAPEWEAR';
      drawOverlayWithMask(ctx, clothingImage, position, 0.85, useMask);
    } else if (
      lastOverlayRef.current &&
      now - lastOverlayTimeRef.current < OVERLAY_GRACE_MS &&
      lostPoseFramesRef.current <= MAX_LOST_FRAMES
    ) {
      setIsPoseDetected(true);
      const position = lastOverlayRef.current;
      drawOverlayWithMask(ctx, clothingImage, position, 0.7, productType !== 'SHAPEWEAR');
     } else {
       setIsPoseDetected(false);
     }

    statsRef.current.frames += 1;
    const statsNow = performance.now();
    if (statsNow - statsRef.current.lastLogTime > 5000) {
      const {
        frames,
        poseDetected,
        overlays,
        dropped,
        inferenceTotalMs,
        inferenceCount,
        segmentationTotalMs,
        segmentationCount,
        segmentationUsed,
      } = statsRef.current;
      const avgInference = inferenceCount > 0 ? Math.round(inferenceTotalMs / inferenceCount) : 0;
      const avgSegmentation = segmentationCount > 0 ? Math.round(segmentationTotalMs / segmentationCount) : 0;
      const nextInterval = avgInference > 45 ? 66 : avgInference > 30 ? 50 : 33;
      targetIntervalRef.current = nextInterval;
      console.info('[TryOn] telemetry', {
        frames,
        poseSuccessRate: frames > 0 ? Math.round((poseDetected / frames) * 100) : 0,
        overlayRate: frames > 0 ? Math.round((overlays / frames) * 100) : 0,
        droppedFrames: dropped,
        avgInferenceMs: avgInference,
        avgSegmentationMs: avgSegmentation,
        segmentationUsed,
        targetIntervalMs: nextInterval,
      });
      statsRef.current.lastLogTime = statsNow;
      statsRef.current.frames = 0;
      statsRef.current.poseDetected = 0;
      statsRef.current.overlays = 0;
      statsRef.current.dropped = 0;
      statsRef.current.segmentationUsed = 0;
      statsRef.current.inferenceTotalMs = 0;
      statsRef.current.inferenceCount = 0;
      statsRef.current.segmentationTotalMs = 0;
      statsRef.current.segmentationCount = 0;
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
    lastMetricsRef.current = null;
    consecutiveStableFramesRef.current = 0;
    baselineMetricsRef.current = null;
    statsRef.current.lastLogTime = performance.now();
    lastSegmentationTimeRef.current = 0;
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
    const imageToDownload = aiResultImage ?? capturedImage;
    if (!imageToDownload) return;
 
     const link = document.createElement('a');
    link.href = imageToDownload;
     link.download = `tryon-${product.name}-${Date.now()}.jpg`;
     link.click();
  }, [aiResultImage, capturedImage, product.name]);

  const dataUrlToFile = useCallback(async (dataUrl: string, fileName: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  }, []);

  const handleEnhanceWithAI = useCallback(async () => {
    if (!capturedImage || aiStatus === 'loading') return;
    setAiStatus('loading');
    setAiError(null);
    setAiProgress(0);
    setAiMessage('');

    try {
      const personImage = await dataUrlToFile(capturedImage, `tryon-${product.id}.jpg`);
      const result = await processVirtualTryOn(
        {
          personImage,
          garmentImageUrl: product.imageUrl,
          productId: product.id,
          productName: product.name,
        },
        (progress, message) => {
          setAiProgress(progress);
          if (message) setAiMessage(message);
        }
      );

      setAiResultImage(result.resultImage);
      setAiStatus('idle');
    } catch (err) {
      const message = err instanceof Error ? getErrorMessage(err) : 'Không thể xử lý ảnh chất lượng cao.';
      setAiError(message);
      setAiStatus('error');
    }
  }, [aiStatus, capturedImage, dataUrlToFile, product.id, product.imageUrl, product.name]);
 
   // Reset captured image
   const handleRetake = useCallback(() => {
     setCapturedImage(null);
    setAiResultImage(null);
    setAiStatus('idle');
    setAiProgress(0);
    setAiMessage('');
    setAiError(null);
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
             {aiStatus === 'loading' && (
               <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                 <div className="text-center text-white">
                   <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
                   <p className="text-sm">{aiMessage || 'Đang tạo ảnh chất lượng cao...'}</p>
                   <p className="text-xs text-white/70 mt-2">{aiProgress}%</p>
                 </div>
               </div>
             )}
             {aiError && (
               <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                 <div className="text-center text-white px-6">
                   <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                   <p className="text-sm">{aiError}</p>
                 </div>
               </div>
             )}
             <img
               src={aiResultImage ?? capturedImage}
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

              {/* AI enhance button */}
              <button
                type="button"
                onClick={handleEnhanceWithAI}
                disabled={aiStatus === 'loading'}
                className="flex flex-col items-center gap-1 text-white"
              >
                <div className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-xs">Ảnh chất lượng cao</span>
              </button>

              {/* Original toggle */}
              {aiResultImage && (
                <button
                  type="button"
                  onClick={() => setAiResultImage(null)}
                  className="flex flex-col items-center gap-1 text-white"
                >
                  <div className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <span className="text-xs">Ảnh gốc</span>
                </button>
              )}
 
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

import { detectPose } from '@/services/pose-detection';
import { detectPersonMaskFromImage } from '@/services/body-segmentation';
import {
  calculateOverlayPosition,
  drawClothingOverlay,
  drawClothingOverlayMesh,
  getFitProfile,
  type FitProfile,
  type ProductType,
  type OverlayPosition,
} from '@/services/clothing-overlay';
import { removeBackgroundClient } from '@/services/client-bg-removal';
import { isOnnxTryOnEnabled, runOnnxTryOn } from '@/services/onnx-tryon';
import { processVirtualTryOn, isRemoteTryOnEnabled } from '@/services/virtual-tryon-api';
import type { TryOnResult } from '@/types/virtual-tryon';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

const LANDMARK = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
};

interface PhotoTryOnRequest {
  personImage: File;
  garmentImageUrl: string;
  garmentNoBgUrl?: string | null;
  productId: string;
  productName: string;
  productType: ProductType;
  wantsVideo?: boolean;
  videoDurationSeconds?: number;
}

type ProgressCallback = (progress: number, message?: string) => void;

const DEBUG_TRYON_OVERLAY = process.env.NEXT_PUBLIC_TRYON_DEBUG_OVERLAY === 'true';
const ALLOW_LOCAL_FALLBACK = false;

interface BodyMetrics {
  shoulderWidth: number;
  hipWidth: number;
  torsoHeight: number;
  hipToKneeHeight: number;
  shoulderToKneeHeight: number;
}

const computeBodyMetrics = (landmarks: NormalizedLandmark[]): BodyMetrics => {
  const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK.LEFT_HIP];
  const rightHip = landmarks[LANDMARK.RIGHT_HIP];
  const leftKnee = landmarks[LANDMARK.LEFT_KNEE];
  const rightKnee = landmarks[LANDMARK.RIGHT_KNEE];

  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const hipWidth = Math.abs(rightHip.x - leftHip.x);
  const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipCenterY = (leftHip.y + rightHip.y) / 2;
  const kneeCenterY = (leftKnee.y + rightKnee.y) / 2;

  return {
    shoulderWidth,
    hipWidth,
    torsoHeight: Math.abs(hipCenterY - shoulderCenterY),
    hipToKneeHeight: Math.abs(kneeCenterY - hipCenterY),
    shoulderToKneeHeight: Math.abs(kneeCenterY - shoulderCenterY),
  };
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không thể tải ảnh'));
    img.src = src;
  });
}

async function getExifOrientation(file: File): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0, false) !== 0xffd8) return 1;
    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker === 0xffe1) {
        offset += 2;
        if (view.getUint32(offset, false) !== 0x45786966) return 1;
        offset += 6;
        const little = view.getUint16(offset, false) === 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (let i = 0; i < tags; i += 1) {
          const tagOffset = offset + i * 12;
          if (view.getUint16(tagOffset, little) === 0x0112) {
            return view.getUint16(tagOffset + 8, little) || 1;
          }
        }
        return 1;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      offset += view.getUint16(offset, false);
    }
    return 1;
  } catch {
    return 1;
  }
}

function drawWithOrientation(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  orientation: number
): void {
  ctx.save();
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      break;
  }
  ctx.drawImage(image, 0, 0, width, height);
  ctx.restore();
}

async function createOrientedCanvas(file: File): Promise<HTMLCanvasElement> {
  const orientation = await getExifOrientation(file);
  const dataUrl = await fileToDataUrl(file);

  let source: CanvasImageSource | null = null;
  let width = 0;
  let height = 0;

  try {
    const bitmap = await createImageBitmap(file);
    source = bitmap;
    width = bitmap.width;
    height = bitmap.height;
  } catch {
    const image = await loadImage(dataUrl, false);
    source = image;
    width = image.width;
    height = image.height;
  }

  if (!source) {
    throw new Error('Không thể đọc ảnh.');
  }

  const shouldSwap = orientation >= 5 && orientation <= 8;
  const canvas = document.createElement('canvas');
  canvas.width = shouldSwap ? height : width;
  canvas.height = shouldSwap ? width : height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể tạo canvas từ ảnh.');
  }
  drawWithOrientation(ctx, source, width, height, orientation);

  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    source.close();
  }

  return canvas;
}

type RenderMode = 'flat' | 'mesh' | 'mesh-strong';

function drawOverlayWithMask(
  ctx: CanvasRenderingContext2D,
  clothingImage: HTMLImageElement,
  position: OverlayPosition | OverlayPosition[],
  maskData: ImageData | null,
  renderMode: RenderMode | RenderMode[],
  fitProfiles: FitProfile | FitProfile[],
  options?: { opacity?: number; blurRadius?: number }
): void {
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = ctx.canvas.width;
  overlayCanvas.height = ctx.canvas.height;

  const overlayCtx = overlayCanvas.getContext('2d');
  if (!overlayCtx) return;

  const opacity = options?.opacity ?? 0.95;
  const blurRadius = options?.blurRadius ?? 10;

  const drawSingle = (
    targetCtx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    pos: OverlayPosition,
    mode: RenderMode,
    profile: FitProfile
  ): void => {
    if (mode === 'mesh' || mode === 'mesh-strong') {
      drawClothingOverlayMesh(targetCtx, image, pos, { opacity, fitProfile: profile });
    } else {
      drawClothingOverlay(targetCtx, image, pos, { opacity });
    }
  };

  if (Array.isArray(position)) {
    position.forEach((pos, index) => {
      const mode = Array.isArray(renderMode) ? renderMode[index] ?? renderMode[0] : renderMode;
      const profile = Array.isArray(fitProfiles) ? fitProfiles[index] ?? fitProfiles[0] : fitProfiles;
      drawSingle(overlayCtx, clothingImage, pos, mode, profile);
    });
  } else {
    const mode = Array.isArray(renderMode) ? renderMode[0] : renderMode;
    const profile = Array.isArray(fitProfiles) ? fitProfiles[0] : fitProfiles;
    drawSingle(overlayCtx, clothingImage, position, mode, profile);
  }

  if (maskData) {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskData.width;
    maskCanvas.height = maskData.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (maskCtx) {
      maskCtx.putImageData(maskData, 0, 0);
      const scaledMaskCanvas = document.createElement('canvas');
      scaledMaskCanvas.width = overlayCanvas.width;
      scaledMaskCanvas.height = overlayCanvas.height;
      const scaledCtx = scaledMaskCanvas.getContext('2d');
      if (scaledCtx) {
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.imageSmoothingQuality = 'high';
        scaledCtx.drawImage(maskCanvas, 0, 0, scaledMaskCanvas.width, scaledMaskCanvas.height);
        scaledCtx.filter = `blur(${blurRadius}px)`;
        scaledCtx.drawImage(scaledMaskCanvas, 0, 0);
        scaledCtx.filter = 'none';
      }

      overlayCtx.globalCompositeOperation = 'destination-in';
      overlayCtx.drawImage(scaledMaskCanvas, 0, 0);
      overlayCtx.globalCompositeOperation = 'source-over';
    }
  }

  ctx.drawImage(overlayCanvas, 0, 0);
}

function isDistortedPosition(
  position: OverlayPosition,
  metrics: BodyMetrics,
  productType: ProductType,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  if (!position.visible || position.width <= 0 || position.height <= 0) return true;
  const expectedWidth = ((metrics.shoulderWidth + metrics.hipWidth) / 2) * canvasWidth;
  const expectedHeight =
    productType === 'PANTY'
      ? metrics.hipToKneeHeight * canvasHeight
      : productType === 'SLEEPWEAR'
        ? metrics.shoulderToKneeHeight * canvasHeight
        : metrics.torsoHeight * canvasHeight;
  const safeWidth = Math.max(expectedWidth, canvasWidth * 0.1);
  const safeHeight = Math.max(expectedHeight, canvasHeight * 0.12);

  if (position.height > canvasHeight * 1.15) return true;
  if (position.width < canvasWidth * 0.07) return true;
  if (position.width < safeWidth * 0.55 || position.width > safeWidth * 1.9) return true;
  if (position.height < safeHeight * 0.55 || position.height > safeHeight * 2.1) return true;
  const ratio = position.width / position.height;
  return ratio < 0.2 || ratio > 2.5;
}

function buildFallbackPosition(
  landmarks: NormalizedLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  indices: number[],
  paddingX: number,
  paddingY: number
): OverlayPosition {
  const points = indices.map((index) => landmarks[index]);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  const width = Math.max(0.01, maxX - minX);
  const height = Math.max(0.01, maxY - minY);

  return {
    x: (minX - paddingX) * canvasWidth,
    y: (minY - paddingY) * canvasHeight,
    width: (width + paddingX * 2) * canvasWidth,
    height: (height + paddingY * 2) * canvasHeight,
    rotation: 0,
    visible: true,
    shoulderRatio: 1,
    bodyAngle: 0,
  };
}

function normalizeOverlayPosition(
  position: OverlayPosition | OverlayPosition[],
  landmarks: NormalizedLandmark[],
  productType: ProductType,
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition | OverlayPosition[] {
  const metrics = computeBodyMetrics(landmarks);
  const braIndices = [
    LANDMARK.LEFT_SHOULDER,
    LANDMARK.RIGHT_SHOULDER,
    LANDMARK.LEFT_HIP,
    LANDMARK.RIGHT_HIP,
  ];
  const pantyIndices = [
    LANDMARK.LEFT_HIP,
    LANDMARK.RIGHT_HIP,
    LANDMARK.LEFT_KNEE,
    LANDMARK.RIGHT_KNEE,
  ];
  const sleepwearIndices = [
    LANDMARK.LEFT_SHOULDER,
    LANDMARK.RIGHT_SHOULDER,
    LANDMARK.LEFT_KNEE,
    LANDMARK.RIGHT_KNEE,
  ];

  const fallbackSingle = (): OverlayPosition => {
    switch (productType) {
      case 'BRA':
        return buildFallbackPosition(landmarks, canvasWidth, canvasHeight, braIndices, 0.22, 0.12);
      case 'PANTY':
        return buildFallbackPosition(landmarks, canvasWidth, canvasHeight, pantyIndices, 0.2, 0.1);
      case 'SLEEPWEAR':
        return buildFallbackPosition(landmarks, canvasWidth, canvasHeight, sleepwearIndices, 0.3, 0.1);
      case 'SHAPEWEAR':
        return buildFallbackPosition(landmarks, canvasWidth, canvasHeight, braIndices, 0.22, 0.08);
      default:
        return buildFallbackPosition(landmarks, canvasWidth, canvasHeight, braIndices, 0.2, 0.1);
    }
  };

  if (Array.isArray(position)) {
    return position.map((pos, index) => {
      const partType = productType === 'SET' ? (index === 0 ? 'BRA' : 'PANTY') : productType;
      if (!isDistortedPosition(pos, metrics, partType, canvasWidth, canvasHeight)) return pos;
      if (productType === 'SET') {
        return index === 0
          ? buildFallbackPosition(landmarks, canvasWidth, canvasHeight, braIndices, 0.22, 0.12)
          : buildFallbackPosition(landmarks, canvasWidth, canvasHeight, pantyIndices, 0.2, 0.1);
      }
      return fallbackSingle();
    });
  }

  if (!isDistortedPosition(position, metrics, productType, canvasWidth, canvasHeight)) return position;
  return fallbackSingle();
}

function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  position: OverlayPosition | OverlayPosition[],
  productType: ProductType
): void {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const metrics = computeBodyMetrics(landmarks);

  const shoulderLeft = landmarks[LANDMARK.LEFT_SHOULDER];
  const shoulderRight = landmarks[LANDMARK.RIGHT_SHOULDER];
  const hipLeft = landmarks[LANDMARK.LEFT_HIP];
  const hipRight = landmarks[LANDMARK.RIGHT_HIP];

  const toPoint = (lm: NormalizedLandmark): { x: number; y: number } => ({
    x: lm.x * canvasWidth,
    y: lm.y * canvasHeight,
  });

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
  ctx.beginPath();
  const sLeft = toPoint(shoulderLeft);
  const sRight = toPoint(shoulderRight);
  ctx.moveTo(sLeft.x, sLeft.y);
  ctx.lineTo(sRight.x, sRight.y);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 196, 0, 0.7)';
  ctx.beginPath();
  const hLeft = toPoint(hipLeft);
  const hRight = toPoint(hipRight);
  ctx.moveTo(hLeft.x, hLeft.y);
  ctx.lineTo(hRight.x, hRight.y);
  ctx.stroke();

  const drawBox = (pos: OverlayPosition, color: string): void => {
    if (!pos.visible) return;
    ctx.strokeStyle = color;
    ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
  };

  if (Array.isArray(position)) {
    position.forEach((pos, index) => drawBox(pos, index === 0 ? 'rgba(0, 170, 255, 0.75)' : 'rgba(255, 0, 140, 0.75)'));
  } else {
    drawBox(position, 'rgba(0, 170, 255, 0.75)');
  }
  ctx.restore();

  console.debug('[TryOn][DebugFit]', {
    productType,
    shoulderWidthPx: Math.round(metrics.shoulderWidth * canvasWidth),
    hipWidthPx: Math.round(metrics.hipWidth * canvasWidth),
    torsoHeightPx: Math.round(metrics.torsoHeight * canvasHeight),
    hipToKneePx: Math.round(metrics.hipToKneeHeight * canvasHeight),
    positions: Array.isArray(position)
      ? position.map((pos) => ({
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          width: Math.round(pos.width),
          height: Math.round(pos.height),
        }))
      : [{
          x: Math.round(position.x),
          y: Math.round(position.y),
          width: Math.round(position.width),
          height: Math.round(position.height),
        }],
  });
}

function logWarpMetrics(
  position: OverlayPosition | OverlayPosition[],
  fitProfiles: FitProfile | FitProfile[]
): void {
  const positions = Array.isArray(position) ? position : [position];
  const profiles = Array.isArray(fitProfiles) ? fitProfiles : [fitProfiles];

  const metrics = positions.map((pos, index) => {
    const profile = profiles[index] ?? profiles[0];
    return {
      contourStrengthApplied: Number(profile.contourStrength.toFixed(2)),
      waistPullPx: Math.round(profile.waistPull * pos.width),
      rowDistortionMax: Math.round(profile.contourStrength * 100),
    };
  });

  console.debug('[TryOn][DebugFit]', { warpMetrics: metrics });
}

export async function processPhotoTryOn(
  request: PhotoTryOnRequest,
  onProgress?: ProgressCallback,
  options?: { signal?: AbortSignal }
): Promise<TryOnResult> {
  const remoteEnabled = await isRemoteTryOnEnabled();
  if (!remoteEnabled) {
    throw new Error('REMOTE_DISABLED');
  }

  try {
    const remoteResult = await processVirtualTryOn(
      {
        personImage: request.personImage,
        garmentImageUrl: request.garmentImageUrl,
        productId: request.productId,
        productName: request.productName,
        wantsVideo: request.wantsVideo,
        videoDurationSeconds: request.videoDurationSeconds,
      },
      onProgress,
      options?.signal
    );

    if (DEBUG_TRYON_OVERLAY) {
      console.debug('[TryOn][DebugFit]', { source: 'remote' });
    }

    return remoteResult;
  } catch (error) {
    if (!ALLOW_LOCAL_FALLBACK) {
      throw error;
    }
  }

  onProgress?.(5, 'Đang chuẩn bị ảnh...');

  const originalImage = await fileToDataUrl(request.personImage);
  const personCanvas = await createOrientedCanvas(request.personImage);

  onProgress?.(20, 'Đang xử lý sản phẩm...');
  let garmentUrl = request.garmentNoBgUrl ?? request.garmentImageUrl;
  let revokeGarmentUrl: string | null = null;

  if (!request.garmentNoBgUrl) {
    garmentUrl = await removeBackgroundClient(request.garmentImageUrl);
    revokeGarmentUrl = garmentUrl;
  }

  const clothingImage = await loadImage(garmentUrl);
  let maskDataForFallback: ImageData | null = null;

  if (await isOnnxTryOnEnabled()) {
    try {
      const onnxCanvas = await runOnnxTryOn({
        personCanvas,
        garmentImage: clothingImage,
        getMaskData: async () => {
          onProgress?.(52, 'Đang tách nền cơ thể...');
          maskDataForFallback = await detectPersonMaskFromImage(personCanvas);
          return maskDataForFallback;
        },
        onProgress,
      });

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = personCanvas.width;
      finalCanvas.height = personCanvas.height;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        throw new Error('Không thể tạo ảnh thử đồ.');
      }
      finalCtx.drawImage(onnxCanvas, 0, 0, finalCanvas.width, finalCanvas.height);
      const resultImage = finalCanvas.toDataURL('image/jpeg', 0.92);

      if (revokeGarmentUrl) {
        URL.revokeObjectURL(revokeGarmentUrl);
      }

      onProgress?.(100, 'Hoàn thành!');

      if (DEBUG_TRYON_OVERLAY) {
        console.debug('[TryOn][DebugFit]', { source: 'onnx' });
      }

      return {
        originalImage,
        resultImage,
        productId: request.productId,
        productName: request.productName,
        timestamp: Date.now(),
        source: 'local',
      };
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : 'Lỗi ONNX try-on';
      const message = rawMessage.includes('ONNX_') ? rawMessage : `ONNX_FAILED: ${rawMessage}`;
      console.warn('[TryOn][ONNX] Fallback về overlay:', message);
    }
  }

  const resultImage = await processOverlayTryOn(
    personCanvas,
    clothingImage,
    request,
    onProgress,
    maskDataForFallback
  );

  if (revokeGarmentUrl) {
    URL.revokeObjectURL(revokeGarmentUrl);
  }

  onProgress?.(100, 'Hoàn thành!');

  if (DEBUG_TRYON_OVERLAY) {
    console.debug('[TryOn][DebugFit]', { source: 'local' });
  }

  return {
    originalImage,
    resultImage,
    productId: request.productId,
    productName: request.productName,
    timestamp: Date.now(),
    source: 'local',
  };
}

async function processOverlayTryOn(
  personCanvas: HTMLCanvasElement,
  clothingImage: HTMLImageElement,
  request: PhotoTryOnRequest,
  onProgress?: ProgressCallback,
  maskDataOverride?: ImageData | null
): Promise<string> {
  onProgress?.(30, 'Đang phân tích tư thế...');
  const landmarks = await detectPose(personCanvas);
  if (!landmarks) {
    throw new Error('Không phát hiện được tư thế. Vui lòng chọn ảnh rõ toàn thân.');
  }

  let maskData = maskDataOverride ?? null;
  if (!maskData) {
    onProgress?.(55, 'Đang chuẩn bị nền...');
    maskData = await detectPersonMaskFromImage(personCanvas);
  }

  onProgress?.(75, 'Đang tạo kết quả thử đồ...');
  const canvas = document.createElement('canvas');
  canvas.width = personCanvas.width;
  canvas.height = personCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Không thể tạo ảnh thử đồ.');
  }

  ctx.drawImage(personCanvas, 0, 0, canvas.width, canvas.height);

  const position = calculateOverlayPosition(
    landmarks,
    request.productType,
    canvas.width,
    canvas.height
  );
  const normalizedPosition = normalizeOverlayPosition(
    position,
    landmarks,
    request.productType,
    canvas.width,
    canvas.height
  );

  const shouldMask = request.productType !== 'SHAPEWEAR';
  const renderMode: RenderMode | RenderMode[] =
    request.productType === 'SET'
      ? ['mesh-strong', 'flat']
      : request.productType === 'BRA' || request.productType === 'SHAPEWEAR'
        ? 'mesh-strong'
        : request.productType === 'SLEEPWEAR'
          ? 'mesh'
          : 'flat';
  const fitProfiles: FitProfile | FitProfile[] = Array.isArray(renderMode)
    ? [getFitProfile('BRA', 'mesh-strong'), getFitProfile('PANTY', 'mesh')]
    : renderMode === 'flat'
      ? getFitProfile(request.productType, 'mesh')
      : getFitProfile(request.productType, renderMode === 'mesh-strong' ? 'mesh-strong' : 'mesh');
  const blurRadius = request.productType === 'PANTY' ? 8 : request.productType === 'SET' ? 9 : 10;
  drawOverlayWithMask(
    ctx,
    clothingImage,
    normalizedPosition,
    shouldMask ? maskData : null,
    renderMode,
    fitProfiles,
    {
    opacity: 0.92,
    blurRadius,
    }
  );

  if (DEBUG_TRYON_OVERLAY) {
    drawDebugOverlay(ctx, landmarks, normalizedPosition, request.productType);
    logWarpMetrics(normalizedPosition, fitProfiles);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

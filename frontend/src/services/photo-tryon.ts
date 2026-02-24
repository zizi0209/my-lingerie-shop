import { detectPose } from '@/services/pose-detection';
import { detectPersonMaskFromImage } from '@/services/body-segmentation';
import {
  calculateOverlayPosition,
  drawClothingOverlay,
  type ProductType,
  type OverlayPosition,
} from '@/services/clothing-overlay';
import { removeBackgroundClient } from '@/services/client-bg-removal';
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
}

type ProgressCallback = (progress: number, message?: string) => void;

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

async function loadImageWithOrientation(src: string, crossOrigin = true): Promise<HTMLImageElement> {
  if (typeof createImageBitmap === 'undefined') {
    return loadImage(src, crossOrigin);
  }

  try {
    const response = await fetch(src, { mode: crossOrigin ? 'cors' : 'same-origin' });
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return loadImage(src, crossOrigin);
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return loadImage(canvas.toDataURL('image/png'), false);
  } catch {
    return loadImage(src, crossOrigin);
  }
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
        const exifLength = view.getUint16(offset, false);
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

function drawOverlayWithMask(
  ctx: CanvasRenderingContext2D,
  clothingImage: HTMLImageElement,
  position: OverlayPosition | OverlayPosition[],
  maskData: ImageData | null,
  options?: { opacity?: number }
): void {
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = ctx.canvas.width;
  overlayCanvas.height = ctx.canvas.height;

  const overlayCtx = overlayCanvas.getContext('2d');
  if (!overlayCtx) return;

  const opacity = options?.opacity ?? 0.95;

  if (Array.isArray(position)) {
    position.forEach((pos) => {
      drawClothingOverlay(overlayCtx, clothingImage, pos, { opacity });
    });
  } else {
    drawClothingOverlay(overlayCtx, clothingImage, position, { opacity });
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
        scaledCtx.filter = 'blur(10px)';
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
  canvasWidth: number,
  canvasHeight: number
): boolean {
  if (!position.visible || position.width <= 0 || position.height <= 0) return true;
  if (position.height > canvasHeight * 1.1) return true;
  if (position.width < canvasWidth * 0.08) return true;
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
      if (!isDistortedPosition(pos, canvasWidth, canvasHeight)) return pos;
      if (productType === 'SET') {
        return index === 0
          ? buildFallbackPosition(landmarks, canvasWidth, canvasHeight, braIndices, 0.22, 0.12)
          : buildFallbackPosition(landmarks, canvasWidth, canvasHeight, pantyIndices, 0.2, 0.1);
      }
      return fallbackSingle();
    });
  }

  if (!isDistortedPosition(position, canvasWidth, canvasHeight)) return position;
  return fallbackSingle();
}

export async function processPhotoTryOn(
  request: PhotoTryOnRequest,
  onProgress?: ProgressCallback
): Promise<TryOnResult> {
  onProgress?.(5, 'Đang chuẩn bị ảnh...');

  const originalImage = await fileToDataUrl(request.personImage);
  const personCanvas = await createOrientedCanvas(request.personImage);

  onProgress?.(20, 'Đang phân tích tư thế...');
  const landmarks = await detectPose(personCanvas);
  if (!landmarks) {
    throw new Error('Không phát hiện được tư thế. Vui lòng chọn ảnh rõ toàn thân.');
  }

  onProgress?.(35, 'Đang xử lý sản phẩm...');
  let garmentUrl = request.garmentNoBgUrl ?? request.garmentImageUrl;
  let revokeGarmentUrl: string | null = null;

  if (!request.garmentNoBgUrl) {
    garmentUrl = await removeBackgroundClient(request.garmentImageUrl);
    revokeGarmentUrl = garmentUrl;
  }

  const clothingImage = await loadImage(garmentUrl);

  onProgress?.(55, 'Đang chuẩn bị nền...');
  const maskData = await detectPersonMaskFromImage(personCanvas);

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
  drawOverlayWithMask(ctx, clothingImage, normalizedPosition, shouldMask ? maskData : null, { opacity: 0.92 });

  const resultImage = canvas.toDataURL('image/jpeg', 0.92);

  if (revokeGarmentUrl) {
    URL.revokeObjectURL(revokeGarmentUrl);
  }

  onProgress?.(100, 'Hoàn thành!');

  return {
    originalImage,
    resultImage,
    productId: request.productId,
    productName: request.productName,
    timestamp: Date.now(),
  };
}

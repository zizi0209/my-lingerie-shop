import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

let segmenterVideo: ImageSegmenter | null = null;
let segmenterImage: ImageSegmenter | null = null;
let isInitializingVideo = false;
let isInitializingImage = false;
let isDisabled = false;
let isImageDisabled = false;

const WASM_URL = '/mediapipe/wasm';
const MODEL_URL = '/models/selfie_segmenter.tflite';

export async function initBodySegmenterVideo(): Promise<ImageSegmenter | null> {
  if (segmenterVideo) return segmenterVideo;
  if (isDisabled) return null;
  if (isInitializingVideo) {
    while (isInitializingVideo) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (segmenterVideo) return segmenterVideo;
    if (isDisabled) return null;
  }

  isInitializingVideo = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      segmenterVideo = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
      });
    } catch (error) {
      console.warn('[BodySegmentation] VIDEO GPU failed, fallback to CPU:', error);
      segmenterVideo = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
      });
    }

    console.log('[BodySegmentation] VIDEO mode initialized');
    return segmenterVideo;
  } catch (error) {
    console.warn('[BodySegmentation] Failed to initialize VIDEO mode, disabling segmentation:', error);
    isDisabled = true;
    return null;
  } finally {
    isInitializingVideo = false;
  }
}

export async function initBodySegmenterImage(): Promise<ImageSegmenter | null> {
  if (segmenterImage) return segmenterImage;
  if (isImageDisabled) return null;
  if (isInitializingImage) {
    while (isInitializingImage) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (segmenterImage) return segmenterImage;
    if (isImageDisabled) return null;
  }

  isInitializingImage = true;
  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      segmenterImage = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
      });
    } catch (error) {
      console.warn('[BodySegmentation] IMAGE GPU failed, fallback to CPU:', error);
      segmenterImage = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
      });
    }

    console.log('[BodySegmentation] IMAGE mode initialized');
    return segmenterImage;
  } catch (error) {
    console.warn('[BodySegmentation] Failed to initialize IMAGE mode, disabling segmentation:', error);
    isImageDisabled = true;
    return null;
  } finally {
    isInitializingImage = false;
  }
}

export async function detectPersonMaskFromVideo(
  video: HTMLVideoElement,
  timestamp: number
): Promise<ImageData | null> {
  if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
    return null;
  }

  const segmenter = await initBodySegmenterVideo();
  if (!segmenter) return null;

  let mask: ReturnType<typeof segmenter.segmentForVideo>['categoryMask'] | null = null;
  try {
    const result = segmenter.segmentForVideo(video, timestamp);
    mask = result.categoryMask;
    if (!mask) return null;

    const maskData = mask.getAsFloat32Array();
    const width = mask.width;
    const height = mask.height;
    const imageData = new ImageData(width, height);

    for (let i = 0; i < maskData.length; i += 1) {
      const alpha = Math.max(0, Math.min(255, 255 - Math.round(maskData[i] * 255)));
      const index = i * 4;
      imageData.data[index] = 255;
      imageData.data[index + 1] = 255;
      imageData.data[index + 2] = 255;
      imageData.data[index + 3] = alpha;
    }

    return imageData;
  } catch (error) {
    console.error('[BodySegmentation] Video segmentation failed:', error);
    return null;
  } finally {
    if (mask) {
      mask.close();
    }
  }
}

export async function detectPersonMaskFromImage(
  image: HTMLImageElement | HTMLCanvasElement
): Promise<ImageData | null> {
  const segmenter = await initBodySegmenterImage();
  if (!segmenter) return null;

  const source = normalizeImageSource(image);
  if (!source) return null;

  let mask: ReturnType<typeof segmenter.segment>['categoryMask'] | null = null;
  try {
    const result = segmenter.segment(source);
    mask = result.categoryMask;
    if (!mask) return null;

    const maskData = mask.getAsFloat32Array();
    const width = mask.width;
    const height = mask.height;
    const imageData = new ImageData(width, height);

    for (let i = 0; i < maskData.length; i += 1) {
      const alpha = Math.max(0, Math.min(255, 255 - Math.round(maskData[i] * 255)));
      const index = i * 4;
      imageData.data[index] = 255;
      imageData.data[index + 1] = 255;
      imageData.data[index + 2] = 255;
      imageData.data[index + 3] = alpha;
    }

    if (width === source.width && height === source.height) {
      return imageData;
    }

    return scaleMaskToCanvas(imageData, source.width, source.height);
  } catch (error) {
    console.error('[BodySegmentation] Image segmentation failed:', error);
    return null;
  } finally {
    if (mask) {
      mask.close();
    }
  }
}

function normalizeImageSource(
  image: HTMLImageElement | HTMLCanvasElement
): HTMLCanvasElement | null {
  if (image instanceof HTMLCanvasElement) {
    if (image.width <= 0 || image.height <= 0) return null;
    return image;
  }

  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (width <= 0 || height <= 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function scaleMaskToCanvas(maskData: ImageData, width: number, height: number): ImageData | null {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = maskData.width;
  sourceCanvas.height = maskData.height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return null;
  sourceCtx.putImageData(maskData, 0, 0);

  const targetCanvas = document.createElement('canvas');
  targetCanvas.width = width;
  targetCanvas.height = height;
  const targetCtx = targetCanvas.getContext('2d');
  if (!targetCtx) return null;
  targetCtx.imageSmoothingEnabled = true;
  targetCtx.imageSmoothingQuality = 'high';
  targetCtx.drawImage(sourceCanvas, 0, 0, width, height);
  return targetCtx.getImageData(0, 0, width, height);
}

export function disposeBodySegmenter(): void {
  if (segmenterVideo) {
    segmenterVideo.close();
    segmenterVideo = null;
  }
  if (segmenterImage) {
    segmenterImage.close();
    segmenterImage = null;
  }
  isDisabled = false;
  isImageDisabled = false;
}

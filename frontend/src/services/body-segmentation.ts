import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

let segmenterVideo: ImageSegmenter | null = null;
let isInitializingVideo = false;
let isDisabled = false;

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
    segmenterVideo = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      outputCategoryMask: true,
    });

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
      const alpha = Math.max(0, Math.min(255, Math.round(maskData[i] * 255)));
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

export function disposeBodySegmenter(): void {
  if (segmenterVideo) {
    segmenterVideo.close();
    segmenterVideo = null;
  }
  isDisabled = false;
}

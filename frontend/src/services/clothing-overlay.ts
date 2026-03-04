 /**
  * Clothing Overlay Service
  * 
  * Overlay quần áo lên người dựa trên pose landmarks
  * Hỗ trợ các loại: BRA, PANTY, SET, SLEEPWEAR, SHAPEWEAR
  */
 
 import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
 
 // ProductType từ Prisma schema
 export type ProductType = 'BRA' | 'PANTY' | 'SET' | 'SLEEPWEAR' | 'SHAPEWEAR' | 'ACCESSORY';

export type MeshMode = 'mesh' | 'mesh-strong';
 
 // Landmark indices theo MediaPipe Pose
 const LANDMARK = {
   NOSE: 0,
   LEFT_EYE_INNER: 1,
   LEFT_EYE: 2,
   LEFT_EYE_OUTER: 3,
   RIGHT_EYE_INNER: 4,
   RIGHT_EYE: 5,
   RIGHT_EYE_OUTER: 6,
   LEFT_EAR: 7,
   RIGHT_EAR: 8,
   MOUTH_LEFT: 9,
   MOUTH_RIGHT: 10,
   LEFT_SHOULDER: 11,
   RIGHT_SHOULDER: 12,
   LEFT_ELBOW: 13,
   RIGHT_ELBOW: 14,
   LEFT_WRIST: 15,
   RIGHT_WRIST: 16,
   LEFT_PINKY: 17,
   RIGHT_PINKY: 18,
   LEFT_INDEX: 19,
   RIGHT_INDEX: 20,
   LEFT_THUMB: 21,
   RIGHT_THUMB: 22,
   LEFT_HIP: 23,
   RIGHT_HIP: 24,
   LEFT_KNEE: 25,
   RIGHT_KNEE: 26,
   LEFT_ANKLE: 27,
   RIGHT_ANKLE: 28,
   LEFT_HEEL: 29,
   RIGHT_HEEL: 30,
   LEFT_FOOT_INDEX: 31,
   RIGHT_FOOT_INDEX: 32,
 };
 
 // Cấu hình overlay cho từng loại sản phẩm
 interface OverlayConfig {
   // Landmarks để xác định vùng overlay
   topLeft: number;
   topRight: number;
   bottomLeft: number;
   bottomRight: number;
   // Padding để quần áo rộng hơn body (tỉ lệ)
   paddingX: number;
   paddingY: number;
   // Offset để điều chỉnh vị trí (tỉ lệ của height)
   offsetY: number;
   // Minimum visibility score để overlay
   minVisibility: number;
 }

interface BodyMetrics {
  shoulderWidth: number;
  hipWidth: number;
  torsoHeight: number;
  hipToKneeHeight: number;
  shoulderToKneeHeight: number;
  shoulderToHipRatio: number;
  cameraDistanceHint: number;
}
 
 const OVERLAY_CONFIGS: Record<ProductType, OverlayConfig | OverlayConfig[]> = {
   // Áo lót: từ vai đến hông
   BRA: {
     topLeft: LANDMARK.LEFT_SHOULDER,
     topRight: LANDMARK.RIGHT_SHOULDER,
     bottomLeft: LANDMARK.LEFT_HIP,
     bottomRight: LANDMARK.RIGHT_HIP,
     paddingX: 0.25,
    paddingY: 0.14,
     offsetY: -0.05,
    minVisibility: 0.28,
   },
   // Quần lót: từ hông đến đầu gối
   PANTY: {
     topLeft: LANDMARK.LEFT_HIP,
     topRight: LANDMARK.RIGHT_HIP,
     bottomLeft: LANDMARK.LEFT_KNEE,
     bottomRight: LANDMARK.RIGHT_KNEE,
     paddingX: 0.2,
     paddingY: 0.1,
     offsetY: 0,
    minVisibility: 0.4,
   },
   // Set đồ lót: 2 vùng riêng biệt (BRA + PANTY)
   SET: [
     {
       topLeft: LANDMARK.LEFT_SHOULDER,
       topRight: LANDMARK.RIGHT_SHOULDER,
       bottomLeft: LANDMARK.LEFT_HIP,
       bottomRight: LANDMARK.RIGHT_HIP,
       paddingX: 0.25,
       paddingY: 0.1,
       offsetY: -0.05,
      minVisibility: 0.4,
     },
     {
       topLeft: LANDMARK.LEFT_HIP,
       topRight: LANDMARK.RIGHT_HIP,
       bottomLeft: LANDMARK.LEFT_KNEE,
       bottomRight: LANDMARK.RIGHT_KNEE,
       paddingX: 0.2,
       paddingY: 0.1,
       offsetY: 0,
      minVisibility: 0.4,
     },
   ],
   // Đồ ngủ: từ vai đến đầu gối (full body)
   SLEEPWEAR: {
     topLeft: LANDMARK.LEFT_SHOULDER,
     topRight: LANDMARK.RIGHT_SHOULDER,
     bottomLeft: LANDMARK.LEFT_KNEE,
     bottomRight: LANDMARK.RIGHT_KNEE,
     paddingX: 0.3,
     paddingY: 0.1,
     offsetY: -0.08,
    minVisibility: 0.35,
   },
   // Đồ định hình: từ ngực đến đùi
   SHAPEWEAR: {
     topLeft: LANDMARK.LEFT_SHOULDER,
     topRight: LANDMARK.RIGHT_SHOULDER,
    bottomLeft: LANDMARK.LEFT_HIP,
    bottomRight: LANDMARK.RIGHT_HIP,
    paddingX: 0.2,
    paddingY: 0.08,
     offsetY: 0,
    minVisibility: 0.3,
   },
   // Phụ kiện: không overlay
   ACCESSORY: {
     topLeft: LANDMARK.LEFT_SHOULDER,
     topRight: LANDMARK.RIGHT_SHOULDER,
     bottomLeft: LANDMARK.LEFT_HIP,
     bottomRight: LANDMARK.RIGHT_HIP,
     paddingX: 0,
     paddingY: 0,
     offsetY: 0,
     minVisibility: 0.5,
   },
 };

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

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
  const torsoHeight = Math.abs(hipCenterY - shoulderCenterY);
  const hipToKneeHeight = Math.abs(kneeCenterY - hipCenterY);
  const shoulderToKneeHeight = Math.abs(kneeCenterY - shoulderCenterY);
  const shoulderToHipRatio = hipWidth > 0 ? shoulderWidth / hipWidth : 1;
  const cameraDistanceHint = clamp(0.35 / Math.max(shoulderWidth, 0.01), 0.8, 1.6);

  return {
    shoulderWidth,
    hipWidth,
    torsoHeight,
    hipToKneeHeight,
    shoulderToKneeHeight,
    shoulderToHipRatio: clamp(shoulderToHipRatio, 0.7, 1.35),
    cameraDistanceHint,
  };
};

const computeGarmentAspectFit = (
  config: OverlayConfig,
  metrics: BodyMetrics,
  productType: ProductType,
  profile: FitProfile
): { width: number; height: number } => {
  const baseWidth = (metrics.shoulderWidth + metrics.hipWidth) / 2;
  const baseHeight =
    productType === 'PANTY'
      ? metrics.hipToKneeHeight
      : productType === 'SLEEPWEAR'
        ? metrics.shoulderToKneeHeight
        : metrics.torsoHeight;
  const widthScale = productType === 'PANTY' ? 1.05 : productType === 'BRA' ? 1.1 : 1.08;
  const heightScale =
    productType === 'BRA'
      ? 0.82
      : productType === 'PANTY'
        ? 0.75
        : productType === 'SHAPEWEAR'
          ? 1.1
          : 1;
  const safeWidth = Math.max(baseWidth, 0.01);
  const safeHeight = Math.max(baseHeight, 0.01);
  const profileWidthScale = 1 + profile.contourStrength * 0.08;
  const profileHeightScale = 1 + profile.bustLift * 0.05;
  const paddedWidth = safeWidth * (1 + config.paddingX * 2) * widthScale * profileWidthScale;
  const paddedHeight = safeHeight * (1 + config.paddingY * 2) * heightScale * profileHeightScale;

  const minWidth = safeWidth * 0.75;
  const maxWidth = safeWidth * 1.55;
  const minHeight = safeHeight * 0.65;
  const maxHeight = safeHeight * 1.75;

  return {
    width: clamp(paddedWidth, minWidth, maxWidth),
    height: clamp(paddedHeight, minHeight, maxHeight),
  };
};

export const getFitProfile = (productType: ProductType, mode: MeshMode = 'mesh'): FitProfile => {
  const baseProfiles: Record<ProductType, FitProfile> = {
    BRA: {
      contourStrength: 0.38,
      waistPull: 0.32,
      bustLift: 0.28,
      hemRelax: 0.08,
      sideCurve: 0.55,
    },
    SHAPEWEAR: {
      contourStrength: 0.34,
      waistPull: 0.3,
      bustLift: 0.2,
      hemRelax: 0.05,
      sideCurve: 0.5,
    },
    SLEEPWEAR: {
      contourStrength: 0.24,
      waistPull: 0.18,
      bustLift: 0.12,
      hemRelax: 0.18,
      sideCurve: 0.42,
    },
    PANTY: {
      contourStrength: 0.3,
      waistPull: 0.25,
      bustLift: 0.08,
      hemRelax: 0.12,
      sideCurve: 0.5,
    },
    SET: {
      contourStrength: 0.32,
      waistPull: 0.26,
      bustLift: 0.2,
      hemRelax: 0.1,
      sideCurve: 0.5,
    },
    ACCESSORY: {
      contourStrength: 0.18,
      waistPull: 0.12,
      bustLift: 0.1,
      hemRelax: 0.08,
      sideCurve: 0.35,
    },
  };

  const profile = baseProfiles[productType];
  if (mode === 'mesh-strong') {
    return {
      contourStrength: clamp(profile.contourStrength * 1.25, 0, 0.65),
      waistPull: clamp(profile.waistPull * 1.25, 0, 0.6),
      bustLift: clamp(profile.bustLift * 1.2, 0, 0.5),
      hemRelax: clamp(profile.hemRelax * 1.15, 0, 0.4),
      sideCurve: clamp(profile.sideCurve * 1.2, 0.2, 0.9),
    };
  }

  return profile;
};
 
 // Kết quả tính toán vị trí overlay
 export interface OverlayPosition {
   x: number;
   y: number;
   width: number;
   height: number;
   rotation: number; // Góc xoay (radians) để match với góc nghiêng vai
   visible: boolean;
  shoulderRatio?: number; // Tỉ lệ vai/hông cho perspective warp
  bodyAngle?: number; // Góc nghiêng body (depth hint)
 }

export interface FitProfile {
  contourStrength: number;
  waistPull: number;
  bustLift: number;
  hemRelax: number;
  sideCurve: number;
}
 
 /**
  * Tính toán vị trí overlay cho một config
  */
function calculateSingleOverlay(
  landmarks: NormalizedLandmark[],
  config: OverlayConfig,
  productType: ProductType,
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition {
   const topLeft = landmarks[config.topLeft];
   const topRight = landmarks[config.topRight];
   const bottomLeft = landmarks[config.bottomLeft];
   const bottomRight = landmarks[config.bottomRight];
 
   // Check visibility
   const minVis = Math.min(
     topLeft.visibility ?? 0,
     topRight.visibility ?? 0,
     bottomLeft.visibility ?? 0,
     bottomRight.visibility ?? 0
   );
 
   if (minVis < config.minVisibility) {
    return { x: 0, y: 0, width: 0, height: 0, rotation: 0, visible: false, shoulderRatio: 1, bodyAngle: 0 };
   }
 
   // Tính center của top và bottom
   const topCenterX = (topLeft.x + topRight.x) / 2;
   const topCenterY = (topLeft.y + topRight.y) / 2;
   const bottomCenterX = (bottomLeft.x + bottomRight.x) / 2;
   const bottomCenterY = (bottomLeft.y + bottomRight.y) / 2;
 
  const metrics = computeBodyMetrics(landmarks);
  const profile = getFitProfile(productType, 'mesh');
  const { width: finalWidth, height: finalHeight } = computeGarmentAspectFit(
    config,
    metrics,
    productType,
    profile
  );
 
   // Tính vị trí center
   const centerX = (topCenterX + bottomCenterX) / 2;
  const centerY = (topCenterY + bottomCenterY) / 2 + config.offsetY * metrics.torsoHeight;
 
   // Tính góc xoay dựa trên độ nghiêng vai
  const rawRotation = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
  const rotation = rawRotation > Math.PI / 2
    ? rawRotation - Math.PI
    : rawRotation < -Math.PI / 2
      ? rawRotation + Math.PI
      : rawRotation;
 
  // Tỉ lệ vai/hông cho perspective warp
  const shoulderRatio = metrics.shoulderToHipRatio;

  // Depth hint từ z-coordinates (nếu có)
  const avgZ = ((topLeft.z ?? 0) + (topRight.z ?? 0) + (bottomLeft.z ?? 0) + (bottomRight.z ?? 0)) / 4;
  const bodyAngle = Math.abs(avgZ) * 1.8 * metrics.cameraDistanceHint;

   // Convert từ normalized (0-1) sang pixel
   return {
     x: (centerX - finalWidth / 2) * canvasWidth,
     y: (centerY - finalHeight / 2) * canvasHeight,
     width: finalWidth * canvasWidth,
     height: finalHeight * canvasHeight,
     rotation,
     visible: true,
    shoulderRatio: clamp(shoulderRatio, 0.65, 1.3),
    bodyAngle: clamp(bodyAngle, 0.05, 0.3),
   };
 }
 
 /**
  * Tính toán vị trí overlay cho một loại sản phẩm
  */
export function calculateOverlayPosition(
  landmarks: NormalizedLandmark[],
  productType: ProductType,
  canvasWidth: number,
  canvasHeight: number
): OverlayPosition | OverlayPosition[] {
  const config = OVERLAY_CONFIGS[productType];

  if (Array.isArray(config)) {
    // SET có 2 vùng overlay
    return config.map((c, index) =>
      calculateSingleOverlay(
        landmarks,
        c,
        index === 0 ? 'BRA' : 'PANTY',
        canvasWidth,
        canvasHeight
      )
    );
  }

  if (productType === 'SHAPEWEAR') {
    const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
    const leftHip = landmarks[LANDMARK.LEFT_HIP];
    const rightHip = landmarks[LANDMARK.RIGHT_HIP];
    const hipVisibility = Math.min(leftHip.visibility ?? 0, rightHip.visibility ?? 0);

    if (hipVisibility < 0.3) {
      const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
      const topCenterY = (leftShoulder.y + rightShoulder.y) / 2;
      const height = shoulderWidth * 1.45;
      const bottomY = Math.min(0.98, topCenterY + height);
      const syntheticLandmarks = [...landmarks];
      syntheticLandmarks[LANDMARK.LEFT_HIP] = {
        ...leftHip,
        x: leftShoulder.x - shoulderWidth * 0.05,
        y: bottomY,
        visibility: 1,
      };
      syntheticLandmarks[LANDMARK.RIGHT_HIP] = {
        ...rightHip,
        x: rightShoulder.x + shoulderWidth * 0.05,
        y: bottomY,
        visibility: 1,
      };

      return calculateSingleOverlay(syntheticLandmarks, config, productType, canvasWidth, canvasHeight);
    }
  }

  if (productType === 'BRA') {
    const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
    const leftHip = landmarks[LANDMARK.LEFT_HIP];
    const rightHip = landmarks[LANDMARK.RIGHT_HIP];
    const hipVisibility = Math.min(leftHip.visibility ?? 0, rightHip.visibility ?? 0);

    if (hipVisibility < 0.28) {
      const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
      const topCenterY = (leftShoulder.y + rightShoulder.y) / 2;
      const height = shoulderWidth * 0.95;
      const bottomY = Math.min(0.9, topCenterY + height);
      const syntheticLandmarks = [...landmarks];
      syntheticLandmarks[LANDMARK.LEFT_HIP] = {
        ...leftHip,
        x: leftShoulder.x - shoulderWidth * 0.1,
        y: bottomY,
        visibility: 1,
      };
      syntheticLandmarks[LANDMARK.RIGHT_HIP] = {
        ...rightHip,
        x: rightShoulder.x + shoulderWidth * 0.1,
        y: bottomY,
        visibility: 1,
      };

      return calculateSingleOverlay(syntheticLandmarks, config, productType, canvasWidth, canvasHeight);
    }
  }

  return calculateSingleOverlay(landmarks, config, productType, canvasWidth, canvasHeight);
}
 
 /**
  * Vẽ clothing image lên canvas với position đã tính
  */
 export function drawClothingOverlay(
   ctx: CanvasRenderingContext2D,
   clothingImage: HTMLImageElement,
   position: OverlayPosition,
   options?: {
     opacity?: number;
     flipHorizontal?: boolean;
   }
 ): void {
   if (!position.visible) return;
 
   const { x, y, width, height, rotation } = position;
   const opacity = options?.opacity ?? 0.9;
   const flipHorizontal = options?.flipHorizontal ?? false;
 
   ctx.save();
 
   // Set opacity
   ctx.globalAlpha = opacity;
 
   // Move to center of clothing position
   const centerX = x + width / 2;
   const centerY = y + height / 2;
   ctx.translate(centerX, centerY);
 
   // Apply rotation
   ctx.rotate(rotation);
 
  // Flip horizontal if needed (for mirrored webcam)
  if (flipHorizontal) {
    ctx.scale(-1, 1);
  }

  // Draw image centered
  ctx.drawImage(clothingImage, -width / 2, -height / 2, width, height);

  ctx.restore();
}

export function drawClothingOverlayMesh(
  ctx: CanvasRenderingContext2D,
  clothingImage: HTMLImageElement,
  position: OverlayPosition,
  options?: {
    opacity?: number;
    flipHorizontal?: boolean;
    flipVertical?: boolean;
    depthHint?: number;
    rows?: number;
    fitProfile?: FitProfile;
  }
): void {
  if (!position.visible) return;

  const { x, y, width, height, rotation } = position;
  const opacity = options?.opacity ?? 0.9;
  const flipHorizontal = options?.flipHorizontal ?? false;
  const flipVertical = options?.flipVertical ?? false;
  const depthHint = options?.depthHint ?? (position.bodyAngle ?? 0.12);
  const rows = options?.rows ?? 20;
  const cols = 12;
  const shoulderRatio = position.shoulderRatio ?? 1;
  const overlapRatio = 0.02;
  const profile = options?.fitProfile ?? getFitProfile('ACCESSORY', 'mesh');
  const contourStrength = clamp(profile.contourStrength, 0, 0.65);
  const waistPull = clamp(profile.waistPull, 0, 0.6);
  const bustLift = clamp(profile.bustLift, 0, 0.5);
  const hemRelax = clamp(profile.hemRelax, 0, 0.4);
  const sideCurve = clamp(profile.sideCurve, 0.2, 0.9);

  const mW = Math.max(1, Math.round(width));
  const mH = Math.max(1, Math.round(height));
  const meshCanvas = document.createElement('canvas');
  meshCanvas.width = mW;
  meshCanvas.height = mH;
  const meshCtx = meshCanvas.getContext('2d');
  if (!meshCtx) return;

  meshCtx.imageSmoothingEnabled = true;
  meshCtx.imageSmoothingQuality = 'high';

  for (let row = 0; row < rows; row += 1) {
    const baseTop = row / rows;
    const baseBot = (row + 1) / rows;
    const tTop = Math.max(0, baseTop - overlapRatio);
    const tBot = Math.min(1, baseBot + overlapRatio);
    const srcY = (flipVertical ? 1 - tBot : tTop) * clothingImage.height;
    const srcH = (tBot - tTop) * clothingImage.height;

    // Perspective: top narrower/wider based on shoulderRatio
    const perspTop = 1 + (shoulderRatio - 1) * (1 - baseTop);
    const perspBot = 1 + (shoulderRatio - 1) * (1 - baseBot);

    const baseMid = (baseTop + baseBot) / 2;
    const waistCurve = Math.exp(-Math.pow((baseMid - 0.55) / 0.22, 2));
    const bustCurve = Math.exp(-Math.pow((baseMid - 0.25) / 0.18, 2));
    const hemCurve = clamp((baseMid - 0.7) / 0.3, 0, 1);
    const contourWidthFactor = clamp(
      1 - waistPull * waistCurve + bustLift * bustCurve + hemRelax * hemCurve,
      0.72,
      1.28
    );

    // Body curvature (barrel distortion)
    const curveTop = Math.abs(0.5 - baseTop) * 2;
    const curveBot = Math.abs(0.5 - baseBot) * 2;
    const scaleTop =
      (1 - depthHint * curveTop * curveTop) *
      perspTop *
      contourWidthFactor *
      (1 + contourStrength * (0.12 * bustCurve - 0.08 * waistCurve));
    const scaleBot =
      (1 - depthHint * curveBot * curveBot) *
      perspBot *
      contourWidthFactor *
      (1 + contourStrength * (0.08 * hemCurve - 0.05 * waistCurve));

    for (let col = 0; col < cols; col += 1) {
      const cLeft = col / cols;
      const cRight = (col + 1) / cols;
      const srcX = cLeft * clothingImage.width;
      const srcW = clothingImage.width / cols;

      // Horizontal curvature per column
      const hCenter = Math.abs(0.5 - (cLeft + cRight) / 2) * 2;
      const hCurve = 1 - depthHint * (0.3 + contourStrength * 0.35) * hCenter * hCenter * sideCurve;

      const topW = mW * scaleTop * hCurve;
      const botW = mW * scaleBot * hCurve;
      const topX = (mW - topW) / 2 + cLeft * topW;
      const botX = (mW - botW) / 2 + cLeft * botW;
      const topSliceW = topW / cols;
      const botSliceW = botW / cols;

      const dy = baseTop * mH;
      const dh = (baseBot - baseTop) * mH;

      meshCtx.save();
      meshCtx.beginPath();
      meshCtx.moveTo(topX, dy);
      meshCtx.lineTo(topX + topSliceW, dy);
      meshCtx.lineTo(botX + botSliceW, dy + dh);
      meshCtx.lineTo(botX, dy + dh);
      meshCtx.closePath();
      meshCtx.clip();

      const avgDestX = (topX + botX) / 2;
      const avgDestW = (topSliceW + botSliceW) / 2;
      meshCtx.drawImage(
        clothingImage,
        srcX, srcY, srcW, srcH,
        avgDestX, dy, avgDestW, dh,
      );
      meshCtx.restore();
    }
  }

  // Subtle shadow for depth
  const shadowGrad = meshCtx.createLinearGradient(0, 0, 0, mH);
  shadowGrad.addColorStop(0, 'rgba(0,0,0,0.03)');
  shadowGrad.addColorStop(0.35, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(0.65, 'rgba(0,0,0,0)');
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0.04)');
  meshCtx.globalCompositeOperation = 'multiply';
  meshCtx.fillStyle = shadowGrad;
  meshCtx.fillRect(0, 0, mW, mH);

  // Side shadow for 3D curvature effect
  const sideGrad = meshCtx.createLinearGradient(0, 0, mW, 0);
  sideGrad.addColorStop(0, 'rgba(0,0,0,0.04)');
  sideGrad.addColorStop(0.2, 'rgba(0,0,0,0)');
  sideGrad.addColorStop(0.8, 'rgba(0,0,0,0)');
  sideGrad.addColorStop(1, 'rgba(0,0,0,0.04)');
  meshCtx.fillStyle = sideGrad;
  meshCtx.fillRect(0, 0, mW, mH);
  meshCtx.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.globalAlpha = opacity;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  if (flipHorizontal) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(meshCanvas, -width / 2, -height / 2, width, height);
  ctx.restore();
}
 
 /**
  * Vẽ nhiều clothing images (cho SET)
  */
 export function drawMultipleClothingOverlay(
   ctx: CanvasRenderingContext2D,
   clothingImages: HTMLImageElement[],
   positions: OverlayPosition[],
   options?: {
     opacity?: number;
     flipHorizontal?: boolean;
   }
 ): void {
   positions.forEach((position, index) => {
     const image = clothingImages[index];
     if (image) {
       drawClothingOverlay(ctx, image, position, options);
     }
   });
 }

export function drawMultipleClothingOverlayMesh(
  ctx: CanvasRenderingContext2D,
  clothingImages: HTMLImageElement[],
  positions: OverlayPosition[],
  options?: {
    opacity?: number;
    flipHorizontal?: boolean;
    depthHint?: number;
    rows?: number;
  }
): void {
  positions.forEach((position, index) => {
    const image = clothingImages[index];
    if (image) {
      drawClothingOverlayMesh(ctx, image, position, options);
    }
  });
}
 
 /**
  * Kiểm tra xem có đủ landmarks để overlay không
  */
export function canOverlay(
  landmarks: NormalizedLandmark[] | null,
  productType: ProductType
): boolean {
  if (!landmarks || landmarks.length < 33) return false;

  const config = OVERLAY_CONFIGS[productType];
  const configs = Array.isArray(config) ? config : [config];

  return configs.every((c) => {
    const topVis = Math.min(
      landmarks[c.topLeft].visibility ?? 0,
      landmarks[c.topRight].visibility ?? 0
    );
    const bottomVis = Math.min(
      landmarks[c.bottomLeft].visibility ?? 0,
      landmarks[c.bottomRight].visibility ?? 0
    );
    const minVis = Math.min(topVis, bottomVis);

    if ((productType === 'SHAPEWEAR' || productType === 'BRA') && bottomVis < c.minVisibility) {
      return topVis >= 0.35;
    }
    return minVis >= c.minVisibility;
  });
}
 
 /**
  * Lấy thông báo hướng dẫn dựa trên ProductType
  */
 export function getOverlayGuidance(productType: ProductType): string {
   switch (productType) {
     case 'BRA':
       return 'Đứng thẳng, để lộ vai và thân trên';
     case 'PANTY':
       return 'Đứng thẳng, để lộ hông và đùi';
     case 'SET':
       return 'Đứng thẳng, để lộ toàn thân từ vai đến đầu gối';
     case 'SLEEPWEAR':
       return 'Đứng thẳng, để lộ toàn thân từ vai đến đầu gối';
     case 'SHAPEWEAR':
       return 'Đứng thẳng, để lộ toàn thân từ ngực đến đùi';
     default:
       return 'Đứng thẳng, hướng mặt vào camera';
   }
 }

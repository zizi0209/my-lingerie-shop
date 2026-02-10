 /**
  * Clothing Overlay Service
  * 
  * Overlay quần áo lên người dựa trên pose landmarks
  * Hỗ trợ các loại: BRA, PANTY, SET, SLEEPWEAR, SHAPEWEAR
  */
 
 import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
 
 // ProductType từ Prisma schema
 export type ProductType = 'BRA' | 'PANTY' | 'SET' | 'SLEEPWEAR' | 'SHAPEWEAR' | 'ACCESSORY';
 
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
 
 const OVERLAY_CONFIGS: Record<ProductType, OverlayConfig | OverlayConfig[]> = {
   // Áo lót: từ vai đến hông
   BRA: {
     topLeft: LANDMARK.LEFT_SHOULDER,
     topRight: LANDMARK.RIGHT_SHOULDER,
     bottomLeft: LANDMARK.LEFT_HIP,
     bottomRight: LANDMARK.RIGHT_HIP,
     paddingX: 0.25,
     paddingY: 0.1,
     offsetY: -0.05,
    minVisibility: 0.4,
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
     bottomLeft: LANDMARK.LEFT_KNEE,
     bottomRight: LANDMARK.RIGHT_KNEE,
     paddingX: 0.2,
     paddingY: 0.05,
     offsetY: 0,
    minVisibility: 0.4,
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
 
 // Kết quả tính toán vị trí overlay
 export interface OverlayPosition {
   x: number;
   y: number;
   width: number;
   height: number;
   rotation: number; // Góc xoay (radians) để match với góc nghiêng vai
   visible: boolean;
 }
 
 /**
  * Tính toán vị trí overlay cho một config
  */
 function calculateSingleOverlay(
   landmarks: NormalizedLandmark[],
   config: OverlayConfig,
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
     return { x: 0, y: 0, width: 0, height: 0, rotation: 0, visible: false };
   }
 
   // Tính center của top và bottom
   const topCenterX = (topLeft.x + topRight.x) / 2;
   const topCenterY = (topLeft.y + topRight.y) / 2;
   const bottomCenterX = (bottomLeft.x + bottomRight.x) / 2;
   const bottomCenterY = (bottomLeft.y + bottomRight.y) / 2;
 
   // Tính width và height cơ bản
   const topWidth = Math.abs(topRight.x - topLeft.x);
   const bottomWidth = Math.abs(bottomRight.x - bottomLeft.x);
   const avgWidth = (topWidth + bottomWidth) / 2;
   const height = Math.abs(bottomCenterY - topCenterY);
 
   // Apply padding
   const finalWidth = avgWidth * (1 + config.paddingX * 2);
   const finalHeight = height * (1 + config.paddingY * 2);
 
   // Tính vị trí center
   const centerX = (topCenterX + bottomCenterX) / 2;
   const centerY = (topCenterY + bottomCenterY) / 2 + config.offsetY * height;
 
   // Tính góc xoay dựa trên độ nghiêng vai
   const rotation = Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x);
 
   // Convert từ normalized (0-1) sang pixel
   return {
     x: (centerX - finalWidth / 2) * canvasWidth,
     y: (centerY - finalHeight / 2) * canvasHeight,
     width: finalWidth * canvasWidth,
     height: finalHeight * canvasHeight,
     rotation,
     visible: true,
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
     return config.map((c) =>
       calculateSingleOverlay(landmarks, c, canvasWidth, canvasHeight)
     );
   }
 
   return calculateSingleOverlay(landmarks, config, canvasWidth, canvasHeight);
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
     const minVis = Math.min(
       landmarks[c.topLeft].visibility ?? 0,
       landmarks[c.topRight].visibility ?? 0,
       landmarks[c.bottomLeft].visibility ?? 0,
       landmarks[c.bottomRight].visibility ?? 0
     );
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

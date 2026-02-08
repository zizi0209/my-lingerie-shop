 /**
  * MediaPipe Pose Detection Service
  * 
  * Sử dụng MediaPipe PoseLandmarker để:
  * - Detect 33 body landmarks
  * - Validate pose phù hợp cho virtual try-on
  * - Guide user chụp ảnh đúng tư thế
  */
 
 import {
   PoseLandmarker,
   FilesetResolver,
   DrawingUtils,
   NormalizedLandmark,
 } from '@mediapipe/tasks-vision';
 
 // Singleton instance
 let poseLandmarker: PoseLandmarker | null = null;
 let isInitializing = false;
 
 // CDN URLs for MediaPipe WASM and model
 const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
 const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
 
 /**
  * Initialize PoseLandmarker (singleton pattern)
  */
 export async function initPoseLandmarker(): Promise<PoseLandmarker> {
   if (poseLandmarker) {
     return poseLandmarker;
   }
 
   if (isInitializing) {
     // Wait for initialization to complete
     while (isInitializing) {
       await new Promise(resolve => setTimeout(resolve, 100));
     }
     if (poseLandmarker) {
       return poseLandmarker;
     }
   }
 
   isInitializing = true;
 
   try {
     const vision = await FilesetResolver.forVisionTasks(WASM_URL);
 
     poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
       baseOptions: {
         modelAssetPath: MODEL_URL,
         delegate: 'GPU', // Use GPU if available, falls back to CPU
       },
       runningMode: 'IMAGE',
       numPoses: 1,
       minPoseDetectionConfidence: 0.5,
       minPosePresenceConfidence: 0.5,
       minTrackingConfidence: 0.5,
       outputSegmentationMasks: false,
     });
 
     console.log('[PoseDetection] Initialized successfully');
     return poseLandmarker;
   } catch (error) {
     console.error('[PoseDetection] Failed to initialize:', error);
     throw error;
   } finally {
     isInitializing = false;
   }
 }
 
 /**
  * Detect pose from an image element or canvas
  */
 export async function detectPose(
   image: HTMLImageElement | HTMLCanvasElement
 ): Promise<NormalizedLandmark[] | null> {
   const landmarker = await initPoseLandmarker();
   
   try {
     const result = landmarker.detect(image);
     
     if (result.landmarks && result.landmarks.length > 0) {
       return result.landmarks[0]; // Return first detected pose
     }
     
     return null;
   } catch (error) {
     console.error('[PoseDetection] Detection failed:', error);
     return null;
   }
 }
 
 /**
  * Pose validation result
  */
 export interface PoseValidationResult {
   valid: boolean;
   score: number; // 0-100
   issues: PoseIssue[];
   landmarks: NormalizedLandmark[] | null;
 }
 
 export interface PoseIssue {
   type: 'shoulders' | 'torso' | 'posture' | 'visibility' | 'facing';
   message: string;
   severity: 'warning' | 'error';
 }
 
 // Landmark indices
 const LANDMARK = {
   NOSE: 0,
   LEFT_SHOULDER: 11,
   RIGHT_SHOULDER: 12,
   LEFT_ELBOW: 13,
   RIGHT_ELBOW: 14,
   LEFT_WRIST: 15,
   RIGHT_WRIST: 16,
   LEFT_HIP: 23,
   RIGHT_HIP: 24,
   LEFT_KNEE: 25,
   RIGHT_KNEE: 26,
   LEFT_ANKLE: 27,
   RIGHT_ANKLE: 28,
 };
 
 /**
  * Validate pose for virtual try-on suitability
  */
 export function validatePoseForTryOn(
   landmarks: NormalizedLandmark[]
 ): PoseValidationResult {
   const issues: PoseIssue[] = [];
   let score = 100;
 
   // Get key landmarks
   const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER];
   const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER];
   const leftHip = landmarks[LANDMARK.LEFT_HIP];
   const rightHip = landmarks[LANDMARK.RIGHT_HIP];
 
   // Check 1: Shoulders visible (critical for lingerie try-on)
   const shoulderVisibility = Math.min(
     leftShoulder.visibility ?? 0,
     rightShoulder.visibility ?? 0
   );
   if (shoulderVisibility < 0.5) {
     issues.push({
       type: 'shoulders',
       message: 'Cần nhìn thấy rõ vai',
       severity: 'error',
     });
     score -= 30;
   } else if (shoulderVisibility < 0.7) {
     issues.push({
       type: 'shoulders',
       message: 'Vai chưa rõ, hãy điều chỉnh góc chụp',
       severity: 'warning',
     });
     score -= 15;
   }
 
   // Check 2: Torso visible (hips)
   const hipVisibility = Math.min(
     leftHip.visibility ?? 0,
     rightHip.visibility ?? 0
   );
   if (hipVisibility < 0.5) {
     issues.push({
       type: 'torso',
       message: 'Cần nhìn thấy toàn thân (từ vai đến hông)',
       severity: 'error',
     });
     score -= 25;
   } else if (hipVisibility < 0.7) {
     issues.push({
       type: 'torso',
       message: 'Thân người chưa rõ hoàn toàn',
       severity: 'warning',
     });
     score -= 10;
   }
 
   // Check 3: Standing upright (not leaning)
   const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
   const hipMidX = (leftHip.x + rightHip.x) / 2;
   const leanAmount = Math.abs(shoulderMidX - hipMidX);
   
   if (leanAmount > 0.15) {
     issues.push({
       type: 'posture',
       message: 'Đứng thẳng, không nghiêng người',
       severity: 'error',
     });
     score -= 20;
   } else if (leanAmount > 0.08) {
     issues.push({
       type: 'posture',
       message: 'Cố gắng đứng thẳng hơn',
       severity: 'warning',
     });
     score -= 10;
   }
 
   // Check 4: Facing camera (shoulders roughly horizontal)
   const shoulderAngle = Math.abs(leftShoulder.y - rightShoulder.y);
   if (shoulderAngle > 0.15) {
     issues.push({
       type: 'facing',
       message: 'Hướng mặt thẳng vào camera',
       severity: 'warning',
     });
     score -= 15;
   }
 
   // Check 5: Person not too small in frame
   const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
   if (shoulderWidth < 0.15) {
     issues.push({
       type: 'visibility',
       message: 'Đứng gần camera hơn',
       severity: 'warning',
     });
     score -= 10;
   } else if (shoulderWidth > 0.6) {
     issues.push({
       type: 'visibility',
       message: 'Lùi xa camera một chút',
       severity: 'warning',
     });
     score -= 5;
   }
 
   // Ensure score doesn't go below 0
   score = Math.max(0, score);
 
   return {
     valid: issues.filter(i => i.severity === 'error').length === 0,
     score,
     issues,
     landmarks,
   };
 }
 
 /**
  * Validate pose from image file
  */
 export async function validateImagePose(
   imageFile: File
 ): Promise<PoseValidationResult> {
   return new Promise((resolve) => {
     const img = new Image();
     img.onload = async () => {
       try {
         const landmarks = await detectPose(img);
         
         if (!landmarks) {
           resolve({
             valid: false,
             score: 0,
             issues: [{
               type: 'visibility',
               message: 'Không phát hiện được người trong ảnh',
               severity: 'error',
             }],
             landmarks: null,
           });
           return;
         }
         
         resolve(validatePoseForTryOn(landmarks));
       } catch (error) {
         console.error('[PoseDetection] Validation error:', error);
         resolve({
           valid: false,
           score: 0,
           issues: [{
               type: 'visibility',
               message: 'Lỗi phân tích ảnh, vui lòng thử ảnh khác',
               severity: 'error',
             }],
           landmarks: null,
         });
       }
     };
     
     img.onerror = () => {
       resolve({
         valid: false,
         score: 0,
         issues: [{
           type: 'visibility',
           message: 'Không thể đọc file ảnh',
           severity: 'error',
         }],
         landmarks: null,
       });
     };
     
     img.src = URL.createObjectURL(imageFile);
   });
 }
 
 /**
  * Draw pose landmarks on canvas
  */
 export function drawPoseLandmarks(
   canvas: HTMLCanvasElement,
   landmarks: NormalizedLandmark[],
   options?: {
     connectionColor?: string;
     landmarkColor?: string;
     lineWidth?: number;
   }
 ): void {
   const ctx = canvas.getContext('2d');
   if (!ctx) return;
 
   const drawingUtils = new DrawingUtils(ctx);
   
   // Draw connections
   drawingUtils.drawConnectors(
     landmarks,
     PoseLandmarker.POSE_CONNECTIONS,
     {
       color: options?.connectionColor ?? '#00FF00',
       lineWidth: options?.lineWidth ?? 2,
     }
   );
 
   // Draw landmarks
   drawingUtils.drawLandmarks(landmarks, {
     color: options?.landmarkColor ?? '#FF0000',
     lineWidth: 1,
     radius: 3,
   });
 }
 
 /**
  * Cleanup resources
  */
 export function disposePoseLandmarker(): void {
   if (poseLandmarker) {
     poseLandmarker.close();
     poseLandmarker = null;
   }
 }

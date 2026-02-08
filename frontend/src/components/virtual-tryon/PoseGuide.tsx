 'use client';
 
 import { useState, useEffect, useCallback, useRef } from 'react';
 import { CheckCircle, AlertCircle, AlertTriangle, Loader2, User } from 'lucide-react';
 import { 
   validateImagePose, 
   PoseValidationResult, 
   PoseIssue,
   drawPoseLandmarks 
 } from '@/services/pose-detection';
 
 interface PoseGuideProps {
   imageFile: File | null;
   onValidationComplete?: (result: PoseValidationResult) => void;
   showOverlay?: boolean;
 }
 
 type ValidationStatus = 'idle' | 'loading' | 'success' | 'warning' | 'error';
 
 export function PoseGuide({ 
   imageFile, 
   onValidationComplete,
   showOverlay = true 
 }: PoseGuideProps) {
   const [status, setStatus] = useState<ValidationStatus>('idle');
   const [result, setResult] = useState<PoseValidationResult | null>(null);
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const imageRef = useRef<HTMLImageElement>(null);
 
   const validatePose = useCallback(async (file: File) => {
     setStatus('loading');
     
     try {
       const validationResult = await validateImagePose(file);
       setResult(validationResult);
       
       // Determine status
       if (!validationResult.valid) {
         setStatus('error');
       } else if (validationResult.issues.length > 0) {
         setStatus('warning');
       } else {
         setStatus('success');
       }
       
       onValidationComplete?.(validationResult);
     } catch (error) {
       console.error('[PoseGuide] Validation failed:', error);
       setStatus('error');
       setResult({
         valid: false,
         score: 0,
         issues: [{
           type: 'visibility',
           message: 'Không thể phân tích ảnh',
           severity: 'error',
         }],
         landmarks: null,
       });
     }
   }, [onValidationComplete]);
 
   // Validate when image changes
   useEffect(() => {
     if (imageFile) {
       const url = URL.createObjectURL(imageFile);
       setImageUrl(url);
       validatePose(imageFile);
       
       return () => {
         URL.revokeObjectURL(url);
       };
     } else {
       setStatus('idle');
       setResult(null);
       setImageUrl(null);
     }
   }, [imageFile, validatePose]);
 
   // Draw landmarks overlay
   useEffect(() => {
     if (!showOverlay || !result?.landmarks || !canvasRef.current || !imageRef.current) {
       return;
     }
 
     const canvas = canvasRef.current;
     const img = imageRef.current;
     
     // Wait for image to load
     if (!img.complete) {
       img.onload = () => {
         canvas.width = img.naturalWidth;
         canvas.height = img.naturalHeight;
         drawPoseLandmarks(canvas, result.landmarks!, {
           connectionColor: status === 'success' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444',
           landmarkColor: '#ffffff',
           lineWidth: 3,
         });
       };
     } else {
       canvas.width = img.naturalWidth;
       canvas.height = img.naturalHeight;
       drawPoseLandmarks(canvas, result.landmarks, {
         connectionColor: status === 'success' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444',
         landmarkColor: '#ffffff',
         lineWidth: 3,
       });
     }
   }, [result, showOverlay, status]);
 
   if (!imageFile) {
     return null;
   }
 
   return (
     <div className="space-y-3">
       {/* Image with pose overlay */}
       {showOverlay && imageUrl && (
         <div className="relative">
           <img
             ref={imageRef}
             src={imageUrl}
             alt="Preview with pose"
             className="w-full h-48 sm:h-64 object-contain rounded-lg bg-gray-100"
           />
           <canvas
             ref={canvasRef}
             className="absolute inset-0 w-full h-full object-contain pointer-events-none"
             style={{ mixBlendMode: 'normal' }}
           />
           
           {/* Loading overlay */}
           {status === 'loading' && (
             <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-lg">
               <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2">
                 <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                 <span className="text-sm">Phân tích tư thế...</span>
               </div>
             </div>
           )}
         </div>
       )}
 
       {/* Validation Status Badge */}
       <PoseStatusBadge status={status} score={result?.score ?? 0} />
 
       {/* Issues List */}
       {result && result.issues.length > 0 && (
         <PoseIssuesList issues={result.issues} />
       )}
 
       {/* Success Message */}
       {status === 'success' && (
         <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
           <div className="flex items-center gap-2 text-green-700">
             <CheckCircle className="w-5 h-5" />
             <span className="text-sm font-medium">Tư thế hoàn hảo! Sẵn sàng thử đồ.</span>
           </div>
         </div>
       )}
     </div>
   );
 }
 
 /**
  * Status Badge Component
  */
 function PoseStatusBadge({ status, score }: { status: ValidationStatus; score: number }) {
   if (status === 'idle' || status === 'loading') {
     return null;
   }
 
   const config = {
     success: {
       bg: 'bg-green-100',
       text: 'text-green-700',
       icon: CheckCircle,
       label: 'Tư thế tốt',
     },
     warning: {
       bg: 'bg-yellow-100',
       text: 'text-yellow-700',
       icon: AlertTriangle,
       label: 'Có thể cải thiện',
     },
     error: {
       bg: 'bg-red-100',
       text: 'text-red-700',
       icon: AlertCircle,
       label: 'Cần điều chỉnh',
     },
   }[status];
 
   const Icon = config.icon;
 
   return (
     <div className={`flex items-center justify-between p-2 rounded-lg ${config.bg}`}>
       <div className={`flex items-center gap-2 ${config.text}`}>
         <Icon className="w-4 h-4" />
         <span className="text-sm font-medium">{config.label}</span>
       </div>
       <div className={`text-sm font-bold ${config.text}`}>
         {score}/100
       </div>
     </div>
   );
 }
 
 /**
  * Issues List Component
  */
 function PoseIssuesList({ issues }: { issues: PoseIssue[] }) {
   return (
     <div className="space-y-2">
       {issues.map((issue, index) => (
         <div
           key={index}
           className={`flex items-start gap-2 p-2 rounded-lg ${
             issue.severity === 'error' 
               ? 'bg-red-50 text-red-700' 
               : 'bg-yellow-50 text-yellow-700'
           }`}
         >
           {issue.severity === 'error' ? (
             <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
           ) : (
             <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
           )}
           <span className="text-sm">{issue.message}</span>
         </div>
       ))}
     </div>
   );
 }
 
 /**
  * Pose Guide Tips - Static component for guidance
  */
 export function PoseGuideTips() {
   return (
     <div className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100 rounded-lg">
       <div className="flex items-start gap-3">
         <div className="p-2 bg-white rounded-full shadow-sm">
           <User className="w-5 h-5 text-pink-500" />
         </div>
         <div className="flex-1">
           <h4 className="text-sm font-medium text-gray-800 mb-2">
             Hướng dẫn tư thế tốt nhất
           </h4>
           <ul className="text-xs text-gray-600 space-y-1">
             <li className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
               Đứng thẳng, mặt hướng camera
             </li>
             <li className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
               Để lộ vai và phần thân trên
             </li>
             <li className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
               Nền đơn giản, ánh sáng đều
             </li>
             <li className="flex items-center gap-1">
               <span className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
               Tay để xuôi tự nhiên
             </li>
           </ul>
         </div>
       </div>
     </div>
   );
 }

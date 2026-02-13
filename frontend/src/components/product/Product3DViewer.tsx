 "use client";
 
 import { useEffect, useRef, useState } from "react";
 import { Box, Loader2, AlertCircle } from "lucide-react";
 
 interface Product3DViewerProps {
   model3dUrl: string;
   productName: string;
  posterUrl?: string;
   className?: string;
 }
 
export default function Product3DViewer({ model3dUrl, productName, posterUrl, className = "" }: Product3DViewerProps) {
   const containerRef = useRef<HTMLDivElement>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(false);
 
   useEffect(() => {
     // Dynamically import model-viewer to avoid SSR issues
     import("@google/model-viewer").catch(() => {
       setError(true);
       setLoading(false);
     });
   }, []);
 
   return (
     <div ref={containerRef} className={`relative bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden ${className}`}>
       {loading && (
         <div className="absolute inset-0 flex items-center justify-center z-10">
           <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
         </div>
       )}
 
       {error ? (
         <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
           <AlertCircle className="w-8 h-8" />
           <p className="text-sm">Không thể tải mô hình 3D</p>
         </div>
       ) : (
         // @ts-expect-error model-viewer is a web component
         <model-viewer
           src={model3dUrl}
           alt={`Mô hình 3D - ${productName}`}
          poster={posterUrl}
           auto-rotate
           camera-controls
           shadow-intensity="1"
           shadow-softness="1"
           exposure="1"
           environment-image="neutral"
           style={{ width: "100%", height: "100%" }}
           onLoad={() => setLoading(false)}
           onError={() => {
             setError(true);
             setLoading(false);
           }}
         />
       )}
 
       <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1.5 rounded-full">
         <Box className="w-3.5 h-3.5" />
         <span>3D</span>
       </div>
     </div>
   );
 }

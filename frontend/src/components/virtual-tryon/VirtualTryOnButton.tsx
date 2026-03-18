'use client';

 import { useState, useEffect } from 'react';
 import { Sparkles, Loader2 } from 'lucide-react';

interface VirtualTryOnButtonProps {
  onClick: () => void;
  disabled?: boolean;
   checkStatus?: boolean; // Enable service status check
}

 const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
 
 export function VirtualTryOnButton({ onClick, disabled, checkStatus = false }: VirtualTryOnButtonProps) {
   const [isChecking, setIsChecking] = useState(false);
   const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
   const [providerCount, setProviderCount] = useState(0);
 
   useEffect(() => {
     if (!checkStatus) return;
 
     const checkServiceStatus = async () => {
       setIsChecking(true);
       try {
         const response = await fetch(`${API_BASE_URL}/virtual-tryon/status`);
         if (response.ok) {
           const data = await response.json();
           setIsAvailable(data.data?.available ?? false);
           setProviderCount(data.data?.providers?.filter((p: { available: boolean }) => p.available).length ?? 0);
         } else {
           setIsAvailable(false);
         }
       } catch {
         setIsAvailable(false);
       } finally {
         setIsChecking(false);
       }
     };
 
     checkServiceStatus();
   }, [checkStatus]);
 
   const isDisabled = disabled || (checkStatus && isAvailable === false);
 
   // Loading skeleton while checking status
   if (checkStatus && isChecking) {
     return (
       <div className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-200 text-gray-400 rounded-lg animate-pulse">
         <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
         <span className="hidden sm:inline">Đang kiểm tra...</span>
         <span className="sm:hidden">Đang kiểm tra...</span>
       </div>
     );
   }
 
  return (
    <button
      type="button"
      onClick={onClick}
       disabled={isDisabled}
       className={`w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-2 rounded-lg transition-colors text-sm sm:text-base ${
         isDisabled
           ? 'border-gray-300 text-gray-400 cursor-not-allowed'
           : 'border-pink-500 text-pink-500 hover:bg-pink-50 active:bg-pink-100'
       }`}
       title={checkStatus && providerCount > 0 ? `${providerCount} provider(s) sẵn sàng` : undefined}
    >
      <Sparkles className="w-4 sm:w-5 h-4 sm:h-5" />
      <span className="hidden sm:inline">Thử đồ ảo (AI) - Miễn phí</span>
      <span className="sm:hidden">Thử đồ ảo (AI)</span>
    </button>
  );
}
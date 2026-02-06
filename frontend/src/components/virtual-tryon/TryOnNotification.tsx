 'use client';
 
 import { useEffect } from 'react';
 import { Sparkles, X } from 'lucide-react';
 
 interface TryOnNotificationProps {
   productName: string;
   onView: () => void;
   onDismiss: () => void;
 }
 
 export function TryOnNotification({ productName, onView, onDismiss }: TryOnNotificationProps) {
   useEffect(() => {
     const timer = setTimeout(onDismiss, 10000);
     return () => clearTimeout(timer);
   }, [onDismiss]);
 
   return (
     <div className="fixed bottom-4 right-4 max-w-sm bg-white shadow-lg rounded-lg border border-gray-200 p-4 animate-slide-in z-50">
       <div className="flex items-start gap-3">
         <div className="p-2 bg-pink-100 rounded-full">
           <Sparkles className="w-5 h-5 text-pink-500" />
         </div>
         <div className="flex-1">
           <p className="font-medium text-gray-800">Ảnh thử đồ đã sẵn sàng!</p>
           <p className="text-sm text-gray-600">{productName}</p>
           <button
             type="button"
             onClick={onView}
             className="mt-2 text-sm text-pink-600 hover:text-pink-700 font-medium"
           >
             Xem kết quả →
           </button>
         </div>
         <button
           type="button"
           onClick={onDismiss}
           className="p-1 hover:bg-gray-100 rounded"
         >
           <X className="w-4 h-4 text-gray-400" />
         </button>
       </div>
     </div>
   );
 }

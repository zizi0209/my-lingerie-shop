 'use client';
 
 import { Volume2, VolumeX } from 'lucide-react';
 
 interface SpeakerButtonProps {
   isEnabled: boolean;
   isSpeaking: boolean;
   isSupported: boolean;
   onToggle: () => void;
   onStop: () => void;
 }
 
 export function SpeakerButton({
   isEnabled,
   isSpeaking,
   isSupported,
   onToggle,
   onStop,
 }: SpeakerButtonProps) {
   if (!isSupported) {
     return null;
   }
 
   const handleClick = () => {
     if (isSpeaking) {
       onStop();
     } else {
       onToggle();
     }
   };
 
   return (
     <button
       type="button"
       onClick={handleClick}
       className={`p-2 rounded-full transition-colors
                   ${isEnabled 
                     ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' 
                     : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                   }
                   ${isSpeaking ? 'animate-pulse' : ''}`}
       title={isEnabled ? 'Tắt đọc tự động' : 'Bật đọc tự động'}
     >
       {isEnabled ? (
         <Volume2 className="w-4 h-4" />
       ) : (
         <VolumeX className="w-4 h-4" />
       )}
     </button>
   );
 }

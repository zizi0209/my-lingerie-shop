 'use client';
 
 import { Mic, MicOff } from 'lucide-react';
 import { useWebSpeechSTT } from '@/hooks/useWebSpeechSTT';
 import { useEffect } from 'react';
 
 interface VoiceButtonProps {
   onTranscript: (text: string) => void;
   disabled?: boolean;
 }
 
 export function VoiceButton({ onTranscript, disabled }: VoiceButtonProps) {
   const {
     isListening,
     isSupported,
     transcript,
     startListening,
     stopListening,
     resetTranscript,
   } = useWebSpeechSTT({
     lang: 'vi-VN',
     continuous: false,
     interimResults: true,
   });
 
   useEffect(() => {
     if (transcript) {
       onTranscript(transcript);
       resetTranscript();
     }
   }, [transcript, onTranscript, resetTranscript]);
 
   if (!isSupported) {
     return null;
   }
 
   const handleClick = () => {
     if (isListening) {
       stopListening();
     } else {
       startListening();
     }
   };
 
   return (
     <button
       type="button"
       onClick={handleClick}
       disabled={disabled}
       className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                   transition-all duration-200
                   ${isListening 
                     ? 'bg-red-500 text-white animate-pulse' 
                     : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                   }
                   disabled:opacity-50 disabled:cursor-not-allowed`}
       title={isListening ? 'Đang nghe... Nhấn để dừng' : 'Nhấn để nói'}
     >
       {isListening ? (
         <MicOff className="w-5 h-5" />
       ) : (
         <Mic className="w-5 h-5" />
       )}
     </button>
   );
 }

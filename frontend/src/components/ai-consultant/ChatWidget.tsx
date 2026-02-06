 'use client';
'use client';

import { useState, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatContainer } from './ChatContainer';

interface ChatWidgetProps {
  productSlug?: string;
}

export function ChatWidget({ productSlug }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasOpenedRef = useRef(false);

  const handleToggle = () => {
    if (!isOpen) {
      hasOpenedRef.current = true;
    }
    setIsOpen(!isOpen);
  };

  const showPulse = !hasOpenedRef.current;

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[500px] max-h-[70vh]">
          <ChatContainer onClose={() => setIsOpen(false)} productSlug={productSlug} />
        </div>
      )}

      <button
        onClick={handleToggle}
        className={`fixed bottom-4 right-4 sm:right-6 z-50 w-14 h-14 rounded-full 
                    bg-gradient-to-r from-pink-500 to-rose-500 text-white
                    shadow-lg hover:shadow-xl
                    flex items-center justify-center
                    transition-all duration-300 hover:scale-105
                    ${showPulse ? 'animate-pulse' : ''}`}
        aria-label={isOpen ? 'Đóng chat' : 'Mở chat tư vấn'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {!isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 
                        bg-white dark:bg-gray-800 
                        px-3 py-2 rounded-lg shadow-lg
                        text-sm text-gray-700 dark:text-gray-300
                        animate-bounce
                        hidden sm:block">
          <div className="flex items-center gap-2">
            <span>👋</span>
            <span>Cần tư vấn không?</span>
          </div>
          <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-white dark:bg-gray-800 rotate-45" />
        </div>
      )}
    </>
  );
}
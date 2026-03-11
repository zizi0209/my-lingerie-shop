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
  const scrollTopRef = useRef(0);
  const activeChatIdRef = useRef('');

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
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] sm:right-6 sm:w-[min(92vw,680px)] lg:right-8 lg:w-[min(88vw,960px)] xl:right-10 xl:w-[min(82vw,1120px)] h-[calc(100dvh-6.5rem)] max-h-[calc(100dvh-6.5rem)] sm:h-[580px] sm:max-h-[80vh] lg:h-[640px]">
          <ChatContainer
            onClose={() => setIsOpen(false)}
            productSlug={productSlug}
            initialScrollTop={scrollTopRef.current}
            initialChatId={activeChatIdRef.current}
            onScrollPositionChange={(value) => {
              scrollTopRef.current = value;
            }}
            onActiveChatChange={(chatId) => {
              activeChatIdRef.current = chatId;
            }}
          />
        </div>
      )}

      <button
        onClick={handleToggle}
        className={`fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full 
                    bg-linear-to-r from-pink-500 to-rose-500 text-white
                    shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-xl
                    sm:right-6 ${showPulse ? 'animate-pulse' : ''}`}
        aria-label={isOpen ? 'Đóng chat' : 'Mở chat tư vấn'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {!isOpen && (
        <div className="fixed bottom-20 right-4 z-40 hidden rounded-2xl border border-pink-100 bg-white px-3 py-2 text-sm text-gray-700 shadow-md animate-bounce sm:right-6 sm:block dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span>👋</span>
            <span>Cần tư vấn không?</span>
          </div>
          <div className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 border border-pink-100 bg-white dark:border-gray-800 dark:bg-gray-900" />
        </div>
      )}
    </>
  );
}
'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Trash2, AlertCircle } from 'lucide-react';
import { useAIConsultant } from '@/hooks/useAIConsultant';
import { useWebSpeechTTS } from '@/hooks/useWebSpeechTTS';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { SpeakerButton } from './SpeakerButton';

interface ChatContainerProps {
  onClose: () => void;
  productSlug?: string;
}

export function ChatContainer({ onClose, productSlug }: ChatContainerProps) {
  const { messages, isLoading, error, sendMessage, clearChat, dismissError } = useAIConsultant();
  const { isSpeaking, isSupported: ttsSupported, autoSpeak, speak, stop, toggleAutoSpeak } = useWebSpeechTTS({
    lang: 'vi-VN',
    preferFemaleVoice: true,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const [isSttListening, setIsSttListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (autoSpeak && !isSttListening && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.id !== lastMessageIdRef.current) {
        lastMessageIdRef.current = lastMessage.id;
        speak(lastMessage.content);
      }
    }
  }, [messages, autoSpeak, isSttListening, speak]);

  const handleSendMessage = (content: string) => {
    sendMessage(content, { currentProductSlug: productSlug });
  };

  const handleBeforeVoiceStart = () => {
    setVoiceError(null);
    stop();
  };

  const handleVoiceListeningChange = (listening: boolean) => {
    setIsSttListening(listening);
  };

  const handleVoiceError = (message: string) => {
    setVoiceError(message);
  };

  useEffect(() => {
    if (messages.length > 1) {
      const lastMessage = messages[messages.length - 1];
      const previousMessage = messages[messages.length - 2];
      if (previousMessage.role === 'user' && lastMessage.role === 'assistant') {
        setVoiceError(null);
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg">👩</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm">Linh - Tư vấn viên</h3>
            <p className="text-xs opacity-80">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            title="Xóa cuộc trò chuyện"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <SpeakerButton
            isEnabled={autoSpeak}
            isSpeaking={isSpeaking}
            isSupported={ttsSupported}
            onToggle={toggleAutoSpeak}
            onStop={stop}
          />
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
              Xin chào! Mình là Linh
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Mình có thể giúp bạn tư vấn size, chọn sản phẩm phù hợp, hoặc giải đáp thắc mắc về sản phẩm.
            </p>
            <QuickActions onSelect={handleSendMessage} disabled={isLoading} />
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {(error || voiceError) && (
        <div className="mx-4 mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error || voiceError}</p>
          <button
            onClick={() => {
              dismissError();
              setVoiceError(null);
            }}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ChatInput
        onSend={handleSendMessage}
        onBeforeVoiceStart={handleBeforeVoiceStart}
        onVoiceListeningChange={handleVoiceListeningChange}
        onVoiceError={handleVoiceError}
        isLoading={isLoading}
      />
    </div>
  );
}

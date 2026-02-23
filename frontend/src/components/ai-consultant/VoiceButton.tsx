'use client';

import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useHybridSTT } from '@/hooks/useHybridSTT';
import { useEffect, useRef, useState } from 'react';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onBeforeStartListening?: () => void;
  onListeningChange?: (isListening: boolean) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function VoiceButton({
  onTranscript,
  onBeforeStartListening,
  onListeningChange,
  onError,
  disabled,
}: VoiceButtonProps) {
  const [showEngineInfo, setShowEngineInfo] = useState(false);
  const lastFinalTranscriptRef = useRef<string>('');

  const {
    isListening,
    isSupported,
    isModelLoading,
    modelLoadProgress,
    currentEngine,
    startListening,
    stopListening,
    preloadVoskModel,
  } = useHybridSTT({
    lang: 'vi-VN',
    preferVosk: true,
    onResult: (text, isFinal) => {
      if (!isFinal) return;

      const normalized = text.trim();
      if (!normalized) return;

      if (normalized === lastFinalTranscriptRef.current) {
        return;
      }

      lastFinalTranscriptRef.current = normalized;
      onTranscript(normalized);
    },
    onError: (error) => {
      onError?.(error);
    },
    onEngineChange: (engine) => {
      console.log('Using STT engine:', engine);
      setShowEngineInfo(true);
      setTimeout(() => setShowEngineInfo(false), 3000);
    },
  });

  // Preload Vosk model on component mount
  useEffect(() => {
    preloadVoskModel();
  }, [preloadVoskModel]);

  useEffect(() => {
    onListeningChange?.(isListening);
  }, [isListening, onListeningChange]);

  useEffect(() => {
    return () => {
      onListeningChange?.(false);
    };
  }, [onListeningChange]);

  if (!isSupported) {
    return null;
  }

  const handleClick = async () => {
    if (isListening) {
      stopListening();
      return;
    }

    lastFinalTranscriptRef.current = '';
    onBeforeStartListening?.();
    await startListening();
  };

  const getButtonTitle = () => {
    if (isModelLoading) {
      return `Đang tải model nhận dạng... ${modelLoadProgress}%`;
    }
    if (isListening) {
      const engineLabel = currentEngine === 'vosk' ? '(Vosk - Offline)' : '(Web Speech)';
      return `Đang nghe ${engineLabel}... Nhấn để dừng`;
    }
    return 'Nhấn để nói (Hỗ trợ tiếng Việt)';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : isModelLoading
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
        title={getButtonTitle()}
      >
        {isModelLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {isModelLoading && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                        text-xs bg-gray-800 text-white px-2 py-1 rounded shadow-lg">
          Tải model: {modelLoadProgress}%
        </div>
      )}

      {showEngineInfo && currentEngine && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                        text-xs bg-green-600 text-white px-2 py-1 rounded shadow-lg animate-fade-in">
          {currentEngine === 'vosk' ? '🎯 Vosk (Offline)' : '🌐 Web Speech'}
        </div>
      )}
    </div>
  );
}

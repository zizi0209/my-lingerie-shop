'use client';

import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useHybridSTT } from '@/hooks/useHybridSTT';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  const [isStarting, setIsStarting] = useState(false);
  const lastFinalTranscriptRef = useRef<string>('');
  const onListeningChangeRef = useRef(onListeningChange);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetSilenceTimerRef = useRef<() => void>(() => undefined);
  const isListeningRef = useRef(false);
  const sttDebugEnabled = useMemo(() => process.env.NEXT_PUBLIC_STT_DEBUG === 'true', []);
  const preferVosk = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_STT_PREFER_VOSK;
    if (!value) return true;

    const normalized = value.trim().toLowerCase();
    if (normalized === 'false') return false;
    if (normalized === 'true') return true;
    return true;
  }, []);

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
    preferVosk,
    debug: sttDebugEnabled,
    onResult: (text, isFinal) => {
      if (text.trim()) {
        resetSilenceTimerRef.current();
      }
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
    onBeforeStop: () => {
      onBeforeStartListening?.();
    },
  });

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }

    silenceTimeoutRef.current = setTimeout(() => {
      if (isListeningRef.current) {
        stopListening();
      }
    }, 2000);
  }, [stopListening]);

  useEffect(() => {
    resetSilenceTimerRef.current = resetSilenceTimer;
  }, [resetSilenceTimer]);

  useEffect(() => {
    onListeningChangeRef.current = onListeningChange;
  }, [onListeningChange]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    if (!isListening) {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      return;
    }

    resetSilenceTimer();
  }, [isListening, resetSilenceTimer]);

  useEffect(() => {
    if (!sttDebugEnabled) return;
    console.log(`[STT] debug_enabled ${JSON.stringify({ source: 'NEXT_PUBLIC_STT_DEBUG', preferVosk })}`);
  }, [sttDebugEnabled, preferVosk]);

  // Preload Vosk model on component mount
  useEffect(() => {
    preloadVoskModel();
  }, [preloadVoskModel]);

  useEffect(() => {
    onListeningChangeRef.current?.(isListening || isStarting);
  }, [isListening, isStarting]);

  useEffect(() => {
    if (!isListening || !isStarting) {
      return;
    }

    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    setIsStarting(false);
  }, [isListening, isStarting]);

  useEffect(() => {
    return () => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      onListeningChangeRef.current?.(false);
    };
  }, []);

  if (!isSupported) {
    return null;
  }

  const handleClick = async () => {
    if (isListening || isStarting) {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      stopListening();
      setIsStarting(false);
      return;
    }

    lastFinalTranscriptRef.current = '';
    setIsStarting(true);
    onBeforeStartListening?.();

    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    startTimeoutRef.current = setTimeout(() => {
      if (!isListeningRef.current) {
        setIsStarting(false);
      }
      startTimeoutRef.current = null;
    }, 2000);

    try {
      await startListening();
    } finally {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }
      if (isListeningRef.current) {
        setIsStarting(false);
      }
    }
  };

  const getButtonTitle = () => {
    if (isStarting) {
      return 'Đang bật microphone...';
    }
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
                      : isStarting
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : isModelLoading
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
        title={getButtonTitle()}
      >
        {isStarting || isModelLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {isStarting && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                        text-xs bg-blue-600 text-white px-2 py-1 rounded shadow-lg">
          Đang bật mic...
        </div>
      )}

      {isModelLoading && !isStarting && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                        text-xs bg-gray-800 text-white px-2 py-1 rounded shadow-lg">
          Tải model: {modelLoadProgress}%
        </div>
      )}

      {showEngineInfo && currentEngine && !isStarting && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap
                        text-xs bg-green-600 text-white px-2 py-1 rounded shadow-lg animate-fade-in">
          {currentEngine === 'vosk' ? '🎯 Vosk (Offline)' : '🌐 Web Speech'}
        </div>
      )}
    </div>
  );
}

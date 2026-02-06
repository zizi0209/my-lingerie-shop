 'use client';
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface UseWebSpeechSTTOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface UseWebSpeechSTTReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function useWebSpeechSTT(options: UseWebSpeechSTTOptions = {}): UseWebSpeechSTTReturn {
  const {
    lang = 'vi-VN',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isSupported) {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = lang;
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              final += result[0].transcript;
            } else {
              interim += result[0].transcript;
            }
          }

          if (final) {
            setTranscript(prev => prev + final);
            onResult?.(final, true);
          }

          setInterimTranscript(interim);
          if (interim) {
            onResult?.(interim, false);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          let errorMessage = 'Lỗi nhận dạng giọng nói';
          
          switch (event.error) {
            case 'not-allowed':
              errorMessage = 'Vui lòng cho phép truy cập microphone';
              break;
            case 'no-speech':
              errorMessage = 'Không phát hiện giọng nói';
              break;
            case 'audio-capture':
              errorMessage = 'Không thể truy cập microphone';
              break;
            case 'network':
              errorMessage = 'Lỗi kết nối mạng';
              break;
          }

          onError?.(errorMessage);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [lang, continuous, interimResults, onResult, onError, isSupported]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setInterimTranscript('');
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
}
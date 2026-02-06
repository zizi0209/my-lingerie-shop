 'use client';
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface UseWebSpeechTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  preferFemaleVoice?: boolean;
}

interface UseWebSpeechTTSReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  autoSpeak: boolean;
  speak: (text: string) => void;
  stop: () => void;
  toggleAutoSpeak: () => void;
  availableVoices: SpeechSynthesisVoice[];
}

export function useWebSpeechTTS(options: UseWebSpeechTTSOptions = {}): UseWebSpeechTTSReturn {
  const {
    lang = 'vi-VN',
    rate = 1,
    pitch = 1,
    volume = 1,
    preferFemaleVoice = true,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!window.speechSynthesis;
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isSupported) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        let vietnameseVoices = voices.filter(v => 
          v.lang.includes('vi') || v.lang.includes('VI')
        );

        if (vietnameseVoices.length === 0) {
          vietnameseVoices = voices.filter(v => 
            v.lang.includes('vi') || 
            v.name.toLowerCase().includes('vietnam') ||
            v.name.toLowerCase().includes('vietnamese')
          );
        }

        if (vietnameseVoices.length > 0) {
          if (preferFemaleVoice) {
            const femaleVoice = vietnameseVoices.find(v => 
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('woman') ||
              v.name.toLowerCase().includes('nữ') ||
              v.name.includes('Google')
            );
            selectedVoiceRef.current = femaleVoice || vietnameseVoices[0];
          } else {
            selectedVoiceRef.current = vietnameseVoices[0];
          }
        } else {
          selectedVoiceRef.current = voices[0] || null;
        }
      };

      loadVoices();

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang, preferFemaleVoice, isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, lang, rate, pitch, volume]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak(prev => !prev);
  }, []);

  return {
    isSpeaking,
    isSupported,
    autoSpeak,
    speak,
    stop,
    toggleAutoSpeak,
    availableVoices,
  };
}
'use client';
'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface UseHybridSTTOptions {
  lang?: string;
  preferVosk?: boolean;
  voskModelUrl?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEngineChange?: (engine: 'vosk' | 'webspeech') => void;
}

interface UseHybridSTTReturn {
  isListening: boolean;
  isSupported: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
  currentEngine: 'vosk' | 'webspeech' | null;
  transcript: string;
  interimTranscript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  preloadVoskModel: () => Promise<void>;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

const DEFAULT_VOSK_MODEL_URL = '/vosk-model-small-vn-0.4.tar.gz';

export function useHybridSTT(options: UseHybridSTTOptions = {}): UseHybridSTTReturn {
  const {
    lang = 'vi-VN',
    preferVosk = true,
    voskModelUrl = DEFAULT_VOSK_MODEL_URL,
    onResult,
    onError,
    onEngineChange,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [currentEngine, setCurrentEngine] = useState<'vosk' | 'webspeech' | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  // Vosk refs
  const voskModelRef = useRef<any>(null);
  const voskRecognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voskLoadedRef = useRef(false);
  const voskLoadFailedRef = useRef(false);
  const isListeningRef = useRef(false);

  const isWebSpeechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const isVoskSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }, []);

  const isSupported = isWebSpeechSupported || isVoskSupported;

  // Keep isListeningRef in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Load Vosk model
  const preloadVoskModel = useCallback(async () => {
    if (voskLoadedRef.current || voskLoadFailedRef.current || isModelLoading) return;

    try {
      setIsModelLoading(true);
      setModelLoadProgress(0);

      const Vosk = await import('vosk-browser');
      
      // Check if model file exists
      const modelResponse = await fetch(voskModelUrl, { method: 'HEAD' });
      if (!modelResponse.ok) {
        console.log('Vosk model not found, will use Web Speech API');
        voskLoadFailedRef.current = true;
        setIsModelLoading(false);
        return;
      }

      const model = await Vosk.createModel(voskModelUrl);
      
      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        if (progress < 90) {
          progress += 10;
          setModelLoadProgress(progress);
        }
      }, 300);

      // Wait for model ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          clearInterval(progressInterval);
          reject(new Error('Model load timeout'));
        }, 120000);

        model.on('load', () => {
          clearTimeout(timeout);
          clearInterval(progressInterval);
          resolve();
        });

        model.on('error', (err: unknown) => {
          clearTimeout(timeout);
          clearInterval(progressInterval);
          reject(err);
        });

        // Also check ready flag
        const checkReady = setInterval(() => {
          if (model.ready) {
            clearInterval(checkReady);
            clearTimeout(timeout);
            clearInterval(progressInterval);
            resolve();
          }
        }, 100);
      });

      voskModelRef.current = model;
      voskLoadedRef.current = true;
      setModelLoadProgress(100);
      setIsModelLoading(false);
      console.log('Vosk model loaded successfully');

    } catch (error) {
      console.error('Failed to load Vosk model:', error);
      voskLoadFailedRef.current = true;
      setIsModelLoading(false);
      setModelLoadProgress(0);
    }
  }, [voskModelUrl, isModelLoading]);

  // Start listening with Vosk
  const startVoskListening = useCallback(async () => {
    if (!voskModelRef.current || isListeningRef.current) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const recognizer = new voskModelRef.current.KaldiRecognizer(16000);
      voskRecognizerRef.current = recognizer;

      recognizer.on('result', (message: { result: { text: string } }) => {
        const text = message.result.text;
        if (text && text.trim()) {
          setTranscript(prev => prev + (prev ? ' ' : '') + text.trim());
          onResult?.(text.trim(), true);
        }
      });

      recognizer.on('partialresult', (message: { result: { partial: string } }) => {
        const partial = message.result.partial;
        if (partial) {
          setInterimTranscript(partial);
          onResult?.(partial, false);
        }
      });

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        try {
          if (voskRecognizerRef.current) {
            voskRecognizerRef.current.acceptWaveform(event.inputBuffer);
          }
        } catch (error) {
          console.error('Audio processing error:', error);
        }
      };

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);
      setCurrentEngine('vosk');
      onEngineChange?.('vosk');
      console.log('Vosk STT started');
      return true;

    } catch (error) {
      console.error('Vosk listening failed:', error);
      if ((error as Error).name === 'NotAllowedError') {
        onError?.('Vui lòng cho phép truy cập microphone');
      }
      return false;
    }
  }, [onResult, onEngineChange, onError]);

  // Start listening with Web Speech API
  const startWebSpeechListening = useCallback(() => {
    if (!isWebSpeechSupported || isListeningRef.current) return false;

    try {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setCurrentEngine('webspeech');
        onEngineChange?.('webspeech');
        console.log('Web Speech STT started');
      };

      recognition.onend = () => {
        setIsListening(false);
        setCurrentEngine(null);
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
        console.log('Web Speech API error:', event.error);
        if (event.error === 'aborted') {
          return;
        }
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

      recognition.start();
      return true;
    } catch (error) {
      console.error('Web Speech listening failed:', error);
      return false;
    }
  }, [lang, isWebSpeechSupported, onResult, onError, onEngineChange]);

  // Main start listening function
  const startListening = useCallback(async () => {
    if (isListeningRef.current) {
      console.log('Already listening, ignoring start request');
      return;
    }

    setTranscript('');
    setInterimTranscript('');

    // Try Vosk first if preferred and model is loaded
    if (preferVosk && voskLoadedRef.current && !voskLoadFailedRef.current) {
      const success = await startVoskListening();
      if (success) return;
    }

    // If Vosk model not loaded yet and preferred, try loading first
    if (preferVosk && !voskLoadFailedRef.current && !voskLoadedRef.current) {
      await preloadVoskModel();
      if (voskLoadedRef.current) {
        const success = await startVoskListening();
        if (success) return;
      }
    }

    // Fallback to Web Speech API
    if (isWebSpeechSupported) {
      const success = startWebSpeechListening();
      if (success) return;
    }

    if (!isWebSpeechSupported && !voskLoadedRef.current) {
      onError?.('Trình duyệt không hỗ trợ nhận dạng giọng nói');
    }
  }, [
    preferVosk,
    isWebSpeechSupported,
    startVoskListening,
    startWebSpeechListening,
    preloadVoskModel,
    onError,
  ]);

  // Stop listening
  const stopListening = useCallback(() => {
    console.log('Stopping STT, engine:', currentEngine);
    
    // Stop Vosk
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (voskRecognizerRef.current) {
      try {
        voskRecognizerRef.current.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
      voskRecognizerRef.current = null;
    }

    setIsListening(false);
    setCurrentEngine(null);
    setInterimTranscript('');
  }, [currentEngine]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sourceRef.current) sourceRef.current.disconnect();
      if (processorRef.current) processorRef.current.disconnect();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (voskModelRef.current) {
        voskModelRef.current.terminate();
        voskModelRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    isModelLoading,
    modelLoadProgress,
    currentEngine,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    preloadVoskModel,
  };
}
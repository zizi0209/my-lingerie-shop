'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface UseVoskSTTOptions {
  modelUrl?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onModelLoading?: (progress: number) => void;
}

interface UseVoskSTTReturn {
  isListening: boolean;
  isSupported: boolean;
  isModelLoaded: boolean;
  isModelLoading: boolean;
  modelLoadProgress: number;
  transcript: string;
  interimTranscript: string;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  loadModel: () => Promise<void>;
}

// Vosk model URL - Vietnamese small model
const DEFAULT_MODEL_URL = '/vosk-model-small-vn-0.4.tar.gz';

export function useVoskSTT(options: UseVoskSTTOptions = {}): UseVoskSTTReturn {
  const {
    modelUrl = DEFAULT_MODEL_URL,
    onResult,
    onError,
    onModelLoading,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }, []);

  const loadModel = useCallback(async () => {
    if (isModelLoaded || isModelLoading) return;

    try {
      setIsModelLoading(true);
      setModelLoadProgress(0);

      // Dynamic import to avoid SSR issues
      const Vosk = await import('vosk-browser');
      
      const model = await Vosk.createModel(modelUrl);
      
      model.on('load', () => {
        setIsModelLoaded(true);
        setIsModelLoading(false);
        setModelLoadProgress(100);
        onModelLoading?.(100);
      });

      model.on('error', (error: unknown) => {
        console.error('Vosk model error:', error);
        setIsModelLoading(false);
      });

      modelRef.current = model;
      
      // Simulate progress since Vosk doesn't provide progress events
      let progress = 0;
      const progressInterval = setInterval(() => {
        if (progress < 90) {
          progress += 10;
          setModelLoadProgress(progress);
          onModelLoading?.(progress);
        }
      }, 500);

      // Wait for model to be ready
      await new Promise<void>((resolve) => {
        const checkReady = setInterval(() => {
          if (model.ready) {
            clearInterval(checkReady);
            clearInterval(progressInterval);
            setIsModelLoaded(true);
            setIsModelLoading(false);
            setModelLoadProgress(100);
            onModelLoading?.(100);
            resolve();
          }
        }, 100);

        // Timeout after 60 seconds
        setTimeout(() => {
          clearInterval(checkReady);
          clearInterval(progressInterval);
          if (!model.ready) {
            onError?.('Tải model quá lâu. Vui lòng thử lại.');
            setIsModelLoading(false);
          }
        }, 60000);
      });

    } catch (error) {
      console.error('Failed to load Vosk model:', error);
      onError?.('Không thể tải model nhận dạng giọng nói');
      setIsModelLoading(false);
    }
  }, [modelUrl, isModelLoaded, isModelLoading, onError, onModelLoading]);

  const startListening = useCallback(async () => {
    if (!modelRef.current || !isModelLoaded) {
      await loadModel();
      if (!modelRef.current) {
        onError?.('Model chưa sẵn sàng');
        return;
      }
    }

    if (isListening) return;

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Create recognizer
      const recognizer = new modelRef.current.KaldiRecognizer(16000);
      recognizerRef.current = recognizer;

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

      // Create audio processor
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        try {
          if (recognizerRef.current) {
            recognizerRef.current.acceptWaveform(event.inputBuffer);
          }
        } catch (error) {
          console.error('Audio processing error:', error);
        }
      };

      // Connect audio nodes
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);
      setTranscript('');
      setInterimTranscript('');

    } catch (error) {
      console.error('Failed to start listening:', error);
      if ((error as Error).name === 'NotAllowedError') {
        onError?.('Vui lòng cho phép truy cập microphone');
      } else {
        onError?.('Không thể truy cập microphone');
      }
    }
  }, [isModelLoaded, isListening, loadModel, onResult, onError]);

  const stopListening = useCallback(() => {
    if (!isListening) return;

    // Disconnect audio nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Get final result
    if (recognizerRef.current) {
      recognizerRef.current.remove();
      recognizerRef.current = null;
    }

    setIsListening(false);
    setInterimTranscript('');
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (modelRef.current) {
        modelRef.current.terminate();
        modelRef.current = null;
      }
    };
  }, [stopListening]);

  return {
    isListening,
    isSupported,
    isModelLoaded,
    isModelLoading,
    modelLoadProgress,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    loadModel,
  };
}

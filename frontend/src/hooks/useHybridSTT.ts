'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

interface UseHybridSTTOptions {
  lang?: string;
  preferVosk?: boolean;
  voskModelUrl?: string;
  debug?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEngineChange?: (engine: 'vosk' | 'webspeech') => void;
  onBeforeStop?: () => void;
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
    debug = false,
    onResult,
    onError,
    onEngineChange,
    onBeforeStop,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [currentEngine, setCurrentEngine] = useState<'vosk' | 'webspeech' | null>(null);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const currentEngineRef = useRef<'vosk' | 'webspeech' | null>(null);
  const manualStopRequestedRef = useRef(false);

  // Vosk refs
  const voskModelRef = useRef<any>(null);
  const voskRecognizerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const voskLoadedRef = useRef(false);
  const voskLoadFailedRef = useRef(false);

  // Web Speech refs
  const webSpeechRecognitionRef = useRef<SpeechRecognition | null>(null);

  // Session guards
  const isListeningRef = useRef(false);
  const isStoppingRef = useRef(false);
  const sessionIdRef = useRef(0);
  const stoppingSessionIdRef = useRef<number | null>(null);
  const startupErrorReportedRef = useRef(false);

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

  useEffect(() => {
    currentEngineRef.current = currentEngine;
  }, [currentEngine]);

  const logDebug = useCallback(
    (event: string, meta?: Record<string, string | number | boolean | null | undefined>) => {
      if (!debug) return;
      const activeSession = sessionIdRef.current;
      const stoppingSession = stoppingSessionIdRef.current;
      const payload = {
        event,
        sessionId: activeSession,
        stoppingSessionId: stoppingSession,
        engine: currentEngineRef.current,
        isListening: isListeningRef.current,
        isStopping: isStoppingRef.current,
        ...(meta || {}),
      };
      console.log(`[STT] ${event} ${JSON.stringify(payload)}`);
    },
    [debug],
  );

  const appendFinalChunk = useCallback((rawChunk: string) => {
    const chunk = rawChunk.trim();
    if (!chunk) return '';

    setTranscript(prev => {
      if (!prev) return chunk;
      const normalizedPrev = prev.trim();
      if (normalizedPrev.endsWith(chunk)) {
        return prev;
      }
      return `${prev} ${chunk}`;
    });
    return chunk;
  }, []);

  const flushInterimAsFinal = useCallback(() => {
    const interim = interimTranscript.trim();
    if (!interim) return;

    const finalText = appendFinalChunk(interim);
    if (finalText) {
      onResult?.(finalText, true);
      logDebug('webspeech_manual_flush_interim', { textLength: finalText.length });
    }
    setInterimTranscript('');
  }, [interimTranscript, appendFinalChunk, onResult, logDebug]);

  // Load Vosk model
  const preloadVoskModel = useCallback(async () => {
    if (voskLoadedRef.current || voskLoadFailedRef.current || isModelLoading) return;

    try {
      setIsModelLoading(true);
      setModelLoadProgress(0);

      const Vosk = await import('vosk-browser');

      // Check if model file exists
      logDebug('vosk_preload_head_start', { modelUrl: voskModelUrl });
      const modelResponse = await fetch(voskModelUrl, { method: 'HEAD' });
      if (!modelResponse.ok && modelResponse.status !== 405) {
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
      logDebug('vosk_preload_success', { modelUrl: voskModelUrl });
      console.log('Vosk model loaded successfully');
    } catch (error) {
      console.error('Failed to load Vosk model:', error);
      logDebug('vosk_preload_failed', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      voskLoadFailedRef.current = true;
      setIsModelLoading(false);
      setModelLoadProgress(0);
    }
  }, [voskModelUrl, isModelLoading, logDebug]);

  // Start listening with Vosk
  const startVoskListening = useCallback(
    async (sessionId: number) => {
      logDebug('vosk_start_attempt', { sessionId });
      if (!voskModelRef.current || isListeningRef.current) {
        logDebug('vosk_start_skipped', {
          hasModel: Boolean(voskModelRef.current),
          alreadyListening: isListeningRef.current,
        });
        return false;
      }

      const cleanupVoskResources = () => {
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
          } catch {
            // Ignore cleanup errors
          }
          voskRecognizerRef.current = null;
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            channelCount: 1,
          },
        });

        if (sessionId !== sessionIdRef.current || isStoppingRef.current) {
          logDebug('vosk_start_cancelled_after_getusermedia', {
            sessionMatch: sessionId === sessionIdRef.current,
            isStopping: isStoppingRef.current,
          });
          stream.getTracks().forEach(track => track.stop());
          return false;
        }

        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        const recognizerSampleRate = Math.round(audioContext.sampleRate || 16000);

        const recognizer = new voskModelRef.current.KaldiRecognizer(recognizerSampleRate);
        voskRecognizerRef.current = recognizer;

        recognizer.on('result', (message: { result: { text: string } }) => {
          if (sessionId !== sessionIdRef.current) return;

          if (isStoppingRef.current && stoppingSessionIdRef.current !== sessionId) {
            return;
          }

          const finalText = appendFinalChunk(message.result.text);
          logDebug('vosk_result', {
            isFinal: true,
            textLength: finalText.length,
          });
          if (finalText) {
            onResult?.(finalText, true);
          }
        });

        recognizer.on('partialresult', (message: { result: { partial: string } }) => {
          if (sessionId !== sessionIdRef.current || isStoppingRef.current) return;

          const partial = message.result.partial;
          logDebug('vosk_result', {
            isFinal: false,
            textLength: partial.trim().length,
          });
          if (partial) {
            setInterimTranscript(partial);
            onResult?.(partial, false);
          }
        });

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = event => {
          if (sessionId !== sessionIdRef.current || isStoppingRef.current) return;

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

        if (sessionId !== sessionIdRef.current || isStoppingRef.current) {
          logDebug('vosk_start_cancelled_before_activate', {
            sessionMatch: sessionId === sessionIdRef.current,
            isStopping: isStoppingRef.current,
          });
          cleanupVoskResources();
          return false;
        }

        isListeningRef.current = true;
        setIsListening(true);
        setCurrentEngine('vosk');
        onEngineChange?.('vosk');
        logDebug('vosk_started', {
          sessionId,
          recognizerSampleRate,
          audioContextSampleRate: Math.round(audioContext.sampleRate || 0),
        });
        console.log('Vosk STT started');
        return true;
      } catch (error) {
        cleanupVoskResources();
        console.error('Vosk listening failed:', error);
        logDebug('vosk_failed', {
          error: error instanceof Error ? error.message : 'unknown',
        });
        if ((error as Error).name === 'NotAllowedError' && !startupErrorReportedRef.current) {
          startupErrorReportedRef.current = true;
          onError?.('Vui lòng cho phép truy cập microphone');
        }
        return false;
      }
    },
    [appendFinalChunk, onResult, onEngineChange, onError, logDebug],
  );

  // Start listening with Web Speech API
  const startWebSpeechListening = useCallback(
    (sessionId: number) => {
      if (!isWebSpeechSupported || isListeningRef.current) return false;

      try {
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();
        webSpeechRecognitionRef.current = recognition;

        recognition.lang = lang;
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          if (sessionId !== sessionIdRef.current || isStoppingRef.current) {
            try {
              recognition.abort();
            } catch {
              // Ignore abort errors
            }
            return;
          }

          isListeningRef.current = true;
          setIsListening(true);
          setCurrentEngine('webspeech');
          onEngineChange?.('webspeech');
          logDebug('webspeech_started', { sessionId });
          console.log('Web Speech STT started');
        };

        recognition.onend = () => {
          if (webSpeechRecognitionRef.current === recognition) {
            webSpeechRecognitionRef.current = null;
          }

          if (sessionId !== sessionIdRef.current) return;

          if (stoppingSessionIdRef.current === sessionId) {
            isStoppingRef.current = false;
            stoppingSessionIdRef.current = null;
            manualStopRequestedRef.current = false;
            logDebug('webspeech_stopped', { sessionId, reason: 'onend' });
          }

          isListeningRef.current = false;
          setIsListening(false);
          setCurrentEngine(null);
          setInterimTranscript('');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (sessionId !== sessionIdRef.current) return;

          let interim = '';
          const finalChunks: string[] = [];

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalChunks.push(result[0].transcript);
            } else {
              interim += result[0].transcript;
            }
          }

          const finalText = appendFinalChunk(finalChunks.join(' '));
          if (finalText) {
            onResult?.(finalText, true);
          }

          setInterimTranscript(interim);
          logDebug('webspeech_result', {
            isFinal: finalText.length > 0,
            finalLength: finalText.length,
            interimLength: interim.trim().length,
          });
          if (interim) {
            onResult?.(interim, false);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (sessionId !== sessionIdRef.current) return;

          if (webSpeechRecognitionRef.current === recognition) {
            webSpeechRecognitionRef.current = null;
          }

          console.log('Web Speech API error:', event.error);
          logDebug('webspeech_error', { error: event.error });
          if (event.error === 'aborted') {
            if (stoppingSessionIdRef.current === sessionId) {
              isStoppingRef.current = false;
              stoppingSessionIdRef.current = null;
              manualStopRequestedRef.current = false;
              logDebug('webspeech_stopped', { sessionId, reason: 'aborted' });
            }
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

          if (!startupErrorReportedRef.current) {
            startupErrorReportedRef.current = true;
            onError?.(errorMessage);
          }
          isListeningRef.current = false;
          setIsListening(false);
          setCurrentEngine(null);
          setInterimTranscript('');
        };

        recognition.start();
        return true;
      } catch (error) {
        console.error('Web Speech listening failed:', error);
        logDebug('webspeech_failed_to_start', {
          error: error instanceof Error ? error.message : 'unknown',
        });
        if (!startupErrorReportedRef.current) {
          startupErrorReportedRef.current = true;
          onError?.('Không thể khởi động nhận dạng giọng nói. Vui lòng thử lại.');
        }
        return false;
      }
    },
    [lang, isWebSpeechSupported, appendFinalChunk, onResult, onError, onEngineChange, logDebug],
  );

  // Stop listening
  const stopListening = useCallback(() => {
    if (!isListeningRef.current) return;
    if (manualStopRequestedRef.current) return;

    const currentSessionId = sessionIdRef.current;
    manualStopRequestedRef.current = true;
    isStoppingRef.current = true;
    stoppingSessionIdRef.current = currentSessionId;
    logDebug('stop_requested', { sessionId: currentSessionId });

    onBeforeStop?.();
    flushInterimAsFinal();

    const recognizer = voskRecognizerRef.current;
    if (recognizer) {
      try {
        recognizer.retrieveFinalResult();
      } catch {
        // Ignore final-result retrieval errors
      }
    }

    // Stop Web Speech
    const recognition = webSpeechRecognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }

      setTimeout(() => {
        if (webSpeechRecognitionRef.current === recognition && isStoppingRef.current) {
          try {
            recognition.abort();
          } catch {
            // Ignore abort errors
          }
        }
      }, 600);
    }

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
      } catch {
        // Ignore cleanup errors
      }
      voskRecognizerRef.current = null;
    }

    isListeningRef.current = false;
    setIsListening(false);
    setCurrentEngine(null);
    setInterimTranscript('');

    if (!recognition) {
      isStoppingRef.current = false;
      stoppingSessionIdRef.current = null;
      manualStopRequestedRef.current = false;
      logDebug('stop_completed_without_webspeech', { sessionId: currentSessionId });
    }
  }, [logDebug, onBeforeStop, flushInterimAsFinal]);

  // Main start listening function
  const startListening = useCallback(async () => {
    if (isListeningRef.current) {
      console.log('Already listening, ignoring start request');
      return;
    }

    if (isStoppingRef.current) {
      isStoppingRef.current = false;
      stoppingSessionIdRef.current = null;
      manualStopRequestedRef.current = false;
      logDebug('stopping_state_cleared_before_start');
    }

    startupErrorReportedRef.current = false;
    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;

    setTranscript('');
    setInterimTranscript('');

    // Try Vosk first if preferred and model is loaded
    if (preferVosk && voskLoadedRef.current && !voskLoadFailedRef.current) {
      logDebug('start_try_vosk', { sessionId });
      const success = await startVoskListening(sessionId);
      if (success) return;
      logDebug('start_fallback_after_vosk_failed', { sessionId });
    }

    // If Vosk model not loaded yet and preferred, try loading first
    if (preferVosk && !voskLoadFailedRef.current && !voskLoadedRef.current) {
      logDebug('start_preload_vosk', { sessionId });
      await preloadVoskModel();

      if (sessionId !== sessionIdRef.current) {
        return;
      }

      if (voskLoadedRef.current) {
        const success = await startVoskListening(sessionId);
        if (success) return;
      }
    }

    if (sessionId !== sessionIdRef.current) {
      return;
    }

    // Fallback to Web Speech API
    if (isWebSpeechSupported) {
      logDebug('start_try_webspeech', { sessionId });
      const success = startWebSpeechListening(sessionId);
      if (success) return;
      if (!startupErrorReportedRef.current) {
        startupErrorReportedRef.current = true;
        onError?.('Không thể khởi động nhận dạng giọng nói. Vui lòng thử lại.');
      }
      return;
    }

    if (!startupErrorReportedRef.current) {
      startupErrorReportedRef.current = true;
      onError?.('Trình duyệt không hỗ trợ nhận dạng giọng nói');
    }
  }, [
    preferVosk,
    isWebSpeechSupported,
    startVoskListening,
    startWebSpeechListening,
    preloadVoskModel,
    onError,
    logDebug,
  ]);

  const resetTranscript = useCallback(() => {
    manualStopRequestedRef.current = false;
    setTranscript('');
    setInterimTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (voskModelRef.current) {
        voskModelRef.current.terminate();
        voskModelRef.current = null;
      }
    };
  }, [stopListening]);

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

 'use client';
'use client';

import { useState, useCallback } from 'react';
import { processVirtualTryOn, getErrorMessage } from '@/services/virtual-tryon-api';
import {
  TryOnState,
  TryOnRequest,
  TryOnResult,
} from '@/types/virtual-tryon';

const initialState: TryOnState = {
  status: 'idle',
  progress: 0,
  queueInfo: null,
  result: null,
  error: null,
};

export function useVirtualTryOn() {
  const [state, setState] = useState<TryOnState>(initialState);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const startTryOn = useCallback(async (request: TryOnRequest) => {
    setState({
      status: 'uploading',
      progress: 0,
      queueInfo: null,
      result: null,
      error: null,
    });
    setProgressMessage('');

    try {
      const result = await processVirtualTryOn(
        request,
        (progress: number, message?: string) => {
          setState((prev) => ({
            ...prev,
            status: progress < 20 ? 'uploading' : 'processing',
            progress,
          }));
          if (message) {
            setProgressMessage(message);
          }
        }
      );

      setState({
        status: 'completed',
        progress: 100,
        queueInfo: null,
        result,
        error: null,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? getErrorMessage(error)
        : 'Đã xảy ra lỗi. Vui lòng thử lại sau.';
      setState({
        status: 'error',
        progress: 0,
        queueInfo: null,
        result: null,
        error: errorMessage,
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setProgressMessage('');
  }, []);

  const setResult = useCallback((result: TryOnResult) => {
    setState({
      status: 'completed',
      progress: 100,
      queueInfo: null,
      result,
      error: null,
    });
  }, []);

  return {
    ...state,
    progressMessage,
    startTryOn,
    reset,
    setResult,
    isLoading: state.status === 'uploading' || state.status === 'queued' || state.status === 'processing',
    isCompleted: state.status === 'completed',
    isError: state.status === 'error',
  };
}
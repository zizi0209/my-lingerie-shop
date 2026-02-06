 'use client';
'use client';

import { useState, useCallback, useRef } from 'react';
import { sendChatMessage, clearChatSession } from '@/services/ai-consultant-api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedProducts?: Array<{
    id: number;
    name: string;
    slug: string;
    price: number;
    imageUrl?: string;
  }>;
}

interface ChatContext {
  currentProductSlug?: string;
  userMeasurements?: {
    bust?: number;
    waist?: number;
    hip?: number;
  };
}

export function useAIConsultant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (content: string, context?: ChatContext) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendChatMessage(
        content.trim(),
        sessionIdRef.current || undefined,
        context
      );

      if (response.success && response.data) {
        sessionIdRef.current = response.data.sessionId;

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date(),
          suggestedProducts: response.data.suggestedProducts,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(response.error || 'Có lỗi xảy ra');
      }
    } catch {
      setError('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearChat = useCallback(async () => {
    if (sessionIdRef.current) {
      await clearChatSession(sessionIdRef.current);
    }
    setMessages([]);
    sessionIdRef.current = null;
    setError(null);
  }, []);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    dismissError,
  };
}
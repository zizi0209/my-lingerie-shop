'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { VoiceButton } from './VoiceButton';

interface ChatInputProps {
  onSend: (message: string) => void;
  onBeforeVoiceStart?: () => void;
  onVoiceListeningChange?: (isListening: boolean) => void;
  onVoiceError?: (error: string) => void;
  isLoading: boolean;
  placeholder?: string;
  focusSignal?: number;
}

const appendInputWithDelimiter = (prev: string, incoming: string) => {
  const next = incoming.trim();
  if (!next) return prev;

  if (!prev) {
    return next;
  }

  const needsSpace = !/\s$/.test(prev);
  return needsSpace ? `${prev} ${next}` : `${prev}${next}`;
};

export function ChatInput({
  onSend,
  onBeforeVoiceStart,
  onVoiceListeningChange,
  onVoiceError,
  isLoading,
  placeholder = 'Nhập tin nhắn...',
  focusSignal,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const maxTextareaHeight = 128;

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.focus();
  }, [focusSignal]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.overflowY = 'hidden';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const nextHeight = Math.min(inputRef.current.scrollHeight, maxTextareaHeight);
      inputRef.current.style.height = `${nextHeight}px`;
      inputRef.current.style.overflowY =
        inputRef.current.scrollHeight > maxTextareaHeight ? 'auto' : 'hidden';
    }
  };

  const handleVoiceListeningChange = (listening: boolean) => {
    onVoiceListeningChange?.(listening);
  };

  return (
    <div className="grid min-h-11 w-full grid-cols-[1fr_auto_auto] items-center gap-2">
      <textarea
        ref={inputRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className="w-full resize-none rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm text-gray-900
                   leading-5 placeholder:text-gray-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200
                   disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white
                   max-h-32 min-h-11 overflow-y-hidden"
      />
      <VoiceButton
        onTranscript={(text) => setInput((prev) => appendInputWithDelimiter(prev, text))}
        onBeforeStartListening={onBeforeVoiceStart}
        onListeningChange={handleVoiceListeningChange}
        onError={onVoiceError}
        disabled={isLoading}
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-pink-500 text-white
                   transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

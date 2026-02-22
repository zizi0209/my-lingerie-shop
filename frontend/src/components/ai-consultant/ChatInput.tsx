'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { VoiceButton } from './VoiceButton';

interface ChatInputProps {
  onSend: (message: string) => void;
  onBeforeVoiceStart?: () => void;
  onVoiceListeningChange?: (isListening: boolean) => void;
  isLoading: boolean;
  placeholder?: string;
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
  isLoading,
  placeholder = 'Nhập tin nhắn...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
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
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <textarea
        ref={inputRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600
                   bg-gray-50 dark:bg-gray-700 px-4 py-2.5 text-sm
                   focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed
                   dark:text-white placeholder-gray-400"
      />
      <VoiceButton
        onTranscript={(text) => setInput(prev => appendInputWithDelimiter(prev, text))}
        onBeforeStartListening={onBeforeVoiceStart}
        onListeningChange={onVoiceListeningChange}
        disabled={isLoading}
      />
      <button
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
        className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-500 text-white
                   flex items-center justify-center
                   hover:bg-pink-600 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

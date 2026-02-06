 'use client';
'use client';

import { Sparkles } from 'lucide-react';

interface VirtualTryOnButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function VirtualTryOnButton({ onClick, disabled }: VirtualTryOnButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-pink-500 text-pink-500 rounded-lg hover:bg-pink-50 active:bg-pink-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
    >
      <Sparkles className="w-4 sm:w-5 h-4 sm:h-5" />
      <span className="hidden sm:inline">Thử đồ ảo (AI) - Miễn phí</span>
      <span className="sm:hidden">Thử đồ ảo (AI)</span>
    </button>
  );
}
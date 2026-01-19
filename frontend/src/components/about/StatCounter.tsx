'use client';

import { useCountUp } from '@/hooks/useCountUp';

interface StatCounterProps {
  number: number;
  suffix: string;
  label: string;
  decimals?: number;
}

export function StatCounter({ number, suffix, label, decimals = 0 }: StatCounterProps) {
  const { count, ref } = useCountUp({
    end: number,
    duration: 2500,
    decimals,
    start: 0
  });

  return (
    <div ref={ref} className="text-center w-40 sm:w-48 md:w-56">
      <div className="text-3xl md:text-4xl lg:text-5xl font-light mb-2 text-gray-900 dark:text-white">
        {decimals > 0 
          ? count.toFixed(decimals) 
          : count.toLocaleString('vi-VN')
        }
        {suffix}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </p>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number; // ms
  decimals?: number;
  start?: number;
  onComplete?: () => void;
}

/**
 * Hook để tạo animation đếm số tăng dần
 * @param options - Cấu hình animation
 * @returns Giá trị hiện tại đang đếm
 */
export function useCountUp({
  end,
  duration = 2000,
  decimals = 0,
  start = 0,
  onComplete
}: UseCountUpOptions) {
  const [count, setCount] = useState(start);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  // Intersection Observer để detect khi element visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true); // Chỉ animate 1 lần
        }
      },
      { threshold: 0.3 } // Trigger khi 30% element visible
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      const currentElement = elementRef.current;
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [hasAnimated]);

  // Animation đếm số
  useEffect(() => {
    if (!isVisible) return;

    const startTime = Date.now();
    const startValue = start;
    const endValue = end;
    const range = endValue - startValue;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValue + range * easeOut;
      
      setCount(decimals > 0 
        ? parseFloat(currentValue.toFixed(decimals))
        : Math.floor(currentValue)
      );

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(endValue);
        onComplete?.();
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [isVisible, end, duration, decimals, start, onComplete]);

  return { count, ref: elementRef };
}

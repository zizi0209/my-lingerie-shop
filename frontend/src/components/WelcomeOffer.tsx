"use client";

import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { useRouter } from "next/navigation";
import { X, Gift } from "lucide-react";

export default function WelcomeOffer() {
  const { isVisible, dismiss, markEmailSubmitted } = useWelcomeOffer();
  const router = useRouter();

  if (!isVisible) return null;

  const handleGetOffer = () => {
    markEmailSubmitted();
    router.push("/register");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 max-w-sm">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              Chào bạn mới!
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
              Giảm <span className="font-bold text-primary">50K</span> cho đơn hàng đầu tiên khi đăng ký thành viên.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={handleGetOffer}
          className="w-full mt-4 bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-4 rounded-xl transition-colors"
        >
          Nhận ưu đãi ngay
        </button>

        {/* Subtle dismiss text */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          Hoặc{" "}
          <button onClick={dismiss} className="underline hover:text-gray-600 dark:hover:text-gray-400">
            để sau
          </button>
        </p>
      </div>
    </div>
  );
}

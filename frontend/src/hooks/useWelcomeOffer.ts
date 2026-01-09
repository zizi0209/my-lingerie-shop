"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "lingerie_welcome_offer";
const COOLDOWN_DAYS = 7;
const SHOW_DELAY_MS = 15000; // 15 giây
const SCROLL_THRESHOLD = 0.5; // 50%

interface WelcomeOfferState {
  dismissed: boolean;
  dismissedAt: number | null;
  emailSubmitted: boolean;
}

const getStoredState = (): WelcomeOfferState => {
  if (typeof window === "undefined") {
    return { dismissed: false, dismissedAt: null, emailSubmitted: false };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { dismissed: false, dismissedAt: null, emailSubmitted: false };
};

const setStoredState = (state: WelcomeOfferState) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
};

export function useWelcomeOffer() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Các trang không hiện popup
  const excludedPaths = ["/login", "/register", "/login-register", "/dashboard", "/checkout"];
  const isExcludedPage = excludedPaths.some((path) => pathname.startsWith(path));

  // Kiểm tra có nên hiện popup không
  const shouldShow = useCallback(() => {
    if (isLoading) return false;
    if (isAuthenticated) return false;
    if (isExcludedPage) return false;
    if (hasTriggered) return false;

    const state = getStoredState();
    
    // Đã submit email
    if (state.emailSubmitted) return false;
    
    // Đã dismiss trong cooldown period
    if (state.dismissed && state.dismissedAt) {
      const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - state.dismissedAt < cooldownMs) {
        return false;
      }
    }

    return true;
  }, [isAuthenticated, isLoading, isExcludedPage, hasTriggered]);

  // Trigger hiển thị popup
  const triggerShow = useCallback(() => {
    if (shouldShow()) {
      setIsVisible(true);
      setHasTriggered(true);
    }
  }, [shouldShow]);

  // Đóng popup
  const dismiss = useCallback(() => {
    setIsVisible(false);
    setStoredState({
      dismissed: true,
      dismissedAt: Date.now(),
      emailSubmitted: false,
    });
  }, []);

  // Đánh dấu đã submit (không hiện lại vĩnh viễn)
  const markEmailSubmitted = useCallback(() => {
    setIsVisible(false);
    setStoredState({
      dismissed: true,
      dismissedAt: Date.now(),
      emailSubmitted: true,
    });
  }, []);

  // Timer trigger sau 15 giây
  useEffect(() => {
    if (!shouldShow()) return;

    const timer = setTimeout(() => {
      triggerShow();
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [shouldShow, triggerShow]);

  // Scroll trigger khi scroll 50%
  useEffect(() => {
    if (!shouldShow()) return;

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY / scrollHeight;

      if (scrolled >= SCROLL_THRESHOLD) {
        triggerShow();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shouldShow, triggerShow]);

  return {
    isVisible,
    dismiss,
    markEmailSubmitted,
  };
}

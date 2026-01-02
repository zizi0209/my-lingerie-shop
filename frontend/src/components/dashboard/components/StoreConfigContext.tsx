'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '@/lib/api';

interface StoreConfig {
  store_name?: string;
  store_description?: string;
  store_email?: string;
  store_phone?: string;
  store_address?: string;
  store_logo?: string;
  store_favicon?: string;
  primary_color?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_tiktok?: string;
  [key: string]: string | undefined;
}

interface StoreConfigContextType {
  config: StoreConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
}

const StoreConfigContext = createContext<StoreConfigContextType | undefined>(undefined);

// Get initial theme from SSR (stored in window by ThemeScript)
function getInitialTheme(): string | undefined {
  if (typeof window !== 'undefined') {
    return (window as unknown as { __THEME_COLOR__?: string }).__THEME_COLOR__;
  }
  return undefined;
}

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  // Initialize with SSR theme color to prevent flash
  const [config, setConfig] = useState<StoreConfig>(() => ({
    primary_color: getInitialTheme(),
  }));
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: StoreConfig }>('/admin/system-config');
      if (response.success && response.data) {
        setConfig(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch store config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <StoreConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
      {children}
    </StoreConfigContext.Provider>
  );
}

// Hook để lấy primary color với fallback
export function usePrimaryColor(): string {
  const { config } = useStoreConfig();
  return config.primary_color || '#f43f5e';
}

export function useStoreConfig() {
  const context = useContext(StoreConfigContext);
  if (!context) {
    throw new Error('useStoreConfig must be used within StoreConfigProvider');
  }
  return context;
}

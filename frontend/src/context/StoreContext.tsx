'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { StoreConfig } from '@/lib/getServerTheme';

const StoreContext = createContext<StoreConfig | null>(null);

interface StoreProviderProps {
  children: ReactNode;
  config: StoreConfig;
}

export function StoreProvider({ children, config }: StoreProviderProps) {
  return (
    <StoreContext.Provider value={config}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreConfig {
  const context = useContext(StoreContext);
  if (!context) {
    // Return defaults if not in provider
    return {
      primary_color: '#f43f5e',
      store_name: 'Lingerie Shop',
    };
  }
  return context;
}

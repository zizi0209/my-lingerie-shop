'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

// Sử dụng localStorage key riêng cho dashboard để không ảnh hưởng đến frontend
const DASHBOARD_THEME_KEY = 'dashboard-theme';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);


export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always start with 'light' for SSR, then sync with localStorage on client
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Read from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem(DASHBOARD_THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
    setMounted(true);
  }, []);

  // Save to localStorage when theme changes (after mount)
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(DASHBOARD_THEME_KEY, theme);
  }, [theme, mounted]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // isDark is only true after mount and when theme is dark
  const isDark = mounted && theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

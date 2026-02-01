"use client";

import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { LanguageProvider } from "./components/LanguageContext";
import { StoreConfigProvider, usePrimaryColor } from "./components/StoreConfigContext";
import { ThemeProvider, useTheme } from "./components/ThemeContext";
import { ThemeInjector } from "@/components/ThemeInjector";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

const DashboardContent: React.FC<DashboardLayoutWrapperProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const primaryColor = usePrimaryColor();
  const { isDark } = useTheme();

  // Ensure Tailwind `dark:` variants work inside the dashboard.
  // Dashboard previously isolated theme via data attribute + inline styles,
  // but many dashboard pages rely on Tailwind `dark:*` classes.
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <>
      <ThemeInjector primaryColor={primaryColor} />
      {/* 
        Dashboard theme isolation: Use data-theme attribute instead of relying on Tailwind dark: variants
        which can be affected by next-themes on <html> element.
        We apply explicit background colors based on theme state.
      */}
      <div 
        data-dashboard-theme={isDark ? 'dark' : 'light'}
        className="flex h-screen overflow-hidden"
        style={{ 
          backgroundColor: isDark ? '#020617' : '#f8fafc',
          colorScheme: isDark ? 'dark' : 'light'
        }}
      >
          <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} isDark={isDark} />

          <div 
            className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden"
            style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.3)' : '#f8fafc' }}
          >
            <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isDark={isDark} />

            <main className="p-4 md:p-8">{children}</main>
          </div>
        </div>
      </>
  );
};

const DashboardLayoutWrapper: React.FC<DashboardLayoutWrapperProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <StoreConfigProvider>
          <DashboardContent>{children}</DashboardContent>
        </StoreConfigProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default DashboardLayoutWrapper;

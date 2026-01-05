"use client";

import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { LanguageProvider } from "./components/LanguageContext";
import { StoreConfigProvider, usePrimaryColor } from "./components/StoreConfigContext";
import { ThemeProvider } from "./components/ThemeContext";
import { ThemeInjector } from "@/components/ThemeInjector";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

const DashboardContent: React.FC<DashboardLayoutWrapperProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const primaryColor = usePrimaryColor();

  return (
    <>
      <ThemeInjector primaryColor={primaryColor} />
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
          <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

          <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-900/30">
            <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

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

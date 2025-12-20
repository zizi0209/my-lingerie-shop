"use client";

import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import { LanguageProvider } from "./components/LanguageContext";

interface DashboardLayoutWrapperProps {
  children: React.ReactNode;
}

const DashboardLayoutWrapper: React.FC<DashboardLayoutWrapperProps> = ({
  children,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <LanguageProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-900/30 transition-colors duration-300">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </LanguageProvider>
  );
};

export default DashboardLayoutWrapper;

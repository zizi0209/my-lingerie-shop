"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import SearchManagement from "@/components/dashboard/pages/SearchManagement";

export default function SearchManagementPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <SearchManagement />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Settings from "@/components/dashboard/pages/Settings";

export default function SettingsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Settings />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

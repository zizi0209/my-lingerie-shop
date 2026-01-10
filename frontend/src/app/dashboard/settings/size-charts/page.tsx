"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import SizeChartsManager from "@/components/dashboard/pages/SizeChartsManager";

export default function SizeChartsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <SizeChartsManager />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

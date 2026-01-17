"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import AboutManagement from "@/components/dashboard/pages/AboutManagement";

export default function AboutPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <AboutManagement />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

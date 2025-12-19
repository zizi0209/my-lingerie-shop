"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Tracking from "@/components/dashboard/pages/Tracking";

export default function TrackingPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Tracking />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

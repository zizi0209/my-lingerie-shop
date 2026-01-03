"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Colors from "@/components/dashboard/pages/Colors";

export default function ColorsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Colors />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

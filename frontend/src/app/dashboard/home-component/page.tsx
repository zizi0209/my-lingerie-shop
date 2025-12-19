"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import HomeComponent from "@/components/dashboard/pages/HomeComponent";

export default function HomeComponentPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <HomeComponent />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

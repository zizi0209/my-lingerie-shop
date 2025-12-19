"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import DashboardHome from "@/components/dashboard/pages/DashboardHome";

export default function DashboardPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <DashboardHome />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

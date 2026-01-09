"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import PointRewards from "@/components/dashboard/pages/PointRewards";

export default function RewardsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <PointRewards />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Campaigns from "@/components/dashboard/pages/Campaigns";

export default function CampaignsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Campaigns />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

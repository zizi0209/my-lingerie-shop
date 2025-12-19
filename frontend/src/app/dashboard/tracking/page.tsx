"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Tracking from "@/components/dashboard/pages/Tracking";

export default function TrackingPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Tracking />
      </DashboardLayout>
    </ThemeProvider>
  );
}

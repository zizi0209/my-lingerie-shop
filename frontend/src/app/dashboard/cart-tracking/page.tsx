"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import CartTracking from "@/components/dashboard/pages/CartTracking";

export default function CartTrackingPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <CartTracking />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

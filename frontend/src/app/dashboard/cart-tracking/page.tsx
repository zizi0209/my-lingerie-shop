"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import CartTracking from "@/components/dashboard/pages/CartTracking";

export default function CartTrackingPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <CartTracking />
      </DashboardLayout>
    </ThemeProvider>
  );
}

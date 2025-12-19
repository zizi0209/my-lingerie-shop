"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Orders from "@/components/dashboard/pages/Orders";

export default function OrdersPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Orders />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

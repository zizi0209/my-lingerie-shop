"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Customers from "@/components/dashboard/pages/Customers";

export default function CustomersPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Customers />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Products from "@/components/dashboard/pages/Products";

export default function ProductsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Products />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

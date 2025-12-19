"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Products from "@/components/dashboard/pages/Products";

export default function ProductsPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Products />
      </DashboardLayout>
    </ThemeProvider>
  );
}

"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Customers from "@/components/dashboard/pages/Customers";

export default function CustomersPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Customers />
      </DashboardLayout>
    </ThemeProvider>
  );
}

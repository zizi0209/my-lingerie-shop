"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Orders from "@/components/dashboard/pages/Orders";

export default function OrdersPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Orders />
      </DashboardLayout>
    </ThemeProvider>
  );
}

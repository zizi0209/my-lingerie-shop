"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import DashboardHome from "@/components/dashboard/pages/DashboardHome";

export default function DashboardPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <DashboardHome />
      </DashboardLayout>
    </ThemeProvider>
  );
}

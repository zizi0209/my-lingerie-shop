"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import HomeComponent from "@/components/dashboard/pages/HomeComponent";

export default function HomeComponentPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <HomeComponent />
      </DashboardLayout>
    </ThemeProvider>
  );
}

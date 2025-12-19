"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Settings from "@/components/dashboard/pages/Settings";

export default function SettingsPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Settings />
      </DashboardLayout>
    </ThemeProvider>
  );
}

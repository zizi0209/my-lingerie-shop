"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Roles from "@/components/dashboard/pages/Roles";

export default function RolesPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Roles />
      </DashboardLayout>
    </ThemeProvider>
  );
}

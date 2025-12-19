"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Roles from "@/components/dashboard/pages/Roles";

export default function RolesPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Roles />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

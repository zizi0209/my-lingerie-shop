"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Users from "@/components/dashboard/pages/Users";

export default function UsersPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Users />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

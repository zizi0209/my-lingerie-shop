"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Profile from "@/components/dashboard/pages/Profile";

export default function ProfilePage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Profile />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

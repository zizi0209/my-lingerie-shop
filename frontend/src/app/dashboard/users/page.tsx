"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Users from "@/components/dashboard/pages/Users";

export default function UsersPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Users />
      </DashboardLayout>
    </ThemeProvider>
  );
}

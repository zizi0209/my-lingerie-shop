"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Posts from "@/components/dashboard/pages/Posts";

export default function PostsPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Posts />
      </DashboardLayout>
    </ThemeProvider>
  );
}

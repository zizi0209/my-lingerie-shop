"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Posts from "@/components/dashboard/pages/Posts";

export default function PostsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Posts />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

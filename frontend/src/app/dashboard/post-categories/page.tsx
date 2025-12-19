"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import PostCategories from "@/components/dashboard/pages/PostCategories";

export default function PostCategoriesPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <PostCategories />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

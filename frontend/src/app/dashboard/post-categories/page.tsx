"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import PostCategories from "@/components/dashboard/pages/PostCategories";

export default function PostCategoriesPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <PostCategories />
      </DashboardLayout>
    </ThemeProvider>
  );
}

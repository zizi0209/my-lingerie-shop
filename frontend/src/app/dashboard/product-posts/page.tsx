"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import ProductPosts from "@/components/dashboard/pages/ProductPosts";

export default function ProductPostsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <ProductPosts />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

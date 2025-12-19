"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Categories from "@/components/dashboard/pages/Categories";

export default function CategoriesPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Categories />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

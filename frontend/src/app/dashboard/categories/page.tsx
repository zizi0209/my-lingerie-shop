"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayout from "@/components/dashboard/components/Layout";
import Categories from "@/components/dashboard/pages/Categories";

export default function CategoriesPage() {
  return (
    <ThemeProvider>
      <DashboardLayout>
        <Categories />
      </DashboardLayout>
    </ThemeProvider>
  );
}

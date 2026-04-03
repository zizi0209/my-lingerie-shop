"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import SearchResults from "@/components/dashboard/pages/SearchResults";

export default function SearchResultsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <SearchResults />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

"use client";

import React from "react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import Coupons from "@/components/dashboard/pages/Coupons";

export default function CouponsPage() {
  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <Coupons />
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

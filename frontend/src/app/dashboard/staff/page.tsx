 "use client";
 
 import React from "react";
 import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
 import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
 import Staff from "@/components/dashboard/pages/Staff";
 
 export default function StaffPage() {
   return (
     <ThemeProvider>
       <DashboardLayoutWrapper>
         <Staff />
       </DashboardLayoutWrapper>
     </ThemeProvider>
   );
 }

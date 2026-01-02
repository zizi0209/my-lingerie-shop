"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>
        {children}
        <Toaster position="top-right" expand={false} richColors />
      </LanguageProvider>
    </ThemeProvider>
  );
}

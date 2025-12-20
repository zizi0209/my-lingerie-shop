"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LanguageProvider>{children}</LanguageProvider>
    </ThemeProvider>
  );
}

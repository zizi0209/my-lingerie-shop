"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { Toaster } from "sonner";
import { VirtualTryOnProvider } from "@/context/VirtualTryOnContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem
      storageKey="frontend-theme"
    >
      <SessionProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <LanguageProvider>
                <VirtualTryOnProvider>
                  {children}
                  <Toaster position="top-right" expand={false} richColors />
                </VirtualTryOnProvider>
              </LanguageProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

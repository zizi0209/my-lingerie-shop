"use client";

import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { usePathname } from "next/navigation";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <html lang="vi">
      <body
        className={`${inter.variable} ${playfair.variable} font-sans bg-gray-50 text-gray-900`}
      >
        {!isDashboard && <Header />}
        <main className="min-h-screen">{children}</main>
        {!isDashboard && <Footer />}
      </body>
    </html>
  );
}

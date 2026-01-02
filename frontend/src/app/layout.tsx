import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import "@/styles/theme.css";
import RootLayoutClient from "@/components/layout/RootLayoutClient";
import { Providers } from "@/components/layout/Providers";
import { getServerTheme, generateThemeCSS } from "@/lib/getServerTheme";
import { ThemeScript } from "@/components/ThemeScript";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Lingerie Shop",
  description: "Premium lingerie store",
};

// Force dynamic rendering - no static cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch theme on server - no client-side delay!
  const theme = await getServerTheme();
  const themeCSS = generateThemeCSS(theme.primary_color);

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Inject CSS variables directly from server - with !important to ensure priority */}
        <style
          id="theme-vars"
          dangerouslySetInnerHTML={{
            __html: `:root { ${themeCSS} }`,
          }}
        />
        {/* Script to store theme in window for client-side access */}
        <ThemeScript primaryColor={theme.primary_color} />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} font-sans bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors`}
      >
        <Providers>
          <RootLayoutClient>{children}</RootLayoutClient>
        </Providers>
      </body>
    </html>
  );
}

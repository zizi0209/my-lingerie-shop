import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Lingerie Shop",
  description: "Admin Dashboard",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

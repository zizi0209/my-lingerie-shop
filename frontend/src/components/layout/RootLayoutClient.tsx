"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import WelcomeOffer from "@/components/WelcomeOffer";
import { ChatWidget } from "@/components/ai-consultant";

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <>
      {!isDashboard && <Header />}
      <main className="min-h-screen">{children}</main>
      {!isDashboard && <Footer />}
      {!isDashboard && <WelcomeOffer />}
      {!isDashboard && <ChatWidget />}
    </>
  );
}

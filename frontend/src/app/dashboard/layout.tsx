'use client';

import { DashboardGuard } from '@/components/auth/DashboardGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">{children}</div>
    </DashboardGuard>
  );
}

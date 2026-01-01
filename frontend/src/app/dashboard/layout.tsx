'use client';

import { useAdminGuard } from '@/hooks/useAdminGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isChecking } = useAdminGuard();

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Đang xác thực...</p>
        </div>
      </div>
    );
  }

  // Auth successful - render dashboard
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900">{children}</div>;
}

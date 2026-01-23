"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ReAuthModal } from "./ReAuthModal";
import { api } from "@/lib/api";

interface DashboardAuthResponse {
  success: boolean;
  data: {
    isAdmin: boolean;
    isDashboardAuthenticated: boolean;
  };
}

interface DashboardGuardProps {
  children: React.ReactNode;
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

function isAdminRole(roleName: string | null | undefined): boolean {
  if (!roleName) return false;
  return ADMIN_ROLES.includes(roleName.toUpperCase());
}

export function DashboardGuard({ children }: DashboardGuardProps) {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [isDashboardAuth, setIsDashboardAuth] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Refresh dashboard auth every 30 minutes to keep session alive
  useEffect(() => {
    if (!isDashboardAuth) return;

    const refreshInterval = setInterval(() => {
      // Silent refresh - just ping the check endpoint to renew cookie
      if (token) {
        api.setToken(token);
      }
      api.get("/auth/check-dashboard-auth").catch((error) => {
        // Chỉ xử lý nếu là lỗi session
        const isSessionError = error instanceof Error && error.message === 'SESSION_EXPIRED';
        if (isSessionError) {
          setIsDashboardAuth(false);
          setShowReAuthModal(true);
        }
      });
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(refreshInterval);
  }, [isDashboardAuth, token]);

  const checkDashboardAuth = useCallback(async () => {
    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    // Ensure token is set in localStorage before making API call
    if (token) {
      api.setToken(token);
    }

    try {
      const response = await api.get<DashboardAuthResponse>(
        "/auth/check-dashboard-auth"
      );

      if (response.success && response.data) {
        if (!response.data.isAdmin) {
          // Không phải admin, redirect về trang chủ
          router.replace("/");
          return;
        }

        if (response.data.isDashboardAuthenticated) {
          setIsDashboardAuth(true);
        } else {
          setShowReAuthModal(true);
        }
      }
    } catch (error) {
      // Chỉ hiển thị modal nếu là lỗi SESSION_EXPIRED
      const isSessionError = error instanceof Error && error.message === 'SESSION_EXPIRED';
      if (isSessionError) {
        setShowReAuthModal(true);
      } else {
        // Lỗi khác, log và redirect
        console.error('Dashboard auth check failed:', error);
        router.replace("/");
      }
    } finally {
      setIsChecking(false);
    }
  }, [isAuthenticated, token, router]);

  useEffect(() => {
    if (!authLoading) {
      // Kiểm tra đăng nhập
      if (!isAuthenticated) {
        router.replace("/login-register");
        return;
      }

      // Kiểm tra quyền admin phía client trước
      if (!isAdminRole(user?.role?.name)) {
        router.replace("/");
        return;
      }

      // Kiểm tra dashboard auth từ server
      checkDashboardAuth();
    }
  }, [authLoading, isAuthenticated, user, router, checkDashboardAuth]);

  const handleReAuthSuccess = () => {
    setShowReAuthModal(false);
    setIsDashboardAuth(true);
  };

  const handleReAuthCancel = () => {
    setShowReAuthModal(false);
    router.replace("/");
  };

  // Loading state
  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"
            role="status"
            aria-label="Đang tải"
          />
          <p className="mt-4 text-gray-500 dark:text-gray-400">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập hoặc không phải admin
  if (!isAuthenticated || !isAdminRole(user?.role?.name)) {
    return null;
  }

  // Hiển thị modal xác thực
  if (showReAuthModal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <ReAuthModal
          isOpen={true}
          onSuccess={handleReAuthSuccess}
          onCancel={handleReAuthCancel}
        />
      </div>
    );
  }

  // Chưa xác thực dashboard
  if (!isDashboardAuth) {
    return null;
  }

  // Đã xác thực, render children
  return <>{children}</>;
}

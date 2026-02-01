"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

function isAdminRole(user: { role?: { name: string } | null; roleName?: string } | null | undefined): boolean {
  if (!user) return false;
  
  // Check role.name first (from AuthContext user)
  const roleName = user.role?.name || (user as { roleName?: string }).roleName;
  if (!roleName) return false;
  
  return ADMIN_ROLES.includes(roleName.toUpperCase());
}

export function DashboardGuard({ children }: DashboardGuardProps) {
  const router = useRouter();
  const { user: authUser, token: authToken, isAuthenticated: authContextAuthenticated, isLoading: authLoading } = useAuth();
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [isDashboardAuth, setIsDashboardAuth] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  // Use ref to track if auth check is in progress to prevent duplicate API calls
  const isCheckingRef = useRef(false);

  // Check both NextAuth session AND localStorage token (for admin/login page)
  const localStorageToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const isAuthenticated = authContextAuthenticated || !!localStorageToken;
  const token = authToken || localStorageToken;
  
  // Get user from AuthContext or decode from token and normalize structure
  const getUserFromLocalStorage = useCallback(() => {
    if (!localStorageToken) return null;
    const decoded = api.getUserFromToken();
    if (!decoded) return null;
    // Normalize to match AuthContext user structure
    return {
      ...decoded,
      role: decoded.roleName ? { name: decoded.roleName } : null,
    };
  }, [localStorageToken]);
  
  const user = authUser || getUserFromLocalStorage();

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
    // Skip if already authenticated
    if (isDashboardAuth) {
      setIsChecking(false);
      return;
    }

    // Prevent concurrent API calls
    if (isCheckingRef.current) {
      return;
    }

    if (!isAuthenticated) {
      setIsChecking(false);
      return;
    }

    // Ensure token is set in localStorage before making API call
    if (token) {
      api.setToken(token);
    }

    // Check localStorage first for dashboard auth (cross-site cookie workaround)
    const dashboardAuthExpiry = localStorage.getItem('dashboardAuthExpiry');
    if (dashboardAuthExpiry) {
      const expiry = parseInt(dashboardAuthExpiry, 10);
      if (Date.now() < expiry) {
        setIsDashboardAuth(true);
        setIsChecking(false);
        return;
      }
      // Expired - remove it
      localStorage.removeItem('dashboardAuthExpiry');
    }

    isCheckingRef.current = true;

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
          // Save to localStorage as fallback
          const expiryTime = Date.now() + (4 * 60 * 60 * 1000);
          localStorage.setItem('dashboardAuthExpiry', expiryTime.toString());
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
      isCheckingRef.current = false;
    }
  }, [isAuthenticated, token, router, isDashboardAuth]);

  useEffect(() => {
    if (!authLoading) {
      // Kiểm tra đăng nhập
      if (!isAuthenticated) {
        // Clear dashboard auth on logout
        localStorage.removeItem('dashboardAuthExpiry');
        setIsDashboardAuth(false);
        router.replace("/admin/login");
        return;
      }

      // Kiểm tra quyền admin phía client trước
      if (!isAdminRole(user)) {
        router.replace("/");
        return;
      }

      // Kiểm tra dashboard auth từ server
      checkDashboardAuth();
    }
  }, [authLoading, isAuthenticated, user, router, checkDashboardAuth]);

  const handleReAuthSuccess = () => {
    setShowReAuthModal(false);
    // Save to localStorage as fallback for cross-site cookie issues
    const expiryTime = Date.now() + (4 * 60 * 60 * 1000); // 4 hours
    localStorage.setItem('dashboardAuthExpiry', expiryTime.toString());
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
  if (!isAuthenticated || !isAdminRole(user)) {
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

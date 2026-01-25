"use client";

import { useState } from "react";
import { Lock, X, Loader2, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";

interface ReAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface VerifyResponse {
  success: boolean;
  message?: string;
  data?: {
    expiresIn: number;
  };
}

export function ReAuthModal({ isOpen, onSuccess, onCancel }: ReAuthModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<VerifyResponse>("/auth/verify-password", {
        password,
      });

      if (response.success) {
        setPassword("");
        onSuccess();
      } else {
        setError("Xác thực thất bại");
      }
    } catch (err) {
      // Xử lý error message
      if (err instanceof Error) {
        if (err.message === 'SESSION_EXPIRED') {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError("Mật khẩu không đúng");
        } else if (err.message.includes('không thể đăng nhập qua mạng xã hội') || err.message.includes('social')) {
          // Social login admin without password setup
          setError("⚠️ Tài khoản của bạn cần thiết lập mật khẩu trước. Vui lòng kiểm tra email để nhận link thiết lập mật khẩu.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Lỗi không xác định");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setPassword("");
    setError(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        {/* Close button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Xác thực bảo mật
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Vui lòng nhập mật khẩu để truy cập Dashboard quản trị
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="reauth-password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="reauth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nhập mật khẩu của bạn"
                autoComplete="current-password"
                autoFocus
                disabled={isLoading}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? "Đang xác thực..." : "Xác nhận"}
            </button>
          </div>
        </form>

        {/* Footer note */}
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-4">
          Phiên làm việc Dashboard sẽ hết hạn sau 30 phút
        </p>
      </div>
    </div>
  );
}

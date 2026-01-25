"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, Shield, Lock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

export default function SetAdminPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    email?: string;
    role?: string;
  } | null>(null);

  const [requirements, setRequirements] = useState<PasswordRequirement[]>([
    { label: "Tối thiểu 12 ký tự", test: (p) => p.length >= 12, met: false },
    { label: "Ít nhất 1 chữ hoa (A-Z)", test: (p) => /[A-Z]/.test(p), met: false },
    { label: "Ít nhất 1 chữ thường (a-z)", test: (p) => /[a-z]/.test(p), met: false },
    { label: "Ít nhất 1 số (0-9)", test: (p) => /\d/.test(p), met: false },
    { label: "Ít nhất 1 ký tự đặc biệt (@$!%*?&)", test: (p) => /[@$!%*?&]/.test(p), met: false },
  ]);

  // Update requirements as user types
  useEffect(() => {
    setRequirements((prev) =>
      prev.map((req) => ({
        ...req,
        met: req.test(password),
      }))
    );
  }, [password]);

  const allRequirementsMet = requirements.every((req) => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!allRequirementsMet) {
      setError("Mật khẩu chưa đáp ứng đủ yêu cầu bảo mật");
      return;
    }

    if (!passwordsMatch) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post<{
        success: boolean;
        message: string;
        data: {
          email: string;
          role: string;
          canAccessDashboard: boolean;
        };
      }>(
        "/auth/set-admin-password",
        {
          token,
          password,
          confirmPassword,
        },
        false // No auth required for this endpoint
      );

      if (response.success) {
        setSuccessData(response.data);
        setIsSuccess(true);

        // Redirect to admin login after 3 seconds
        setTimeout(() => {
          router.push("/admin/login");
        }, 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 flex items-center justify-center px-4 py-12 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <Link
            href="/"
            aria-label="Về trang chủ Lingerie Shop"
            className="text-2xl md:text-3xl font-serif font-light text-black dark:text-white inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded px-2"
          >
            LINGERIE
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow-xl border border-purple-100 dark:border-purple-900/30 transition-colors">
          {/* Success State */}
          {isSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">
                Thiết lập thành công! 🎉
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Mật khẩu của bạn đã được thiết lập.
              </p>
              {successData && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6 text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Email:</strong> {successData.email}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Vai trò:</strong> {successData.role}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Đang chuyển đến trang đăng nhập...
              </p>
              <Link
                href="/admin/login"
                className="ck-button inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              >
                <Shield className="w-5 h-5" />
                Đăng nhập Admin Dashboard
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h2 className="text-2xl font-serif font-light mb-2 text-gray-900 dark:text-white">
                  Thiết lập mật khẩu Admin
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Tạo mật khẩu an toàn để truy cập Admin Dashboard
                </p>
              </div>

              {/* Security Notice */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-medium mb-1">Bảo mật cấp Admin</p>
                    <p className="text-xs">
                      Mật khẩu này độc lập với tài khoản Google/Github của bạn và chỉ dùng cho Dashboard.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Password Input */}
                <div>
                  <label
                    htmlFor="admin-password"
                    className="block text-sm font-medium mb-2 text-gray-900 dark:text-white"
                  >
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu (tối thiểu 12 ký tự)"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] transition-colors"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Eye className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Yêu cầu mật khẩu:
                  </p>
                  {requirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          req.met
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        {req.met && (
                          <CheckCircle className="w-3 h-3 text-green-600 dark:text-green-500" />
                        )}
                      </div>
                      <span
                        className={
                          req.met
                            ? "text-green-600 dark:text-green-500"
                            : "text-gray-600 dark:text-gray-400"
                        }
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Confirm Password Input */}
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium mb-2 text-gray-900 dark:text-white"
                  >
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] transition-colors ${
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? "border-green-300 dark:border-green-700"
                            : "border-red-300 dark:border-red-700"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Eye className="w-5 h-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p
                      className={`text-xs mt-1 ${
                        passwordsMatch
                          ? "text-green-600 dark:text-green-500"
                          : "text-red-600 dark:text-red-500"
                      }`}
                    >
                      {passwordsMatch ? "✓ Mật khẩu khớp" : "✗ Mật khẩu không khớp"}
                    </p>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                  className="ck-button w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang thiết lập...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Thiết lập mật khẩu
                    </>
                  )}
                </button>
              </form>

              {/* Security Tips */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
                  💡 Mẹo bảo mật:
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-500 space-y-1 list-disc list-inside">
                  <li>Sử dụng mật khẩu khác biệt với tài khoản Google/Github</li>
                  <li>Lưu mật khẩu vào password manager (1Password, Bitwarden)</li>
                  <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Help */}
        {!isSuccess && (
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Link hết hạn hoặc gặp vấn đề?{" "}
              <Link
                href="/contact"
                className="text-purple-600 dark:text-purple-400 hover:underline min-h-[44px] inline-flex items-center px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded"
              >
                Liên hệ Super Admin
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

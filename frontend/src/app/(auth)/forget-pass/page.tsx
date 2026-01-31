"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function ForgetPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState(""); // Token from verify OTP
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage("Vui lòng nhập email");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.success) {
        setStep(2);
        setMessage(data.message);
      } else {
        setMessage(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch {
      setIsLoading(false);
      setMessage("Không thể kết nối đến server. Vui lòng thử lại.");
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setMessage("Vui lòng nhập mã OTP 6 số");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.success) {
        setToken(data.token); // Store token for reset password
        setStep(3);
        setMessage("");
      } else {
        setMessage(data.error || "Mã OTP không hợp lệ");
      }
    } catch {
      setIsLoading(false);
      setMessage("Không thể kết nối đến server. Vui lòng thử lại.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setMessage("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.success) {
        setStep(4);
        setMessage(data.message);
      } else {
        setMessage(data.error || "Có lỗi xảy ra. Vui lòng thử lại.");
      }
    } catch {
      setIsLoading(false);
      setMessage("Không thể kết nối đến server. Vui lòng thử lại.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <Link 
            href="/" 
            aria-label="Về trang chủ Lingerie Shop"
            className="text-2xl md:text-3xl font-serif font-light text-black dark:text-white inline-block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-2"
          >
            LINGERIE
          </Link>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow-sm transition-colors">
          {/* Header */}
          <div className="text-center mb-6">
            {step < 4 && (
              <>
                <h2 className="text-2xl font-serif font-light mb-2 text-gray-900 dark:text-white">Quên mật khẩu?</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {step === 1 && "Nhập email để nhận mã OTP"}
                  {step === 2 && "Nhập mã OTP đã được gửi đến email của bạn"}
                  {step === 3 && "Đặt lại mật khẩu mới"}
                </p>
              </>
            )}
          </div>

          {/* Success Message */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-xl font-medium mb-2 text-gray-900 dark:text-white">Thành công!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
              <Link
                href="/login-register"
                className="ck-button inline-flex items-center justify-center gap-2 w-full bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label htmlFor="forget-email" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="forget-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 min-h-[44px] transition-colors"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("gửi") ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="ck-button w-full flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
              </button>

              <div className="text-center">
                <Link
                  href="/login-register"
                  className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition min-h-[44px] px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label htmlFor="otp-input" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Mã OTP</label>
                <input
                  id="otp-input"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập 6 số OTP"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl tracking-widest min-h-[44px] transition-colors"
                  maxLength={6}
                  required
                />
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("gửi") ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="ck-button w-full flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang xác nhận..." : "Xác nhận"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Thay đổi email
                </button>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-black dark:text-white hover:underline transition min-h-[44px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Gửi lại OTP
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] transition-colors"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] transition-colors"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("thành công") ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="ck-button w-full flex items-center justify-center gap-2 bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition min-h-[44px] px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  Quay lại
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Help */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Cần trợ giúp?{" "}
            <Link href="/contact" className="text-black dark:text-white hover:underline min-h-[44px] inline-flex items-center px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded">
              Liên hệ chúng tôi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
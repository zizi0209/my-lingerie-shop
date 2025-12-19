"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function ForgetPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
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

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
      setMessage("Mã OTP đã được gửi đến email của bạn");
    }, 1500);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setMessage("Vui lòng nhập mã OTP 6 số");
      return;
    }

    setIsLoading(true);
    setMessage("");

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (otp === "123456") { // Mock OTP
        setStep(3);
      } else {
        setMessage("Mã OTP không đúng. Vui lòng thử lại");
      }
    }, 1000);
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

    if (newPassword.length < 6) {
      setMessage("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    setIsLoading(true);
    setMessage("");

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setStep(4);
      setMessage("Mật khẩu đã được đặt lại thành công");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8">
          <div className="text-center">
            <h1 className="text-2xl font-serif">Lingerie Shop</h1>
            <p className="text-sm text-gray-500">Vẻ đẹp từ sự tự tin</p>
          </div>
        </Link>

        {/* Form Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            {step < 4 && (
              <>
                <h2 className="text-2xl font-serif font-light mb-2">Quên mật khẩu?</h2>
                <p className="text-gray-600 text-sm">
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
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-medium mb-2">Thành công!</h3>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/login-register"
                className="ck-button inline-flex items-center justify-center gap-2 w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    required
                  />
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("gửi") ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="ck-button w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
              </button>

              <div className="text-center">
                <Link
                  href="/login-register"
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition"
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
                <label className="block text-sm font-medium mb-2">Mã OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Nhập 6 số OTP"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Mã OTP: 123456 (để test)
                </p>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("gửi") ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="ck-button w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang xác nhận..." : "Xác nhận"}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-gray-600 hover:text-black transition"
                >
                  Thay đổi email
                </button>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  className="text-rose-600 hover:text-rose-700 transition"
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
                <label className="block text-sm font-medium mb-2">Mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("thành công") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="ck-button w-full flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-gray-600 hover:text-black transition"
                >
                  Quay lại
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Help */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Cần trợ giúp?{" "}
            <Link href="/contact" className="text-rose-600 hover:text-rose-700">
              Liên hệ chúng tôi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Check } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginRegisterPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [checking, setChecking] = useState(true);

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });

  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const response = await api.get<{ success: boolean }>('/users/profile');
          if (response.success) {
            router.replace('/');
            return;
          }
        } catch {
          api.removeToken();
        }
      }
      setChecking(false);
    };
    checkAuth();
  }, [router]);

  // Show loading while checking auth
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black dark:border-white border-t-transparent" role="status" aria-label="Đang tải"></div>
      </div>
    );
  }

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login:", loginForm);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Register:", registerForm);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-md mx-auto">
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

          {/* Tab Switcher */}
          <div className="flex mb-6 md:mb-8 bg-white dark:bg-gray-800 rounded-lg p-1 transition-colors" role="tablist" aria-label="Chọn hình thức đăng nhập">
            <button
              role="tab"
              aria-selected={isLogin}
              aria-controls="login-panel"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-md transition-all text-sm md:text-base min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                isLogin
                  ? "bg-black text-white dark:bg-white dark:text-black font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Đăng nhập
            </button>
            <button
              role="tab"
              aria-selected={!isLogin}
              aria-controls="register-panel"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-md transition-all text-sm md:text-base min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
                !isLogin
                  ? "bg-black text-white dark:bg-white dark:text-black font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
              }`}
            >
              Đăng ký
            </button>
          </div>

          {/* Login Form */}
          {isLogin ? (
            <div 
              id="login-panel"
              role="tabpanel"
              aria-labelledby="login-tab"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow-sm transition-colors"
            >
              <h2 className="text-xl md:text-2xl font-serif font-light mb-4 md:mb-6 text-gray-900 dark:text-white">
                Chào mừng quay trở lại
              </h2>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="login-email"
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] transition-colors"
                      placeholder="email@example.com"
                      autoComplete="email"
                      required
                    />
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] transition-colors"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-3 text-gray-400 hover:text-black dark:hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-black border-gray-300 rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label="Ghi nhớ đăng nhập"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Ghi nhớ đăng nhập</span>
                  </label>
                  <Link 
                    href="/forget-pass" 
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white underline min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-2"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="ck-button w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Đăng nhập
                </button>
              </form>

              {/* Social Login */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Hoặc đăng nhập với
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    aria-label="Đăng nhập bằng Google"
                    className="flex justify-center items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm md:text-base">Google</span>
                  </button>
                  <button 
                    aria-label="Đăng nhập bằng Facebook"
                    className="flex justify-center items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="text-sm md:text-base">Facebook</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Register Form */
            <div 
              id="register-panel"
              role="tabpanel"
              aria-labelledby="register-tab"
              className="bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow-sm transition-colors"
            >
              <h2 className="text-xl md:text-2xl font-serif font-light mb-4 md:mb-6 text-gray-900 dark:text-white">
                Tạo tài khoản mới
              </h2>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="register-firstname" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Họ
                    </label>
                    <div className="relative">
                      <input
                        id="register-firstname"
                        type="text"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] transition-colors"
                        placeholder="Nguyễn"
                        autoComplete="given-name"
                        required
                      />
                      <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="register-lastname" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                      Tên
                    </label>
                    <input
                      id="register-lastname"
                      type="text"
                      value={registerForm.lastName}
                      onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] transition-colors"
                      placeholder="Văn A"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="register-email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] transition-colors"
                      placeholder="email@example.com"
                      autoComplete="email"
                      required
                    />
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] transition-colors"
                      placeholder="Tối thiểu 8 ký tự"
                      autoComplete="new-password"
                      required
                    />
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      className="absolute right-3 top-3 text-gray-400 hover:text-black dark:hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="register-confirm-password" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 min-h-[44px] transition-colors"
                      placeholder="Nhập lại mật khẩu"
                      autoComplete="new-password"
                      required
                    />
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                      className="absolute right-3 top-3 text-gray-400 hover:text-black dark:hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden="true" /> : <Eye className="w-5 h-5" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 text-black border-gray-300 rounded focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 mt-0.5"
                    required
                  />
                  <label htmlFor="agree-terms" className="text-sm text-gray-600 dark:text-gray-300">
                    Tôi đồng ý với{' '}
                    <Link 
                      href="/dieu-khoan" 
                      className="text-black dark:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                    >
                      điều khoản sử dụng
                    </Link>{' '}
                    và{' '}
                    <Link 
                      href="/chinh-sach" 
                      className="text-black dark:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                    >
                      chính sách bảo mật
                    </Link>
                  </label>
                </div>

                <button
                  type="submit"
                  className="ck-button w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Đăng ký
                </button>
              </form>

              {/* Benefits */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg transition-colors">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-gray-900 dark:text-white text-sm md:text-base">
                  <Check className="w-4 h-4 text-green-600 shrink-0" aria-hidden="true" />
                  Lợi ích khi đăng ký thành viên
                </h4>
                <ul className="text-xs md:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Giảm 10% cho đơn hàng đầu tiên</li>
                  <li>• Tích điểm đổi quà giá trị</li>
                  <li>• Nhận thông tin khuyến mãi sớm nhất</li>
                  <li>• Đặc quyền cho thành viên VIP</li>
                </ul>
              </div>
            </div>
          )}

          {/* Back to Home */}
          <div className="text-center mt-6 md:mt-8">
            <Link 
              href="/" 
              className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition text-sm inline-flex items-center gap-1 min-h-[44px] px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              <span aria-hidden="true">←</span> Quay lại trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

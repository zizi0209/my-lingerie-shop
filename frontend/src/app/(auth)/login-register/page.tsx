"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock, User, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

// CSS để ẩn icon toggle password mặc định của browser
const passwordInputStyles = `
  input[type="password"]::-ms-reveal,
  input[type="password"]::-ms-clear {
    display: none;
  }
  input[type="password"]::-webkit-credentials-auto-fill-button,
  input[type="password"]::-webkit-contacts-auto-fill-button {
    visibility: hidden;
    pointer-events: none;
    position: absolute;
    right: 0;
  }
`;

export default function LoginRegisterPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Redirect nếu đã đăng nhập
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black dark:border-white border-t-transparent" role="status" aria-label="Đang tải"></div>
      </div>
    );
  }

  // Đã đăng nhập thì không render gì
  if (isAuthenticated) {
    return null;
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login({
      email: loginForm.email,
      password: loginForm.password,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.replace('/');
    } else {
      setError(result.error || 'Đăng nhập thất bại');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    // Validate password length
    if (registerForm.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    setIsSubmitting(true);

    const fullName = `${registerForm.firstName} ${registerForm.lastName}`.trim();
    const result = await register({
      email: registerForm.email,
      password: registerForm.password,
      name: fullName || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      router.replace('/');
    } else {
      setError(result.error || 'Đăng ký thất bại');
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: passwordInputStyles }} />
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

              {error && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

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
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
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
                  disabled={isSubmitting}
                  className="ck-button w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
              </form>

            <SocialLoginButtons />
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

              {error && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

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
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
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
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
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
                  disabled={isSubmitting}
                  className="ck-button w-full bg-black text-white dark:bg-white dark:text-black py-3 rounded-lg hover:opacity-90 transition font-medium min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Đang xử lý...' : 'Đăng ký'}
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
    </>
  );
}

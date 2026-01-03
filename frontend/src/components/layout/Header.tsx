// frontend/src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, Search, Menu, LogOut, Package, Settings, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { store_name, store_logo } = useStore();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 dark:bg-gray-900/80 dark:border-gray-800 backdrop-blur-md transition-colors">
      <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
        {/* 1. Mobile Menu Button + Logo Left Section */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* 2. Logo - Dynamic from settings */}
          <Link href="/" className="flex items-center gap-2">
            {store_logo ? (
              <Image 
                src={store_logo} 
                alt={store_name} 
                width={120} 
                height={40} 
                className="h-8 sm:h-10 w-auto object-contain"
              />
            ) : (
              <span className="text-xl sm:text-2xl font-bold font-serif text-primary-500">
                {store_name}
              </span>
            )}
          </Link>
        </div>

        {/* 3. Navigation - Center - Ẩn ở mobile, Hiện ở Desktop */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-xs xl:text-sm font-medium text-gray-600 dark:text-gray-300 flex-1 justify-center">
          <Link href="/" className="hover:text-primary-500 dark:hover:text-primary-400 transition">
            TRANG CHỦ
          </Link>
          <Link href="/san-pham" className="hover:text-primary-500 dark:hover:text-primary-400 transition">
            SẢN PHẨM
          </Link>
          <Link href="/bai-viet" className="hover:text-primary-500 dark:hover:text-primary-400 transition">
            GÓC TƯ VẤN
          </Link>
          <Link href="/order" className="hover:text-primary-500 dark:hover:text-primary-400 transition">
            TRA CỨU ĐƠN
          </Link>
        </nav>

        {/* 4. Icons (Search, User, Cart, Theme, Language) - Right Section */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* User Menu */}
          {isLoading ? (
            <div className="p-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          ) : isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center overflow-hidden">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Avatar"
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                  )}
                </div>
                <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {user.name || "Chưa cập nhật tên"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <User className="w-4 h-4" />
                      <span>Tài khoản của tôi</span>
                    </Link>
                    <Link
                      href="/profile?tab=orders"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    >
                      <Package className="w-4 h-4" />
                      <span>Đơn hàng của tôi</span>
                    </Link>
                    {user.role?.name && ["ADMIN", "SUPER_ADMIN"].includes(user.role.name.toUpperCase()) && (
                      <Link
                        href="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Quản trị</span>
                      </Link>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login-register"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            </Link>
          )}

          <Link
            href="/cart"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition relative"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-primary-500 text-white text-[10px] flex items-center justify-center rounded-full">
              3
            </span>
          </Link>
          
          {/* Theme Toggle - Hidden on small mobile */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          
          {/* Language Switcher - Responsive */}
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-white dark:bg-gray-900 dark:border-gray-800 p-4 space-y-4">
          {/* Mobile User Info */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                {user.avatar ? (
                  <Image src={user.avatar} alt="Avatar" width={40} height={40} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">{user.name || "Chưa cập nhật"}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <Link
              href="/login-register"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-3 py-2 text-primary font-medium"
            >
              <User className="w-5 h-5" />
              <span>Đăng nhập / Đăng ký</span>
            </Link>
          )}

          {/* Navigation Links */}
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition">
            Trang chủ
          </Link>
          <Link href="/san-pham" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition">
            Sản phẩm
          </Link>
          <Link href="/bai-viet" onClick={() => setIsMenuOpen(false)} className="block py-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition">
            Góc tư vấn
          </Link>

          {/* User Menu Items (if logged in) */}
          {isAuthenticated && user && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
              <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-2 text-gray-600 dark:text-gray-300 hover:text-primary transition">
                <User className="w-4 h-4" />
                <span>Tài khoản của tôi</span>
              </Link>
              <Link href="/profile?tab=orders" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-2 text-gray-600 dark:text-gray-300 hover:text-primary transition">
                <Package className="w-4 h-4" />
                <span>Đơn hàng của tôi</span>
              </Link>
              {user.role?.name && ["ADMIN", "SUPER_ADMIN"].includes(user.role.name.toUpperCase()) && (
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-2 text-gray-600 dark:text-gray-300 hover:text-primary transition">
                  <Settings className="w-4 h-4" />
                  <span>Quản trị</span>
                </Link>
              )}
              <button
                onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-3 py-2 text-red-600 dark:text-red-400 hover:text-red-700 transition w-full"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
          
          {/* Mobile Theme & Language Toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Giao diện</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Ngôn ngữ</span>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

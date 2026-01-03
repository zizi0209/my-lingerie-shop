// frontend/src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, User, Search, Menu, LogOut, Package, Settings, Heart, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { store_name, store_logo, primary_color } = useStore();
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

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-950 transition-colors">
      {/* Main Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center">
          {/* Left: Menu Button (Mobile) */}
          <div className="flex items-center lg:hidden">
            <button
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menu"
            >
              <Menu className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex-1 flex justify-center lg:justify-start lg:flex-none">
            <Link href="/" className="flex items-center">
              {store_logo ? (
                <Image 
                  src={store_logo} 
                  alt={store_name} 
                  width={140} 
                  height={40} 
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              ) : (
                <span 
                className="text-xl sm:text-2xl font-bold tracking-tight"
                style={{ color: primary_color }}
              >
                {store_name}
              </span>
              )}
            </Link>
          </div>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-8 text-sm font-medium">
            {[
              { href: "/", label: "TRANG CHỦ" },
              { href: "/san-pham", label: "SẢN PHẨM" },
              { href: "/bai-viet", label: "BÀI VIẾT" },
              { href: "/about", label: "GIỚI THIỆU" },
              { href: "/contact", label: "LIÊN HỆ" },
            ].map((item) => (
              <Link 
                key={item.href}
                href={item.href} 
                className="text-gray-900 dark:text-white transition-colors nav-link"
                style={{ '--hover-color': primary_color } as React.CSSProperties}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Icons - Calvin Klein Style Order: Search, User, Wishlist, Cart */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Search */}
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              aria-label="Tìm kiếm"
            >
              <Search className="w-5 h-5 text-gray-900 dark:text-white" />
            </button>

            {/* User Account */}
            {isLoading ? (
              <div className="p-2.5">
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              </div>
            ) : isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                  aria-label="Tài khoản"
                >
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt="Avatar"
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                      <span className="text-[10px] font-medium text-white dark:text-gray-900">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>

                {/* User Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-none shadow-xl border border-gray-200 dark:border-gray-800 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {user.name || "Chưa cập nhật tên"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <User className="w-4 h-4" />
                        Tài khoản của tôi
                      </Link>
                      <Link
                        href="/profile?tab=orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <Package className="w-4 h-4" />
                        Đơn hàng của tôi
                      </Link>
                      <Link
                        href="/profile?tab=wishlist"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <Heart className="w-4 h-4" />
                        Yêu thích
                      </Link>
                      {user.role?.name && ["ADMIN", "SUPER_ADMIN"].includes(user.role.name.toUpperCase()) && (
                        <Link
                          href="/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                          <Settings className="w-4 h-4" />
                          Quản trị
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login-register"
                className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                aria-label="Đăng nhập"
              >
                <User className="w-5 h-5 text-gray-900 dark:text-white" />
              </Link>
            )}

            {/* Wishlist */}
            <Link
              href={isAuthenticated ? "/profile?tab=wishlist" : "/login-register"}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition hidden sm:flex"
              aria-label="Yêu thích"
            >
              <Heart className="w-5 h-5 text-gray-900 dark:text-white" />
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition relative"
              aria-label="Giỏ hàng"
            >
              <ShoppingBag className="w-5 h-5 text-gray-900 dark:text-white" />
              <span 
                className="absolute top-1 right-1 w-4 h-4 text-white text-[10px] font-medium flex items-center justify-center rounded-full"
                style={{ backgroundColor: primary_color }}
              >
                0
              </span>
            </Link>

            {/* Theme Toggle - Desktop only */}
            <div className="hidden lg:block ml-1">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950">
          <div className="container mx-auto px-4">
            <div className="flex items-center h-16 gap-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                className="flex-1 bg-transparent text-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tìm kiếm phổ biến</p>
              <div className="flex flex-wrap gap-2">
                {["Áo lót", "Quần lót", "Đồ ngủ", "Set nội y", "Sale"].map((term) => (
                  <Link
                    key={term}
                    href={`/san-pham?search=${term}`}
                    onClick={() => setIsSearchOpen(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-white dark:bg-gray-950 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
              <span className="text-lg font-medium text-gray-900 dark:text-white">Menu</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            </div>

            {/* User Info */}
            {isAuthenticated && user ? (
              <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center">
                    {user.avatar ? (
                      <Image src={user.avatar} alt="Avatar" width={40} height={40} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-sm font-medium text-white dark:text-gray-900">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                      {user.name || "Chưa cập nhật"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
                <Link
                  href="/login-register"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                >
                  <User className="w-4 h-4" />
                  Đăng nhập / Đăng ký
                </Link>
              </div>
            )}

            {/* Navigation */}
            <nav className="px-4 py-4 space-y-1">
              <Link href="/" onClick={() => setIsMenuOpen(false)} className="block py-3 text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-800">
                Trang chủ
              </Link>
              <Link href="/san-pham" onClick={() => setIsMenuOpen(false)} className="block py-3 text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-800">
                Sản phẩm
              </Link>
              <Link href="/bai-viet" onClick={() => setIsMenuOpen(false)} className="block py-3 text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-800">
                Bài viết
              </Link>
              <Link href="/about" onClick={() => setIsMenuOpen(false)} className="block py-3 text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-800">
                Giới thiệu
              </Link>
              <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="block py-3 text-gray-900 dark:text-white font-medium border-b border-gray-100 dark:border-gray-800">
                Liên hệ
              </Link>
            </nav>

            {/* User Actions (if logged in) */}
            {isAuthenticated && user && (
              <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
                <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  Tài khoản của tôi
                </Link>
                <Link href="/profile?tab=orders" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
                  <Package className="w-4 h-4" />
                  Đơn hàng
                </Link>
                <Link href="/profile?tab=wishlist" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
                  <Heart className="w-4 h-4" />
                  Yêu thích
                </Link>
                {user.role?.name && ["ADMIN", "SUPER_ADMIN"].includes(user.role.name.toUpperCase()) && (
                  <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
                    <Settings className="w-4 h-4" />
                    Quản trị
                  </Link>
                )}
                <button
                  onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">Giao diện</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

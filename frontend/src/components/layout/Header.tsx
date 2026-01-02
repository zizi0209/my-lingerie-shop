// frontend/src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { ShoppingBag, User, Search, Menu } from "lucide-react";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

          {/* 2. Logo - Uses dynamic primary color */}
          <Link href="/" className="text-xl sm:text-2xl font-bold font-serif text-primary-500">
            LINGERIE
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
          <Link
            href="/login-register"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
          </Link>
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
          <Link href="/" className="block py-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition">
            Trang chủ
          </Link>
          <Link href="/san-pham" className="block py-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition">
            Sản phẩm
          </Link>
          <Link href="/bai-viet" className="block py-2 text-gray-600 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 transition">
            Góc tư vấn
          </Link>
          
          {/* Mobile Theme & Language Toggle */}
          <div className="border-t pt-4 mt-4 space-y-3">
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

// frontend/src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { ShoppingBag, User, Search, Menu } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* 1. Mobile Menu Button */}
        <button
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* 2. Logo - Căn giữa ở Mobile, Bên trái ở Desktop */}
        <Link href="/" className="text-2xl font-bold font-serif text-rose-500">
          LINGERIE.
        </Link>

        {/* 3. Navigation - Ẩn ở mobile, Hiện ở Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-rose-500 transition">
            TRANG CHỦ
          </Link>
          <Link href="/san-pham" className="hover:text-rose-500 transition">
            SẢN PHẨM
          </Link>
          <Link href="/bai-viet" className="hover:text-rose-500 transition">
            GÓC TƯ VẤN
          </Link>
          <Link href="/order" className="hover:text-rose-500 transition">
            TRA CỨU ĐƠN
          </Link>
        </nav>

        {/* 4. Icons (Search, User, Cart) */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <Link
            href="/login-register"
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <User className="w-5 h-5 text-gray-600" />
          </Link>
          <Link
            href="/cart"
            className="p-2 hover:bg-gray-100 rounded-full transition relative"
          >
            <ShoppingBag className="w-5 h-5 text-gray-600" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full">
              3
            </span>
          </Link>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-white p-4 space-y-4">
          <Link href="/" className="block py-2 text-gray-600">
            Trang chủ
          </Link>
          <Link href="/san-pham" className="block py-2 text-gray-600">
            Sản phẩm
          </Link>
          <Link href="/bai-viet" className="block py-2 text-gray-600">
            Góc tư vấn
          </Link>
        </div>
      )}
    </header>
  );
}

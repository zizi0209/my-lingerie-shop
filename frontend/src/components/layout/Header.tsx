// frontend/src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, Search, Menu, LogOut, Package, Settings, Heart, X, Star, Ticket, Tag, Sparkles, Flame, TrendingUp, Bookmark } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import ThemeToggle from "./ThemeToggle";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

interface PopularKeyword {
  keyword: string;
  displayName: string;
  icon: string | null;
  type: string;
}

export default function Header() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [popularKeywords, setPopularKeywords] = useState<{ pinned: PopularKeyword[]; trending: PopularKeyword[] }>({ pinned: [], trending: [] });
  const [isScrolled, setIsScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { store_name, store_logo, primary_color } = useStore();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { itemCount } = useCart();
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Handle scroll for header style
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  // Fetch popular keywords
  const fetchPopularKeywords = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}/search/popular`);
      const data = await res.json();
      if (data.success) {
        setPopularKeywords(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch popular keywords:", err);
    }
  }, [baseUrl]);

  useEffect(() => {
    fetchPopularKeywords();
  }, [fetchPopularKeywords]);

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/san-pham?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  };

  // Get icon component
  const getKeywordIcon = (iconName: string | null) => {
    switch (iconName) {
      case 'tag': return <Tag className="w-3 h-3" />;
      case 'sparkles': return <Sparkles className="w-3 h-3" />;
      case 'flame': return <Flame className="w-3 h-3" />;
      default: return <TrendingUp className="w-3 h-3" />;
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 w-full transition-colors">
      {/* Top Banner - Elegant promotion bar */}
      <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2 text-center text-[10px] tracking-[0.3em] font-medium uppercase">
        Miễn phí vận chuyển cho đơn hàng từ 500.000₫
      </div>

      {/* Main Header */}
      <div className={`bg-white dark:bg-gray-950 border-b border-gray-200/50 dark:border-gray-800/50 ${isScrolled ? 'py-3 shadow-sm backdrop-blur-md bg-white/95 dark:bg-gray-950/95' : 'py-5 md:py-6'} transition-all duration-300`}>
        <div className="container mx-auto px-4 md:px-8 flex items-center">
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
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              {store_logo ? (
                <Image 
                  src={store_logo} 
                  alt={store_name} 
                  width={140} 
                  height={40} 
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              ) : (
                <span className="logo-font text-2xl md:text-3xl tracking-tighter text-gray-900 dark:text-white">
                  {store_name}
                </span>
              )}
            </Link>
          </div>

          {/* Center: Navigation (Desktop) */}
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-12">
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
                className="text-[11px] tracking-[0.2em] font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors relative group py-1"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-current group-hover:w-full transition-all duration-300" />
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
                        href="/profile?tab=overview"
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
                      <Link
                        href="/profile/vouchers"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <Ticket className="w-4 h-4" />
                        Ví voucher & Điểm
                      </Link>
                      <Link
                        href="/tai-khoan/danh-gia"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <Star className="w-4 h-4" />
                        Đánh giá của tôi
                      </Link>
                      <Link
                        href="/profile?tab=saved-posts"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                      >
                        <Bookmark className="w-4 h-4" />
                        Bài viết đã lưu
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
              {itemCount > 0 && (
                <span 
                  className="absolute top-1 right-1 w-4 h-4 text-white text-[10px] font-medium flex items-center justify-center rounded-full"
                  style={{ backgroundColor: primary_color }}
                >
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
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
            <form onSubmit={handleSearchSubmit} className="flex items-center h-16 gap-4">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="flex-1 bg-transparent text-lg text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                aria-label="Đóng"
              >
                <X className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
            </form>
            <div className="border-t border-gray-200 dark:border-gray-800 py-8">
              {/* Pinned Keywords */}
              {popularKeywords.pinned.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Khám phá</p>
                  <div className="flex flex-wrap gap-2">
                    {popularKeywords.pinned.map((kw) => (
                      <Link
                        key={kw.keyword}
                        href={`/san-pham?search=${encodeURIComponent(kw.keyword)}`}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition rounded-full"
                      >
                        {getKeywordIcon(kw.icon)}
                        {kw.displayName}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trending Keywords */}
              {popularKeywords.trending.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Xu hướng tìm kiếm</p>
                  <div className="flex flex-wrap gap-2">
                    {popularKeywords.trending.map((kw) => (
                      <Link
                        key={kw.keyword}
                        href={`/san-pham?search=${encodeURIComponent(kw.keyword)}`}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition rounded-full"
                      >
                        <TrendingUp className="w-3 h-3" />
                        {kw.displayName}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback if no keywords loaded */}
              {popularKeywords.pinned.length === 0 && popularKeywords.trending.length === 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Tìm kiếm phổ biến</p>
                  <div className="flex flex-wrap gap-2">
                    {["Áo lót", "Quần lót", "Đồ ngủ", "Sale"].map((term) => (
                      <Link
                        key={term}
                        href={`/san-pham?search=${encodeURIComponent(term)}`}
                        onClick={() => {
                          setIsSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition rounded-full"
                      >
                        {term}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
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
                <Link href="/profile?tab=overview" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
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
                <Link href="/profile/vouchers" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
                  <Ticket className="w-4 h-4" />
                  Ví voucher & Điểm
                </Link>
                <Link href="/tai-khoan/danh-gia" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
                  <Star className="w-4 h-4" />
                  Đánh giá của tôi
                </Link>
                <Link href="/profile?tab=saved-posts" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 py-3 text-gray-600 dark:text-gray-400">
                  <Bookmark className="w-4 h-4" />
                  Bài viết đã lưu
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

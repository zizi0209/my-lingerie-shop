// frontend/src/components/layout/Footer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, Instagram, Truck, RefreshCw, ShieldCheck, ChevronRight } from "lucide-react";
import { useStore } from "@/context/StoreContext";

export default function Footer() {
  const { store_name, store_logo, store_description, social_facebook, social_instagram, social_tiktok, social_zalo } = useStore();

  return (
    <footer className="bg-brand-secondary dark:bg-gray-900 text-gray-900 dark:text-white pt-20 md:pt-24 pb-8 border-t border-brand-border/20 transition-colors">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16 mb-16">
        {/* Cột 1: Thương hiệu & Kết nối */}
        <div className="space-y-6">
          {store_logo ? (
            <Image 
              src={store_logo} 
              alt={store_name} 
              width={150} 
              height={50} 
              className="h-10 w-auto object-contain"
            />
          ) : (
            <h3 className="logo-font text-2xl tracking-tighter text-gray-900 dark:text-white opacity-90">
              {store_name}
            </h3>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed italic font-light max-w-[240px]">
            {store_description || "Nghệ thuật quyến rũ từ sự thấu hiểu cơ thể."}
          </p>
          
          {/* Social Links */}
          <div className="flex gap-3 pt-2">
            {social_instagram && (
              <a href={social_instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 border border-brand-border/30 hover:text-brand-accent hover:border-brand-accent transition-all duration-300 rounded-sm text-gray-500 dark:text-gray-400">
                <Instagram size={16} strokeWidth={1.5} />
              </a>
            )}
            {social_facebook && (
              <a href={social_facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 border border-brand-border/30 hover:text-brand-accent hover:border-brand-accent transition-all duration-300 rounded-sm text-gray-500 dark:text-gray-400">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18.77,7.46H14.5v-1.9c0-.9.6-1.1,1-1.1h3V.5h-4.33C10.24.5,9.5,3.44,9.5,5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4Z"/></svg>
              </a>
            )}
            {social_tiktok && (
              <a href={social_tiktok} target="_blank" rel="noopener noreferrer" className="p-2.5 border border-brand-border/30 hover:text-brand-accent hover:border-brand-accent transition-all duration-300 rounded-sm text-gray-500 dark:text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/></svg>
              </a>
            )}
            {social_zalo && (
              <a href={social_zalo} target="_blank" rel="noopener noreferrer" className="p-2.5 border border-brand-border/30 hover:text-brand-accent hover:border-brand-accent transition-all duration-300 rounded-sm text-gray-500 dark:text-gray-400" title="Zalo">
                <svg width="16" height="16" viewBox="0 0 48 48" fill="currentColor"><path d="M24 4C12.95 4 4 12.95 4 24c0 11.05 8.95 20 20 20 11.05 0 20-8.95 20-20C44 12.95 35.05 4 24 4zm9.14 28.75h-4.54c-.41 0-.75-.34-.75-.75V21.53l-5.91 10.13c-.14.23-.39.38-.66.38h-.56c-.27 0-.52-.14-.66-.38l-5.91-10.13V32c0 .41-.34.75-.75.75H9.86c-.41 0-.75-.34-.75-.75V16c0-.41.34-.75.75-.75h4.54c.27 0 .52.14.66.38l5.94 10.18 5.94-10.18c.14-.23.39-.38.66-.38h4.54c.41 0 .75.34.75.75V32c0 .41-.34.75-.75.75z"/></svg>
              </a>
            )}
          </div>

          <div className="space-y-2 text-xs tracking-wider font-medium text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
              <Phone size={14} strokeWidth={1.5} /> 1900 xxxx
            </div>
            <div className="flex items-center gap-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer">
              <Mail size={14} strokeWidth={1.5} /> support@lingerie.vn
            </div>
          </div>
        </div>

        {/* Cột 2: Hỗ trợ khách hàng */}
        <div className="space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Hỗ trợ khách hàng</h4>
          <ul className="text-sm space-y-3 text-gray-600 dark:text-gray-400">
            <li className="hover:text-brand-accent cursor-pointer transition-all flex items-center gap-2">
              <ShieldCheck size={14} className="opacity-50" />
              <Link href="/policy">Chính sách đổi trả (7 ngày)</Link>
            </li>
            <li className="hover:text-brand-accent cursor-pointer transition-all flex items-center gap-2">
              <Truck size={14} className="opacity-50" />
              <Link href="/shipping">Chính sách vận chuyển</Link>
            </li>
            <li className="hover:text-brand-accent cursor-pointer transition-all flex items-center gap-2">
              <RefreshCw size={14} className="opacity-50" />
              <Link href="/security">Bảo mật thông tin</Link>
            </li>
          </ul>
        </div>

        {/* Cột 3: Khám phá */}
        <div className="space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Khám phá</h4>
          <ul className="text-sm space-y-3 text-gray-600 dark:text-gray-400">
            <li><Link href="/about" className="hover:text-brand-accent transition-all">Về chúng tôi</Link></li>
            <li><Link href="/san-pham" className="hover:text-brand-accent transition-all">Bộ sưu tập mới</Link></li>
            <li><Link href="/san-pham?category=ao-lot" className="hover:text-brand-accent transition-all">Áo lót (Bras)</Link></li>
            <li><Link href="/san-pham?category=quan-lot" className="hover:text-brand-accent transition-all">Quần lót (Panties)</Link></li>
            <li><Link href="/san-pham?category=do-ngu" className="hover:text-brand-accent transition-all">Đồ ngủ (Sleepwear)</Link></li>
            <li><Link href="/careers" className="hover:text-brand-accent transition-all">Tuyển dụng</Link></li>
          </ul>
        </div>

        {/* Cột 4: Bản tin & Ưu đãi */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Bản tin</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Đăng ký nhận tin để hưởng ưu đãi 10% cho đơn đầu tiên.
            </p>
            <div className="relative group w-full max-w-[260px] pt-2">
              <input 
                type="email" 
                placeholder="Địa chỉ email" 
                className="w-full bg-transparent border-b border-brand-border/40 py-2 pr-8 text-sm focus:outline-none focus:border-brand-accent transition-all placeholder:opacity-50 text-gray-900 dark:text-white" 
              />
              <button className="absolute right-0 bottom-1/2 translate-y-1/2 p-1 text-gray-400 group-focus-within:text-brand-accent transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">Phương thức thanh toán</h4>
            <div className="flex flex-wrap gap-3 opacity-50 hover:opacity-80 transition-all duration-700">
              <span className="text-xs font-bold border border-gray-400 dark:border-gray-600 px-2 py-0.5 flex items-center">COD</span>
              <span className="text-xs font-semibold text-gray-500">VISA</span>
              <span className="text-xs font-semibold text-gray-500">Mastercard</span>
              <span className="text-xs font-semibold text-gray-500">MoMo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8 border-t border-brand-border/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-medium">
          © 2024 {store_name}. All rights reserved.
        </p>
        <div className="flex gap-6 text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
          <Link href="/policy" className="hover:text-brand-accent transition-colors">Điều khoản</Link>
          <Link href="/security" className="hover:text-brand-accent transition-colors">Bảo mật</Link>
        </div>
      </div>
    </footer>
  );
}

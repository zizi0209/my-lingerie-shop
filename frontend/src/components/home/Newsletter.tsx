'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Loader2, CheckCircle, ChevronRight } from 'lucide-react';

interface NewsletterContent {
  title?: string;
  subtitle?: string;
}

interface NewsletterProps {
  content: NewsletterContent;
}

export default function Newsletter({ content }: NewsletterProps) {
  const { 
    title = 'Thẻ quà tặng', 
    subtitle = 'Tặng người phụ nữ bạn yêu thương món quà của sự tự tin. Thẻ quà tặng cho phép cô ấy tự do khám phá phong cách riêng.' 
  } = content;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setSuccess(true);
    setEmail('');
  };

  return (
    <section className="section-spacing">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 bg-brand-accent/5 p-8 md:p-16 border border-brand-border">
          <div className="md:w-1/2 space-y-8">
            <h3 className="text-3xl md:text-5xl font-serif italic text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-md">
              {subtitle}
            </p>
            
            {success ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Đăng ký thành công!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="relative group w-full max-w-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email nhận ưu đãi"
                  className="w-full bg-transparent border-b border-brand-border/40 py-3 pr-10 text-sm focus:outline-none focus:border-brand-accent transition-all placeholder:opacity-40 placeholder:font-light font-light text-gray-900 dark:text-white"
                  required
                />
                <button 
                  type="submit"
                  disabled={loading}
                  className="absolute right-0 bottom-1/2 translate-y-1/2 p-2 text-gray-400 group-focus-within:text-brand-accent hover:text-brand-accent transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight size={16} />}
                </button>
              </form>
            )}
          </div>
          
          <div className="md:w-1/2 w-full flex justify-center items-center">
            <div className="w-full max-w-md aspect-[1.618/1] bg-white dark:bg-gray-900 shadow-2xl p-6 md:p-10 flex flex-col justify-between border border-brand-border transform -rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex justify-between items-start">
                <span className="logo-font text-lg opacity-60 text-gray-900 dark:text-white">Lingerie</span>
                <span className="text-[9px] tracking-[0.3em] opacity-30 text-gray-900 dark:text-white">EST. 2024</span>
              </div>
              <div className="text-center">
                <h4 className="text-3xl md:text-4xl font-serif italic text-brand-accent tracking-wide">1.000.000₫</h4>
              </div>
              <div className="flex justify-between items-end border-t border-brand-border pt-4 opacity-50">
                <span className="text-[9px] uppercase tracking-[0.15em] text-gray-900 dark:text-white">Hạn dùng 12 tháng</span>
                <span className="text-[11px] font-bold text-gray-900 dark:text-white">#GIFT-CARD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

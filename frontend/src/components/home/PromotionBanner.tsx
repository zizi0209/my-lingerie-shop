'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface PromotionContent {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  link?: string;
}

interface PromotionBannerProps {
  content: PromotionContent;
}

export default function PromotionBanner({ content }: PromotionBannerProps) {
  const {
    title = 'Flash Sale',
    subtitle = 'Giảm đến 50%',
    backgroundImage = 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1972&auto=format&fit=crop',
    link = '/san-pham?sale=true',
  } = content;

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={backgroundImage}
          alt="Promotion"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 to-primary-600/70"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center text-white">
        <h2 className="text-4xl md:text-6xl font-serif font-light mb-4">
          {title}
        </h2>
        <p className="text-xl md:text-2xl mb-8 opacity-90">
          {subtitle}
        </p>
        <Link
          href={link}
          className="inline-flex items-center gap-2 bg-white text-primary-600 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition group"
        >
          Mua ngay
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </section>
  );
}

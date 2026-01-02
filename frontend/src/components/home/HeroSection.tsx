'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface HeroContent {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundImage?: string;
}

interface HeroSectionProps {
  content: HeroContent;
}

export default function HeroSection({ content }: HeroSectionProps) {
  const {
    title = 'Bộ sưu tập mới',
    subtitle = 'Khám phá vẻ đẹp quyến rũ',
    buttonText = 'Khám phá ngay',
    buttonLink = '/san-pham',
    backgroundImage = 'https://images.unsplash.com/photo-1519644473771-e45d361c9bb8?q=80&w=1170&auto=format&fit=crop',
  } = content;

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={backgroundImage}
          alt="Hero Banner"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/40 to-black/60"></div>
      </div>

      <div className="relative z-10 text-center text-white px-4 max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light mb-4 md:mb-6 leading-tight">
          {title}
        </h1>
        <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto mb-8 md:mb-10 font-light leading-relaxed px-4">
          {subtitle}
        </p>
        <Link
          href={buttonLink}
          className="ck-button inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-3 md:px-8 md:py-4 rounded-full font-medium hover:bg-gray-100 transition group min-h-[44px]"
        >
          {buttonText}
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-0.5 h-10 bg-white/50 mx-auto"></div>
      </div>
    </section>
  );
}

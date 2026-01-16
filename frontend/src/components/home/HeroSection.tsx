'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';

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
  const { store_name } = useStore();
  const {
    title = 'Bộ sưu tập mới',
    subtitle = 'Khám phá vẻ đẹp quyến rũ',
    buttonText = 'Khám phá bộ sưu tập',
    buttonLink = '/san-pham',
    backgroundImage = 'https://images.unsplash.com/photo-1519644473771-e45d361c9bb8?q=80&w=1170&auto=format&fit=crop',
  } = content;

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-brand-bg overflow-hidden pt-8 pb-16">
      {/* Background Marquee Text */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.04] select-none flex flex-col justify-between py-12">
        <div className="animate-marquee whitespace-nowrap logo-font text-[8vw] tracking-tighter text-gray-900 dark:text-white">
          {Array(10).fill(`${store_name || 'LINGERIE'} `).map((t, i) => <span key={i} className={i % 2 === 0 ? "opacity-100" : "opacity-30"}>{t}</span>)}
        </div>
        <div className="animate-marquee whitespace-nowrap logo-font text-[8vw] tracking-tighter text-gray-900 dark:text-white" style={{ animationDirection: 'reverse' }}>
          {Array(10).fill(`${store_name || 'LINGERIE'} `).map((t, i) => <span key={i} className={i % 3 === 0 ? "opacity-30" : "opacity-100"}>{t}</span>)}
        </div>
      </div>

      <div className="relative max-w-[1200px] w-full px-4 md:px-8 grid grid-cols-12 items-center gap-4 md:gap-0">
        
        {/* Left Floating Image */}
        <div className="col-span-6 md:col-span-3 z-20 md:translate-y-4">
          <div className="aspect-[3/5] overflow-hidden shadow-2xl">
            <Image 
              src="https://images.unsplash.com/photo-1616002411355-49593fd89721?q=80&w=800&auto=format&fit=crop"
              alt="Editorial Lingerie 1" 
              width={400}
              height={600}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
            />
          </div>
        </div>

        {/* Center Main Content */}
        <div className="col-span-12 md:col-span-6 flex flex-col items-center relative z-10 md:-mx-8 order-first md:order-none mb-8 md:mb-0">
          {/* Typography */}
          <div className="text-center mb-4 relative z-30">
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-serif leading-[0.85] tracking-tight italic text-gray-900 dark:text-white">
              {title || store_name}
            </h1>
            <h2 className="text-[clamp(1rem,3vw,2rem)] font-serif uppercase tracking-[0.3em] font-light mt-3 text-gray-900 dark:text-white opacity-80">
              LINGERIE
            </h2>
          </div>

          {/* Center Image Box */}
          <div className="w-[90%] md:w-[85%] aspect-video overflow-hidden shadow-xl mt-[-1vw] relative z-20">
            <Image 
              src={backgroundImage}
              alt="Hero Banner" 
              fill
              className="object-cover brightness-105 contrast-90"
              priority
              unoptimized
            />
            {/* CTA Overlay */}
            <Link 
              href={buttonLink}
              className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center group cursor-pointer"
            >
              <span className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-bold opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                {buttonText}
              </span>
            </Link>
          </div>

          {/* Subtitle */}
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 mt-6 text-center max-w-md font-light italic">
            {subtitle}
          </p>
        </div>

        {/* Right Floating Image */}
        <div className="col-span-6 md:col-span-3 z-20 md:translate-y-8 flex justify-end">
          <div className="aspect-[3/4] w-full md:w-[110%] overflow-hidden shadow-2xl">
            <Image 
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop"
              alt="Model Editorial 2" 
              width={440}
              height={550}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

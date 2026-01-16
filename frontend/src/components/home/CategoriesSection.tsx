'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    new URL(url);
    return !url.includes('example.com');
  } catch {
    return false;
  }
}

interface Category {
  id: number;
  name: string;
  slug: string;
  image?: string;
}

interface CategoriesContent {
  title?: string;
  style?: 'grid' | 'carousel';
}

interface CategoriesSectionProps {
  content: CategoriesContent;
}

export default function CategoriesSection({ content }: CategoriesSectionProps) {
  const { title = 'Bộ sưu tập tiêu biểu' } = content;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${baseUrl}/categories`);
        const data = await res.json();
        if (data.success) {
          setCategories(data.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className="section-spacing">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-40 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-6">
                  <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="section-spacing">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <header className="flex items-end justify-between mb-8 border-b border-brand-border pb-4">
          <h2 className="text-[11px] uppercase tracking-[0.3em] font-bold text-gray-900 dark:text-white">{title}</h2>
          <Link 
            href="/san-pham" 
            className="text-[10px] uppercase tracking-[0.15em] text-gray-400 hover:text-brand-accent transition-all flex items-center gap-1"
          >
            Xem tất cả <ChevronRight size={12} />
          </Link>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
          {categories.slice(0, 3).map((category) => (
            <Link
              key={category.id}
              href={`/san-pham?category=${category.slug}`}
              className="group cursor-pointer space-y-6"
            >
              <div className="aspect-[3/4] overflow-hidden bg-brand-secondary shadow-sm">
                {isValidImageUrl(category.image) ? (
                  <Image
                    src={category.image!}
                    alt={category.name}
                    width={600}
                    height={800}
                    className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-brand-accent/20 to-brand-accent/40 flex items-center justify-center">
                    <span className="text-2xl font-serif italic text-gray-400">{category.name}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between px-1">
                <h3 className="font-serif text-xl md:text-2xl italic text-gray-900 dark:text-white">{category.name}</h3>
                <div className="w-8 h-[1px] bg-gray-300 dark:bg-gray-700 group-hover:w-16 group-hover:bg-brand-accent transition-all duration-500"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

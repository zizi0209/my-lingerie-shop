'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  const { title = 'Danh mục sản phẩm' } = content;
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
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-56 mx-auto mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="bg-white dark:bg-gray-950 py-12 md:py-20 transition-colors">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-light mb-4 text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/san-pham?category=${category.slug}`}
              className="group block relative aspect-[3/4] rounded-lg overflow-hidden"
            >
              {isValidImageUrl(category.image) ? (
                <Image
                  src={category.image!}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600"></div>
              )}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors"></div>
              <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 text-white">
                <h3 className="text-xl md:text-2xl font-light">{category.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

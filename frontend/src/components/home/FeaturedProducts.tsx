'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: { url: string }[];
  category: { name: string };
}

interface FeaturedProductsContent {
  title?: string;
  limit?: number;
}

interface FeaturedProductsProps {
  content: FeaturedProductsContent;
}

export default function FeaturedProducts({ content }: FeaturedProductsProps) {
  const { title = 'Được yêu thích nhất', limit = 8 } = content;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${baseUrl}/products?isFeatured=true&limit=${limit}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.data.slice(0, limit));
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [limit]);

  if (loading) {
    return (
      <section className="bg-brand-secondary/30 section-spacing">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32 mx-auto mb-3"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-64 mx-auto mb-12"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mx-auto"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="bg-brand-secondary/30 section-spacing">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <header className="mb-12 md:mb-16 text-center">
          <h2 className="text-[11px] uppercase tracking-[0.4em] font-bold mb-3 text-gray-500 dark:text-gray-400">Best Sellers</h2>
          <h3 className="text-3xl md:text-5xl font-serif italic text-gray-900 dark:text-white">{title}</h3>
        </header>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/san-pham/${product.slug}`}
              className="group flex flex-col gap-4"
            >
              <div className="relative aspect-[3/4] bg-brand-secondary overflow-hidden shadow-sm transition-shadow hover:shadow-2xl">
                {product.images?.[0] && (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-1000"
                  />
                )}
                {product.salePrice && (
                  <span className="absolute top-4 left-4 bg-red-600 text-white text-[9px] px-3 py-1.5 uppercase tracking-[0.15em] font-bold shadow-xl">
                    -{Math.round((1 - product.salePrice / product.price) * 100)}%
                  </span>
                )}
              </div>
              <div className="space-y-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-accent font-bold opacity-80">
                  {product.category?.name}
                </p>
                <h4 className="text-[12px] font-bold tracking-[0.05em] uppercase group-hover:text-brand-accent transition-colors text-gray-900 dark:text-white leading-relaxed line-clamp-2">
                  {product.name}
                </h4>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[14px] font-medium text-gray-900 dark:text-white opacity-70 italic">
                    {(product.salePrice || product.price).toLocaleString('vi-VN')}₫
                  </span>
                  {product.salePrice && (
                    <span className="text-[12px] text-gray-400 line-through">
                      {product.price.toLocaleString('vi-VN')}₫
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12 md:mt-16">
          <Link
            href="/san-pham?featured=true"
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 dark:text-gray-400 hover:text-brand-accent transition-all"
          >
            Xem tất cả
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

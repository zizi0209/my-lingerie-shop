'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: { url: string }[];
  category: { name: string };
}

interface NewArrivalsContent {
  title?: string;
  limit?: number;
}

interface NewArrivalsProps {
  content: NewArrivalsContent;
}

export default function NewArrivals({ content }: NewArrivalsProps) {
  const { title = 'Hàng mới về', limit = 8 } = content;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${baseUrl}/products?sort=newest&limit=${limit}`);
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
      <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-48 mx-auto mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
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
    <section className="bg-gray-50 dark:bg-gray-900 py-12 md:py-20 transition-colors">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-serif font-light mb-4 text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/san-pham/${product.slug}`}
              className="group block"
            >
              <div className="relative aspect-[3/4] bg-white dark:bg-gray-800 rounded-lg overflow-hidden mb-3">
                {product.images?.[0] && (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <span className="absolute top-2 left-2 bg-black dark:bg-white text-white dark:text-black text-xs px-2 py-1 rounded">
                  Mới
                </span>
              </div>
              <h3 className="text-sm md:text-base font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-300 transition-colors line-clamp-2 mb-1">
                {product.name}
              </h3>
              <span className="text-base font-light text-gray-900 dark:text-white">
                {(product.salePrice || product.price).toLocaleString('vi-VN')}₫
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <Link
            href="/san-pham?sort=newest"
            className="inline-flex items-center gap-2 text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-300 transition font-medium"
          >
            Xem tất cả sản phẩm mới
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

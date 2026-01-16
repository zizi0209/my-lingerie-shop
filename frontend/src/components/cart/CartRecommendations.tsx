'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getSessionId } from '@/lib/tracking';

interface ProductCard {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  image: string | null;
  categoryName: string;
  colors: string[];
  hasStock: boolean;
  confidence: number;
}

interface CartRecommendationsProps {
  productIds: number[];
  limit?: number;
}

export default function CartRecommendations({ productIds, limit = 6 }: CartRecommendationsProps) {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/recommendations/for-cart?productIds=${productIds.join(',')}&limit=${limit}`
        ) as { success: boolean; data: { products: ProductCard[]; message?: string } };

        if (response.success && response.data.products) {
          setProducts(response.data.products);
          if (response.data.message) {
            setMessage(response.data.message);
          }
        }
      } catch (error) {
        console.error('Error fetching cart recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [productIds, limit]);

  const trackClick = async (product: ProductCard, position: number) => {
    try {
      const sessionId = getSessionId();
      await api.post('/recommendations/track-click', {
        productId: product.id,
        algorithm: 'for-cart',
        position,
        sectionType: 'cart',
        sessionId
      });
    } catch {
      // Silent fail
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  if (loading) {
    return (
      <div className="mt-8 py-6 border-t border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-40">
                <div className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 py-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary-500" />
          {message || 'Có thể bạn sẽ thích'}
        </h3>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {products.map((product, index) => (
          <Link
            key={product.id}
            href={`/san-pham/${product.slug}`}
            onClick={() => trackClick(product, index)}
            className="flex-shrink-0 w-40 group"
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-2">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="160px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ShoppingBag className="w-10 h-10" />
                </div>
              )}

              {product.salePrice && (
                <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                  -{Math.round((1 - product.salePrice / product.price) * 100)}%
                </span>
              )}

              {!product.hasStock && (
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold bg-gray-500 text-white rounded-full">
                  Hết hàng
                </span>
              )}
            </div>

            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1 group-hover:text-primary-600 transition-colors">
              {product.name}
            </h4>

            <div className="flex items-center gap-2">
              {product.salePrice ? (
                <>
                  <span className="font-bold text-sm text-red-600">
                    {formatPrice(product.salePrice)}đ
                  </span>
                  <span className="text-xs text-gray-400 line-through">
                    {formatPrice(product.price)}đ
                  </span>
                </>
              ) : (
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  {formatPrice(product.price)}đ
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

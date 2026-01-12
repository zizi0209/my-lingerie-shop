'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sparkles, TrendingUp, Eye, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface ProductCard {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  image: string | null;
  categoryName: string;
  ratingAverage: number;
  reviewCount: number;
  colors: string[];
  hasStock: boolean;
  growthRate?: number;
  confidence?: number;
}

interface RecommendationSectionProps {
  type: 'similar' | 'recently-viewed' | 'trending' | 'bought-together' | 'personalized' | 'new-arrivals' | 'best-sellers';
  productId?: number;
  userId?: number;
  sessionId?: string;
  categoryId?: number;
  title?: string;
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

export default function RecommendationSection({
  type,
  productId,
  userId,
  sessionId,
  categoryId,
  title,
  limit = 6,
  showViewAll = false,
  className = ''
}: RecommendationSectionProps) {
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<string>('');
  const [scrollPosition, setScrollPosition] = useState(0);

  const defaultTitles: Record<string, string> = {
    'similar': 'Có thể bạn cũng thích',
    'recently-viewed': 'Đã xem gần đây',
    'trending': 'Đang hot tuần này',
    'bought-together': 'Thường mua cùng',
    'personalized': 'Dành riêng cho bạn',
    'new-arrivals': 'Sản phẩm mới',
    'best-sellers': 'Bán chạy nhất'
  };

  const icons: Record<string, React.ReactNode> = {
    'similar': <Sparkles className="w-5 h-5" />,
    'recently-viewed': <Eye className="w-5 h-5" />,
    'trending': <TrendingUp className="w-5 h-5" />,
    'bought-together': <ShoppingBag className="w-5 h-5" />,
    'personalized': <Sparkles className="w-5 h-5" />,
    'new-arrivals': <Sparkles className="w-5 h-5" />,
    'best-sellers': <TrendingUp className="w-5 h-5" />
  };

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        let endpoint = '';
        const params = new URLSearchParams();
        params.append('limit', limit.toString());

        switch (type) {
          case 'similar':
            if (!productId) return;
            endpoint = `/recommendations/similar/${productId}`;
            if (userId) params.append('userId', userId.toString());
            break;
          case 'recently-viewed':
            if (!sessionId) return;
            endpoint = '/recommendations/recently-viewed';
            params.append('sessionId', sessionId);
            if (userId) params.append('userId', userId.toString());
            if (productId) params.append('excludeId', productId.toString());
            break;
          case 'trending':
            endpoint = '/recommendations/trending';
            break;
          case 'bought-together':
            if (!productId) return;
            endpoint = `/recommendations/bought-together/${productId}`;
            break;
          case 'personalized':
            if (!userId) return;
            endpoint = '/recommendations/personalized';
            params.append('userId', userId.toString());
            break;
          case 'new-arrivals':
            endpoint = '/recommendations/new-arrivals';
            break;
          case 'best-sellers':
            endpoint = '/recommendations/best-sellers';
            if (categoryId) params.append('categoryId', categoryId.toString());
            break;
        }

        const url = `${endpoint}?${params.toString()}`;
        const response = await api.get(url) as { success: boolean; data: { products: ProductCard[]; reason?: string } };
        
        if (response.success && response.data.products) {
          setProducts(response.data.products);
          if (response.data.reason) {
            setReason(response.data.reason);
          }
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [type, productId, userId, sessionId, categoryId, limit]);

  const trackClick = async (product: ProductCard, position: number) => {
    try {
      await api.post('/recommendations/track-click', {
        productId: product.id,
        sourceProductId: productId,
        algorithm: type,
        position,
        sectionType: type,
        sessionId: sessionId || 'anonymous',
        userId
      });
    } catch (error) {
      // Silent fail for tracking
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById(`rec-scroll-${type}`);
    if (container) {
      const scrollAmount = 300;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  if (loading) {
    return (
      <div className={`py-8 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-4"></div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-48">
                <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-xl mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
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
    <div className={`py-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-primary-500">{icons[type]}</span>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {title || defaultTitles[type]}
          </h2>
          {reason && (
            <span className="text-sm text-slate-500 dark:text-slate-400 ml-2">
              - {reason}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {showViewAll && (
            <Link
              href="/san-pham"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Xem tất cả
            </Link>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div
        id={`rec-scroll-${type}`}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product, index) => (
          <Link
            key={product.id}
            href={`/san-pham/${product.slug}`}
            onClick={() => trackClick(product, index)}
            className="flex-shrink-0 w-44 sm:w-48 group"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 176px, 192px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-12 h-12" />
                </div>
              )}
              
              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {product.salePrice && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                    -{Math.round((1 - product.salePrice / product.price) * 100)}%
                  </span>
                )}
                {type === 'trending' && product.growthRate && product.growthRate > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-orange-500 text-white rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{product.growthRate}%
                  </span>
                )}
                {!product.hasStock && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-slate-500 text-white rounded-full">
                    Hết hàng
                  </span>
                )}
              </div>

              {/* Colors preview */}
              {product.colors.length > 0 && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {product.colors.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ 
                        backgroundColor: getColorHex(color),
                      }}
                      title={color}
                    />
                  ))}
                  {product.colors.length > 4 && (
                    <span className="text-xs text-white bg-black/50 px-1 rounded">
                      +{product.colors.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="px-1">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {product.categoryName}
              </p>
              <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2 mb-2 group-hover:text-primary-600 transition-colors">
                {product.name}
              </h3>
              <div className="flex items-center gap-2">
                {product.salePrice ? (
                  <>
                    <span className="font-bold text-red-600">
                      {formatPrice(product.salePrice)}đ
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      {formatPrice(product.price)}đ
                    </span>
                  </>
                ) : (
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatPrice(product.price)}đ
                  </span>
                )}
              </div>
              
              {/* Rating */}
              {product.reviewCount > 0 && (
                <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                  <span className="text-yellow-500">★</span>
                  <span>{product.ratingAverage.toFixed(1)}</span>
                  <span>({product.reviewCount})</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Helper to convert color name to hex
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    'đen': '#000000',
    'black': '#000000',
    'trắng': '#ffffff',
    'white': '#ffffff',
    'đỏ': '#ef4444',
    'red': '#ef4444',
    'hồng': '#ec4899',
    'pink': '#ec4899',
    'xanh': '#3b82f6',
    'blue': '#3b82f6',
    'xanh lá': '#22c55e',
    'green': '#22c55e',
    'vàng': '#eab308',
    'yellow': '#eab308',
    'cam': '#f97316',
    'orange': '#f97316',
    'tím': '#a855f7',
    'purple': '#a855f7',
    'be': '#d4a574',
    'beige': '#d4a574',
    'nâu': '#92400e',
    'brown': '#92400e',
    'xám': '#6b7280',
    'gray': '#6b7280',
    'nude': '#e8d4c4',
    'kem': '#fef3c7',
  };
  
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#9ca3af';
}

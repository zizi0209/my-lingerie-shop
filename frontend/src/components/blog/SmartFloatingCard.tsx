'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingCart, Eye, Star } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: { url: string }[];
  category: { name: string; slug: string };
}

interface FloatingProduct {
  productId: number;
  customNote?: string;
  product: Product;
  elementId: string; // ID của ProductNode trong DOM
}

interface SmartFloatingCardProps {
  products: FloatingProduct[];
  postId: number;
}

const COOLDOWN_KEY = 'floating-card-cooldown';
const COOLDOWN_DURATION = 15 * 60 * 1000; // 15 minutes
const SCROLL_THRESHOLD = 0.3; // 30% of viewport

export default function SmartFloatingCard({ products, postId }: SmartFloatingCardProps) {
  const [currentProduct, setCurrentProduct] = useState<FloatingProduct | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosedByUser, setIsClosedByUser] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const productElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Check cooldown
  useEffect(() => {
    const cooldownData = localStorage.getItem(COOLDOWN_KEY);
    if (cooldownData) {
      const { timestamp, postId: savedPostId } = JSON.parse(cooldownData);
      const now = Date.now();
      
      // If same post and within cooldown period
      if (savedPostId === postId && now - timestamp < COOLDOWN_DURATION) {
        setIsClosedByUser(true);
        return;
      }
    }
  }, [postId]);

  // Setup IntersectionObserver for context-aware switching
  useEffect(() => {
    if (isClosedByUser || products.length === 0) return;

    // Find all product nodes in DOM
    products.forEach((product) => {
      const element = document.querySelector(`[data-product-id="${product.productId}"]`);
      if (element instanceof HTMLElement) {
        productElementsRef.current.set(product.elementId, element);
      }
    });

    // Create observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= SCROLL_THRESHOLD) {
            // Find which product this element belongs to
            const element = entry.target as HTMLElement;
            const productId = Number(element.getAttribute('data-product-id'));
            const product = products.find(p => p.productId === productId);
            
            if (product) {
              setCurrentProduct(product);
              setIsVisible(true);
              setAddedToCart(false);
            }
          }
        });
      },
      {
        threshold: [0, 0.3, 0.5, 0.7, 1],
        rootMargin: '-20% 0px -20% 0px', // Trigger when in middle 60% of viewport
      }
    );

    // Observe all product elements
    productElementsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [products, isClosedByUser, postId]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setIsClosedByUser(true);
    
    // Save cooldown to localStorage
    localStorage.setItem(
      COOLDOWN_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        postId,
      })
    );
  }, [postId]);

  const handleAddToCart = useCallback(() => {
    // TODO: Implement add to cart logic
    setAddedToCart(true);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 3000);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (!currentProduct || !isVisible || isClosedByUser) {
    return null;
  }

  const { product, customNote } = currentProduct;
  const discount = product.salePrice
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : 0;

  return (
    <>
      {/* Desktop: Bottom-right floating card */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50 animate-in slide-in-from-right-5 fade-in duration-500">
        <div className="w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>

          {/* Product image */}
          <div className="relative h-64 bg-slate-100 dark:bg-slate-800">
            {product.images[0] && (
              <Image
                src={product.images[0].url}
                alt={product.name}
                fill
                sizes="320px"
                className="object-cover"
              />
            )}
            {discount > 0 && (
              <div className="absolute top-3 left-3 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-lg shadow-lg">
                -{discount}%
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                {product.category.name}
              </span>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 font-serif">
              {product.name}
            </h3>

            {customNote && (
              <p className="text-sm text-slate-600 dark:text-slate-400 italic mb-3">
                💡 {customNote}
              </p>
            )}

            <div className="flex items-baseline gap-2 mb-4">
              {product.salePrice ? (
                <>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {formatPrice(product.salePrice)}
                  </span>
                  <span className="text-sm text-slate-400 line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* CTA buttons */}
            <div className="flex gap-2">
              <Link
                href={`/san-pham/${product.slug}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Xem nhanh</span>
              </Link>
              <button
                onClick={handleAddToCart}
                disabled={addedToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
                  addedToCart
                    ? 'bg-green-600 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/30'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>{addedToCart ? 'Đã thêm ✓' : 'Thêm vào giỏ'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
        <div className="bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 p-3">
            {/* Product thumbnail */}
            <div className="relative w-16 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
              {product.images[0] && (
                <Image
                  src={product.images[0].url}
                  alt={product.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
              {discount > 0 && (
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate font-serif">
                {product.name}
              </h4>
              <div className="flex items-baseline gap-2 mt-1">
                {product.salePrice ? (
                  <>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {formatPrice(product.salePrice)}
                    </span>
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(product.price)}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {formatPrice(product.price)}
                  </span>
                )}
              </div>
            </div>

            {/* CTA button */}
            <button
              onClick={handleAddToCart}
              disabled={addedToCart}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all flex-shrink-0 ${
                addedToCart
                  ? 'bg-green-600 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {addedToCart ? '✓' : 'Mua'}
            </button>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

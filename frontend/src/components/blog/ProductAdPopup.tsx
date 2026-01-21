'use client';

import { useState, useEffect } from 'react';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: { url: string }[];
  category: { name: string; slug: string };
}

interface ProductOnPost {
  id: number;
  productId: number;
  displayType: string;
  customNote: string | null;
  product: Product;
}

interface ProductAdPopupProps {
  postId: number;
  delaySeconds: number;
  enabled: boolean;
}

export default function ProductAdPopup({ postId, delaySeconds, enabled }: ProductAdPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<ProductOnPost[]>([]);
  const [loading, setLoading] = useState(true);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!enabled) return;

    // Fetch ad products
    const fetchAdProducts = async () => {
      try {
        const res = await fetch(`${baseUrl}/product-posts/posts/${postId}/ad-products`);
        const data = await res.json();
        
        if (data.success && data.data?.length > 0) {
          setProducts(data.data);
          
          // Show popup after delay
          const timer = setTimeout(() => {
            setIsOpen(true);
          }, delaySeconds * 1000);

          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Failed to fetch ad products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdProducts();
  }, [postId, delaySeconds, enabled, baseUrl]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (!enabled || !isOpen || products.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-800 m-4">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-8 text-white">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                Sản phẩm được đề xuất
              </h2>
              <p className="text-sm text-rose-100">
                Những sản phẩm hoàn hảo cho bạn
              </p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((item) => (
              <Link
                key={item.id}
                href={`/san-pham/${item.product.slug}`}
                onClick={() => setIsOpen(false)}
                className="group block bg-slate-50 dark:bg-slate-800 rounded-xl p-4 hover:shadow-lg hover:shadow-rose-500/10 border-2 border-transparent hover:border-rose-500 transition-all"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="relative w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                    {item.product.images[0] ? (
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🛍️
                      </div>
                    )}
                    {item.product.salePrice && (
                      <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                        SALE
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {item.product.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      {item.product.category.name}
                    </p>
                    
                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-2">
                      {item.product.salePrice ? (
                        <>
                          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                            {formatPrice(item.product.salePrice)}
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            {formatPrice(item.product.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatPrice(item.product.price)}
                        </span>
                      )}
                    </div>

                    {/* Custom Note */}
                    {item.customNote && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 italic line-clamp-1">
                        💡 {item.customNote}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {products.length} sản phẩm được đề xuất
            </p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              Đóng
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

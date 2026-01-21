'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, ShoppingBag, Tag, ExternalLink } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  salePrice?: number;
  images: { url: string }[];
  category: { name: string; slug: string };
}

interface ProductSearchModalProps {
  onSelect: (
    productId: number,
    displayType: 'inline-card' | 'sidebar' | 'end-collection',
    customNote?: string
  ) => void;
  onClose: () => void;
}

export default function ProductSearchModal({ onSelect, onClose }: ProductSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customNote, setCustomNote] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // Fetch products
  const fetchProducts = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: query,
        limit: '20',
        isVisible: 'true',
      });
      const response = await fetch(`${baseUrl}/products?${params}`);
      const data = await response.json();
      setProducts(data.data || []); // Fix: API trả về data.data, không phải data.products
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    if (debouncedSearch) {
      fetchProducts(debouncedSearch);
    } else {
      // Load popular products khi mới mở
      fetchProducts('');
    }
  }, [debouncedSearch, fetchProducts]);

  const handleConfirm = () => {
    if (selectedProduct) {
      // Always use inline-card as default display type
      onSelect(selectedProduct.id, 'inline-card', customNote || undefined);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Chọn sản phẩm để nhúng
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tìm kiếm và chọn sản phẩm để thêm vào bài viết
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm theo tên..."
              className="w-full pl-12 pr-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Product List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse"
                  >
                    <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  {searchQuery ? 'Không tìm thấy sản phẩm' : 'Nhập tên sản phẩm để tìm kiếm'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full flex gap-4 p-4 border-2 rounded-xl transition-all text-left ${
                      selectedProduct?.id === product.id
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="relative w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-shrink-0">
                      {product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🛍️
                        </div>
                      )}
                      {product.salePrice && (
                        <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded">
                          Sale
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate mb-1">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                        <Tag className="w-3.5 h-3.5" />
                        <span>{product.category.name}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        {product.salePrice ? (
                          <>
                            <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
                              {formatPrice(product.salePrice)}
                            </span>
                            <span className="text-sm text-slate-400 line-through">
                              {formatPrice(product.price)}
                            </span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-slate-900 dark:text-white">
                            {formatPrice(product.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configuration Panel */}
          {selectedProduct && (
            <div className="w-80 border-l border-slate-200 dark:border-slate-800 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Cấu hình hiển thị
              </h3>

              {/* Custom Note */}
              <div className="mb-6">
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                  Ghi chú tùy chỉnh <span className="text-slate-400">(tùy chọn)</span>
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="VD: Perfect cho đêm hẹn hò!"
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Ghi chú này sẽ hiển thị cùng với sản phẩm trong bài viết
                </p>
              </div>

              {/* Preview */}
              <div className="mb-6">
                <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
                  Preview
                </label>
                <div className="p-4 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 rounded text-xs font-medium text-blue-600 dark:text-blue-400">
                      Inline Card
                    </div>
                  </div>
                  <div className="text-sm text-slate-900 dark:text-white font-medium line-clamp-2 mb-1">
                    {selectedProduct.name}
                  </div>
                  {customNote && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded">
                      💡 &ldquo;{customNote}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors shadow-lg shadow-rose-500/30"
                >
                  Xác nhận
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

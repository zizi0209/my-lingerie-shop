'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Loader2, AlertCircle, X, 
  FileText, Package, Link as LinkIcon, Save, Search
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '../components/LanguageContext';
import SearchInput from '../components/SearchInput';

interface Post {
  id: number;
  title: string;
  slug: string;
  thumbnail?: string;
  isPublished: boolean;
  category: {
    name: string;
  };
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  images: { url: string }[];
  category: {
    name: string;
  };
}

interface LinkedProduct {
  productId: number;
  displayType: 'inline-card' | 'sidebar' | 'end-collection';
  position?: number;
  customNote?: string;
  product: Product;
}

interface ProductFormData {
  productId: number;
  displayType: 'inline-card' | 'sidebar' | 'end-collection';
  customNote: string;
}

const ProductPosts: React.FC = () => {
  const { language } = useLanguage();
  
  // States
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [linkedProducts, setLinkedProducts] = useState<LinkedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Product search and add
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    productId: 0,
    displayType: 'inline-card',
    customNote: '',
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const t = {
    title: language === 'vi' ? 'Quản lý liên kết sản phẩm - bài viết' : 'Product-Post Links',
    subtitle: language === 'vi' ? 'Liên kết sản phẩm với bài viết để tăng tương tác' : 'Link products with posts to increase engagement',
    selectPost: language === 'vi' ? 'Chọn bài viết để quản lý' : 'Select a post to manage',
    linkedProducts: language === 'vi' ? 'Sản phẩm đã liên kết' : 'Linked Products',
    addProduct: language === 'vi' ? 'Thêm sản phẩm' : 'Add Product',
    searchProduct: language === 'vi' ? 'Tìm sản phẩm...' : 'Search products...',
    displayType: language === 'vi' ? 'Kiểu hiển thị' : 'Display Type',
    inlineCard: language === 'vi' ? 'Trong nội dung' : 'Inline Card',
    sidebar: language === 'vi' ? 'Thanh bên' : 'Sidebar',
    endCollection: language === 'vi' ? 'Cuối bài (Collection)' : 'End Collection',
    customNote: language === 'vi' ? 'Ghi chú tùy chỉnh' : 'Custom Note',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    remove: language === 'vi' ? 'Xóa' : 'Remove',
    noProducts: language === 'vi' ? 'Chưa có sản phẩm nào được liên kết' : 'No products linked yet',
    loading: language === 'vi' ? 'Đang tải...' : 'Loading...',
    published: language === 'vi' ? 'Đã xuất bản' : 'Published',
    draft: language === 'vi' ? 'Bản nháp' : 'Draft',
  };

  // Load posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<{ success: boolean; data: Post[] }>('/posts?limit=100');
        if (response.success) {
          setPosts(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError('Không thể tải danh sách bài viết');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // Load linked products when post is selected
  useEffect(() => {
    if (!selectedPost) return;
    
    const fetchLinkedProducts = async () => {
      try {
        const response = await api.get<{ success: boolean; data: LinkedProduct[] }>(
          `/product-posts/posts/${selectedPost.id}/products`
        );
        if (response.success) {
          setLinkedProducts(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch linked products:', err);
      }
    };
    fetchLinkedProducts();
  }, [selectedPost]);

  // Search products
  const handleSearchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await api.get<{ success: boolean; data: Product[] }>(
        `/products?search=${encodeURIComponent(query)}&limit=10`
      );
      if (response.success) {
        setSearchResults(response.data);
      }
    } catch (err) {
      console.error('Failed to search products:', err);
    } finally {
      setSearching(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearchProducts(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add product to post
  const handleAddProduct = async () => {
    if (!selectedPost || formData.productId === 0) return;

    try {
      setSaving(true);
      const response = await api.post('/product-posts/link', {
        postId: selectedPost.id,
        productId: formData.productId,
        displayType: formData.displayType,
        customNote: formData.customNote || null,
      });

      if ((response as any).success) {
        setSuccessMessage('Đã liên kết sản phẩm thành công!');
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Refresh linked products
        const refreshResponse = await api.get<{ success: boolean; data: LinkedProduct[] }>(
          `/product-posts/posts/${selectedPost.id}/products`
        );
        if (refreshResponse.success) {
          setLinkedProducts(refreshResponse.data);
        }
        
        // Reset form
        setShowAddModal(false);
        setFormData({
          productId: 0,
          displayType: 'inline-card',
          customNote: '',
        });
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Failed to link product:', err);
      alert('Không thể liên kết sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  // Remove product from post
  const handleRemoveProduct = async (productId: number) => {
    if (!selectedPost) return;
    if (!confirm('Bạn có chắc muốn xóa liên kết này?')) return;

    try {
      await api.delete(`/product-posts/unlink/${selectedPost.id}/${productId}`);
      setLinkedProducts(linkedProducts.filter(p => p.productId !== productId));
      setSuccessMessage('Đã xóa liên kết thành công!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to unlink product:', err);
      alert('Không thể xóa liên kết');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <LinkIcon className="w-6 h-6" />
          {t.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">{successMessage}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t.selectPost}
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {posts.map(post => (
                <button
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                    selectedPost?.id === post.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {post.thumbnail && (
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {post.category.name}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                        post.isPublished 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {post.isPublished ? t.published : t.draft}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Linked Products */}
        <div className="lg:col-span-2">
          {!selectedPost ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">{t.selectPost}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {t.linkedProducts}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    ({linkedProducts.length})
                  </span>
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t.addProduct}
                </button>
              </div>

              <div className="p-4">
                {linkedProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">{t.noProducts}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {linkedProducts.map(item => (
                      <div
                        key={item.productId}
                        className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <img
                          src={item.product.images[0]?.url || 'https://via.placeholder.com/100'}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {item.product.category.name} • {item.product.price.toLocaleString('vi-VN')}₫
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="inline-block px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {item.displayType === 'inline-card' && t.inlineCard}
                              {item.displayType === 'sidebar' && t.sidebar}
                              {item.displayType === 'end-collection' && t.endCollection}
                            </span>
                            {item.customNote && (
                              <span className="inline-block px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                {item.customNote}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveProduct(item.productId)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                          title={t.remove}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {t.addProduct}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                  setFormData({ productId: 0, displayType: 'inline-card', customNote: '' });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search Products */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.searchProduct}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchProduct}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Search Results */}
              {searching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setFormData({ ...formData, productId: product.id });
                        setSearchQuery(product.name);
                        setSearchResults([]);
                      }}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-3 ${
                        formData.productId === product.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <img
                        src={product.images[0]?.url || 'https://via.placeholder.com/50'}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {product.category.name} • {product.price.toLocaleString('vi-VN')}₫
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Product Info */}
              {formData.productId > 0 && searchResults.length === 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Đã chọn sản phẩm: {searchQuery}
                  </p>
                </div>
              )}

              {/* Display Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.displayType}
                </label>
                <select
                  value={formData.displayType}
                  onChange={(e) => setFormData({ ...formData, displayType: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="inline-card">{t.inlineCard}</option>
                  <option value="sidebar">{t.sidebar}</option>
                  <option value="end-collection">{t.endCollection}</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formData.displayType === 'inline-card' && 'Hiển thị xen kẽ trong nội dung bài viết'}
                  {formData.displayType === 'sidebar' && 'Hiển thị thanh bên cố định'}
                  {formData.displayType === 'end-collection' && 'Hiển thị dạng collection ở cuối bài'}
                </p>
              </div>

              {/* Custom Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.customNote}
                </label>
                <textarea
                  value={formData.customNote}
                  onChange={(e) => setFormData({ ...formData, customNote: e.target.value })}
                  rows={3}
                  placeholder="VD: Sản phẩm được đề cập trong bài viết..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddProduct}
                  disabled={saving || formData.productId === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition font-medium"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {t.save}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setFormData({ productId: 0, displayType: 'inline-card', customNote: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition font-medium"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPosts;

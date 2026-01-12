'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, AlertCircle, RefreshCw, Loader2, 
  Package, User, Clock, Eye, X
} from 'lucide-react';
import { cartTrackingApi, type Cart, type CartStatus, type CartStats } from '@/lib/cartTrackingApi';
import Pagination from '../components/Pagination';
import { useLanguage } from '../components/LanguageContext';

const CartTracking: React.FC = () => {
  const { language } = useLanguage();

  // States
  const [loading, setLoading] = useState(true);
  const [carts, setCarts] = useState<Cart[]>([]);
  const [stats, setStats] = useState<CartStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [statusFilter, setStatusFilter] = useState<CartStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCart, setSelectedCart] = useState<Cart | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Theo dõi giỏ hàng' : 'Cart Tracking',
    subtitle: language === 'vi' ? 'Giám sát và phục hồi doanh thu tiềm năng' : 'Monitor and recover potential revenue',
    refresh: language === 'vi' ? 'Làm mới' : 'Refresh',
    abandonedTotal: language === 'vi' ? 'Tổng giỏ hàng bỏ rơi' : 'Abandoned Value',
    abandonedCarts: language === 'vi' ? 'Giỏ hàng bỏ rơi' : 'Abandoned Carts',
    activeCarts: language === 'vi' ? 'Giỏ hàng mới' : 'New Carts',
    recoveredCarts: language === 'vi' ? 'Giỏ hàng phục hồi' : 'Recovered Carts',
    cartId: language === 'vi' ? 'ID' : 'Cart ID',
    customer: language === 'vi' ? 'Khách hàng' : 'Customer',
    items: language === 'vi' ? 'Sản phẩm' : 'Items',
    value: language === 'vi' ? 'Giá trị' : 'Value',
    status: language === 'vi' ? 'Trạng thái' : 'Status',
    activity: language === 'vi' ? 'Hoạt động' : 'Activity',
    actions: language === 'vi' ? 'Thao tác' : 'Actions',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noCarts: language === 'vi' ? 'Chưa có giỏ hàng nào' : 'No carts found',
    allStatus: language === 'vi' ? 'Tất cả' : 'All',
    active: language === 'vi' ? 'Mới' : 'New',
    abandoned: language === 'vi' ? 'Bỏ rơi' : 'Abandoned',
    recovered: language === 'vi' ? 'Phục hồi' : 'Recovered',
    empty: language === 'vi' ? 'Trống' : 'Empty',
    guest: language === 'vi' ? 'Khách vãng lai' : 'Guest',
    cartDetail: language === 'vi' ? 'Chi tiết giỏ hàng' : 'Cart Detail',
    close: language === 'vi' ? 'Đóng' : 'Close',
    cartItems: language === 'vi' ? 'Sản phẩm trong giỏ' : 'Cart Items',
    quantity: language === 'vi' ? 'SL' : 'Qty',
    price: language === 'vi' ? 'Giá' : 'Price',
    total: language === 'vi' ? 'Tổng' : 'Total',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    carts: language === 'vi' ? 'giỏ hàng' : 'carts',
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format relative time
  const formatRelativeTime = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return language === 'vi' ? 'Vừa xong' : 'Just now';
    if (diffMins < 60) return language === 'vi' ? `${diffMins} phút trước` : `${diffMins} mins ago`;
    if (diffHours < 24) return language === 'vi' ? `${diffHours} giờ trước` : `${diffHours} hours ago`;
    return language === 'vi' ? `${diffDays} ngày trước` : `${diffDays} days ago`;
  };

  // Status config
  const statusConfig: Record<CartStatus, { color: string; label: string }> = {
    active: { 
      color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', 
      label: t.active 
    },
    abandoned: { 
      color: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400', 
      label: t.abandoned 
    },
    recovered: { 
      color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', 
      label: t.recovered 
    },
    empty: { 
      color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400', 
      label: t.empty 
    },
  };

  // Fetch carts
  const fetchCarts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cartTrackingApi.list({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
      });

      if (response.success) {
        setCarts(response.data);
        setStats(response.stats);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch carts:', err);
      setError('Không thể tải danh sách giỏ hàng');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts, refreshTrigger]);

  // Get customer display name
  const getCustomerName = (cart: Cart): string => {
    if (cart.user) return cart.user.name;
    return t.guest;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>{t.refresh}</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-rose-50 dark:bg-rose-500/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-500/20 flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-rose-500 shadow-sm">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">{t.abandonedTotal}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">
                {formatCurrency(stats.abandonedValue)}
              </h3>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-amber-500 shadow-sm">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest">{t.abandonedCarts}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">
                {stats.abandonedCarts}
              </h3>
            </div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-emerald-500 shadow-sm">
              <RefreshCw size={24} />
            </div>
            <div>
              <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">{t.recoveredCarts}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">
                {stats.recoveredCarts}
              </h3>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex items-center gap-4">
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-blue-500 shadow-sm">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">{t.activeCarts}</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">
                {stats.activeCarts}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as CartStatus | '');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rose-500/20"
        >
          <option value="">{t.allStatus}</option>
          <option value="active">{t.active}</option>
          <option value="abandoned">{t.abandoned}</option>
          <option value="recovered">{t.recovered}</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-rose-500 shrink-0" size={20} />
          <p className="text-rose-700 dark:text-rose-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-rose-500" />
            <span className="ml-3 text-slate-500 font-medium">{t.loadingText}</span>
          </div>
        ) : carts.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noCarts}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">{t.cartId}</th>
                    <th className="px-6 py-4">{t.customer}</th>
                    <th className="px-6 py-4">{t.items}</th>
                    <th className="px-6 py-4">{t.value}</th>
                    <th className="px-6 py-4">{t.status}</th>
                    <th className="px-6 py-4">{t.activity}</th>
                    <th className="px-6 py-4 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {carts.map((cart) => (
                    <tr key={cart.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-200 text-sm">
                        #{cart.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                            <User size={14} className="text-slate-500" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{getCustomerName(cart)}</p>
                            {cart.user?.email && (
                              <p className="text-xs text-slate-400">{cart.user.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm font-medium">
                        {cart.totalItems} {t.items.toLowerCase()}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-200 text-sm">
                        {formatCurrency(cart.totalValue)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${statusConfig[cart.status].color}`}>
                          {statusConfig[cart.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Clock size={12} />
                          <span>{formatRelativeTime(cart.updatedAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCart(cart);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                  onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCart && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {t.cartDetail} #{selectedCart.id}
                </h2>
                <p className="text-sm text-slate-500">{getCustomerName(selectedCart)}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Info */}
              {selectedCart.user && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                      <User size={20} className="text-rose-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedCart.user.name}</p>
                      <p className="text-sm text-slate-500">{selectedCart.user.email}</p>
                      {selectedCart.user.phone && (
                        <p className="text-sm text-slate-500">{selectedCart.user.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.cartItems}</h3>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
                  {selectedCart.items.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <Package size={32} className="mx-auto mb-2 opacity-50" />
                      <p>{t.empty}</p>
                    </div>
                  ) : (
                    selectedCart.items.map((item) => (
                      <div key={item.id} className="p-4 flex gap-4">
                        <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          {item.product.images?.[0]?.url ? (
                            <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{item.product.name}</p>
                          {item.variant && (
                            <p className="text-xs text-slate-500">{item.variant.size} / {item.variant.color}</p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-500">{t.quantity}: {item.quantity}</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {formatCurrency((item.variant?.price || item.product.salePrice || item.product.price) * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="bg-rose-50 dark:bg-rose-500/10 rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-rose-600 dark:text-rose-400">{t.total}</span>
                <span className="text-xl font-black text-rose-600 dark:text-rose-400">
                  {formatCurrency(selectedCart.totalValue)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end shrink-0">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartTracking;

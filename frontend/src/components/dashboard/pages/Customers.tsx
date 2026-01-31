'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Loader2, AlertCircle, X, Users, Eye, 
  Mail, Phone, ShoppingBag, Calendar, Package, DollarSign
} from 'lucide-react';
import { api } from '@/lib/api';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { useLanguage } from '../components/LanguageContext';

interface CustomerOrder {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: Date;
}

interface Customer {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count?: {
    orders: number;
  };
  orders?: CustomerOrder[];
  totalSpent?: number;
}

interface PaginatedResponse {
  success: boolean;
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const Customers: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger] = useState(0);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Translations
  const t = {
    title: language === 'vi' ? 'Khách hàng' : 'Customers',
    subtitle: language === 'vi' ? 'Danh sách khách hàng đã mua hàng' : 'List of customers who have purchased',
    name: language === 'vi' ? 'Họ tên' : 'Full Name',
    email: 'Email',
    phone: language === 'vi' ? 'Số điện thoại' : 'Phone',
    orders: language === 'vi' ? 'Đơn hàng' : 'Orders',
    totalSpent: language === 'vi' ? 'Tổng chi tiêu' : 'Total Spent',
    lastOrder: language === 'vi' ? 'Đơn hàng cuối' : 'Last Order',
    memberSince: language === 'vi' ? 'Thành viên từ' : 'Member Since',
    loadError: language === 'vi' ? 'Không thể tải danh sách khách hàng' : 'Cannot load customers',
    customers: language === 'vi' ? 'khách hàng' : 'customers',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noCustomers: language === 'vi' ? 'Chưa có khách hàng nào' : 'No customers found',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    search: language === 'vi' ? 'Tìm theo tên hoặc email...' : 'Search by name or email...',
    customerDetail: language === 'vi' ? 'Chi tiết khách hàng' : 'Customer Detail',
    close: language === 'vi' ? 'Đóng' : 'Close',
    orderHistory: language === 'vi' ? 'Lịch sử đơn hàng' : 'Order History',
    noOrders: language === 'vi' ? 'Chưa có đơn hàng nào' : 'No orders yet',
    totalCustomers: language === 'vi' ? 'Tổng khách hàng' : 'Total Customers',
    totalRevenue: language === 'vi' ? 'Tổng doanh thu' : 'Total Revenue',
    avgOrderValue: language === 'vi' ? 'Giá trị TB/đơn' : 'Avg Order Value',
    guest: language === 'vi' ? 'Khách' : 'Guest',
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format date
  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Order status config
  const statusConfig: Record<string, { color: string; label: string }> = {
    PENDING: { color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', label: language === 'vi' ? 'Chờ xử lý' : 'Pending' },
    CONFIRMED: { color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', label: language === 'vi' ? 'Đã xác nhận' : 'Confirmed' },
    SHIPPING: { color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400', label: language === 'vi' ? 'Đang giao' : 'Shipping' },
    COMPLETED: { color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', label: language === 'vi' ? 'Hoàn thành' : 'Completed' },
    CANCELLED: { color: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400', label: language === 'vi' ? 'Đã hủy' : 'Cancelled' },
  };

  // Fetch customers (users with orders)
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      queryParams.set('page', pagination.page.toString());
      queryParams.set('limit', pagination.limit.toString());
      if (searchQuery) queryParams.set('search', searchQuery);
      queryParams.set('role', 'USER'); // Only customers, not staff
      queryParams.set('hasOrders', 'true');

      const response = await api.get<PaginatedResponse>(`/admin/users?${queryParams.toString()}`);

      if (response.success) {
        setCustomers(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, t.loadError]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers, refreshTrigger]);

  // Fetch customer detail
  const handleViewDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
    setLoadingDetail(true);

    try {
      const response = await api.get<{ success: boolean; data: Customer }>(`/users/${customer.id}`);
      if (response.success) {
        setSelectedCustomer(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch customer detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Calculate stats
  const stats = {
    totalCustomers: pagination.total,
    totalRevenue: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0),
    totalOrders: customers.reduce((sum, c) => sum + (c._count?.orders || 0), 0),
  };
  const avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-blue-500 shadow-sm">
            <Users size={24} />
          </div>
          <div>
            <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">{t.totalCustomers}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalCustomers}</h3>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-emerald-500 shadow-sm">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">{t.totalRevenue}</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</h3>
          </div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-500/10 p-5 rounded-2xl border border-purple-100 dark:border-purple-500/20 flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-purple-500 shadow-sm">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest">{t.avgOrderValue}</p>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">{formatCurrency(avgOrderValue)}</h3>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.search}
        />
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
        ) : customers.length === 0 ? (
          <div className="text-center py-20">
            <Users size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noCustomers}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">{t.name}</th>
                    <th className="px-6 py-4">{t.phone}</th>
                    <th className="px-6 py-4">{t.orders}</th>
                    <th className="px-6 py-4">{t.totalSpent}</th>
                    <th className="px-6 py-4">{t.memberSince}</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {customer.name?.[0]?.toUpperCase() || customer.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{customer.name || t.guest}</p>
                            <p className="text-xs text-slate-400 truncate">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Phone size={12} />
                            <span className="text-sm">{customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-900 dark:text-white">{customer._count?.orders || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(customer.totalSpent || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                          <Calendar size={12} />
                          <span>{formatDate(customer.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewDetail(customer)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="View Detail"
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
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{t.customerDetail}</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-rose-500" />
                </div>
              ) : (
                <>
                  {/* Customer Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                      {selectedCustomer.name?.[0]?.toUpperCase() || selectedCustomer.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {selectedCustomer.name || t.guest}
                      </h3>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Mail size={14} />
                          <span className="text-sm">{selectedCustomer.email}</span>
                        </div>
                        {selectedCustomer.phone && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Phone size={14} />
                            <span className="text-sm">{selectedCustomer.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar size={14} />
                          <span className="text-sm">{t.memberSince}: {formatDate(selectedCustomer.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.orders}</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {selectedCustomer._count?.orders || selectedCustomer.orders?.length || 0}
                      </p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl">
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{t.totalSpent}</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatCurrency(selectedCustomer.totalSpent || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Order History */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.orderHistory}</h4>
                    {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
                      <div className="space-y-2">
                        {selectedCustomer.orders.map((order) => (
                          <div key={order.id} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center">
                                <Package size={18} className="text-slate-400" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">#{order.orderNumber}</p>
                                <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</p>
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusConfig[order.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                                {statusConfig[order.status]?.label || order.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
                        <p>{t.noOrders}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
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

export default Customers;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Filter, Eye, Loader2, AlertCircle, X, Package, Truck, 
  CheckCircle, XCircle, Clock, CreditCard, MapPin, Phone, User, Hash
} from 'lucide-react';
import { orderApi, type Order, type OrderStatus, type PaymentStatus, type UpdateOrderData } from '@/lib/orderApi';
import SearchInput from '../components/SearchInput';
import { useLanguage } from '../components/LanguageContext';

const Orders: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Detail modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Update states
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý đơn hàng' : 'Order Management',
    subtitle: language === 'vi' ? 'Theo dõi và xử lý đơn hàng' : 'Track and fulfill customer orders',
    search: language === 'vi' ? 'Tìm theo mã đơn, khách hàng...' : 'Search by order ID, customer...',
    allStatus: language === 'vi' ? 'Tất cả trạng thái' : 'All Status',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noOrders: language === 'vi' ? 'Chưa có đơn hàng nào' : 'No orders found',
    orderId: language === 'vi' ? 'Mã đơn' : 'Order ID',
    customer: language === 'vi' ? 'Khách hàng' : 'Customer',
    date: language === 'vi' ? 'Ngày đặt' : 'Date',
    total: language === 'vi' ? 'Tổng tiền' : 'Total',
    status: language === 'vi' ? 'Trạng thái' : 'Status',
    actions: language === 'vi' ? 'Thao tác' : 'Actions',
    orderDetail: language === 'vi' ? 'Chi tiết đơn hàng' : 'Order Detail',
    close: language === 'vi' ? 'Đóng' : 'Close',
    shippingInfo: language === 'vi' ? 'Thông tin giao hàng' : 'Shipping Info',
    paymentInfo: language === 'vi' ? 'Thanh toán' : 'Payment',
    orderItems: language === 'vi' ? 'Sản phẩm' : 'Items',
    updateStatus: language === 'vi' ? 'Cập nhật trạng thái' : 'Update Status',
    trackingNumber: language === 'vi' ? 'Mã vận đơn' : 'Tracking Number',
    notes: language === 'vi' ? 'Ghi chú' : 'Notes',
    save: language === 'vi' ? 'Lưu' : 'Save',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    cancelOrder: language === 'vi' ? 'Hủy đơn hàng' : 'Cancel Order',
    confirmCancel: language === 'vi' ? 'Bạn có chắc chắn muốn hủy đơn hàng này?' : 'Are you sure you want to cancel this order?',
    updateSuccess: language === 'vi' ? 'Cập nhật thành công!' : 'Updated successfully!',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    orders: language === 'vi' ? 'đơn hàng' : 'orders',
    guest: language === 'vi' ? 'Khách vãng lai' : 'Guest',
    subtotal: language === 'vi' ? 'Tạm tính' : 'Subtotal',
    shippingFee: language === 'vi' ? 'Phí vận chuyển' : 'Shipping Fee',
    discount: language === 'vi' ? 'Giảm giá' : 'Discount',
    grandTotal: language === 'vi' ? 'Tổng cộng' : 'Grand Total',
    quantity: language === 'vi' ? 'SL' : 'Qty',
    price: language === 'vi' ? 'Giá' : 'Price',
    variant: language === 'vi' ? 'Biến thể' : 'Variant',
    // Statuses
    PENDING: language === 'vi' ? 'Chờ xác nhận' : 'Pending',
    CONFIRMED: language === 'vi' ? 'Đã xác nhận' : 'Confirmed',
    SHIPPING: language === 'vi' ? 'Đang giao' : 'Shipping',
    COMPLETED: language === 'vi' ? 'Hoàn thành' : 'Completed',
    CANCELLED: language === 'vi' ? 'Đã hủy' : 'Cancelled',
    // Payment statuses
    paymentPending: language === 'vi' ? 'Chờ thanh toán' : 'Pending',
    paymentPaid: language === 'vi' ? 'Đã thanh toán' : 'Paid',
    paymentRefunded: language === 'vi' ? 'Đã hoàn tiền' : 'Refunded',
  };

  // Status config
  const statusConfig: Record<OrderStatus, { color: string; icon: React.ReactNode; label: string }> = {
    PENDING: { 
      color: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400', 
      icon: <Clock size={14} />,
      label: t.PENDING 
    },
    CONFIRMED: { 
      color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400', 
      icon: <CheckCircle size={14} />,
      label: t.CONFIRMED 
    },
    SHIPPING: { 
      color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400', 
      icon: <Truck size={14} />,
      label: t.SHIPPING 
    },
    COMPLETED: { 
      color: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', 
      icon: <CheckCircle size={14} />,
      label: t.COMPLETED 
    },
    CANCELLED: { 
      color: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400', 
      icon: <XCircle size={14} />,
      label: t.CANCELLED 
    },
  };

  const paymentStatusConfig: Record<PaymentStatus, { color: string; label: string }> = {
    PENDING: { color: 'text-amber-600 dark:text-amber-400', label: t.paymentPending },
    PAID: { color: 'text-emerald-600 dark:text-emerald-400', label: t.paymentPaid },
    REFUNDED: { color: 'text-slate-600 dark:text-slate-400', label: t.paymentRefunded },
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderApi.list({
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter || undefined,
      });

      if (response.success) {
        let filtered = response.data;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = response.data.filter(order => 
            order.orderNumber.toLowerCase().includes(query) ||
            order.user?.name?.toLowerCase().includes(query) ||
            order.user?.email?.toLowerCase().includes(query) ||
            order.guestInfo?.name?.toLowerCase().includes(query) ||
            order.shippingPhone.includes(query)
          );
        }
        setOrders(filtered);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders, refreshTrigger]);

  // Get customer name
  const getCustomerName = (order: Order): string => {
    if (order.user) return order.user.name;
    if (order.guestInfo?.name) return order.guestInfo.name;
    return t.guest;
  };

  // Open detail modal
  const handleViewDetail = async (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    // Fetch full detail
    setLoadingDetail(true);
    try {
      const response = await orderApi.getById(order.id);
      if (response.success) {
        setSelectedOrder(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch order detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Update order status
  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!selectedOrder) return;

    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const response = await orderApi.update(selectedOrder.id, { status: newStatus });
      if (response.success) {
        setSelectedOrder(response.data);
        setUpdateSuccess(t.updateSuccess);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Update error:', err);
      setUpdateError('Không thể cập nhật trạng thái');
    } finally {
      setUpdating(false);
    }
  };

  // Update tracking number
  const handleUpdateTracking = async (trackingNumber: string) => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const response = await orderApi.update(selectedOrder.id, { trackingNumber });
      if (response.success) {
        setSelectedOrder(response.data);
        setUpdateSuccess(t.updateSuccess);
      }
    } catch (err) {
      console.error('Update error:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!confirm(t.confirmCancel)) return;

    setUpdating(true);
    setUpdateError(null);

    try {
      const response = await orderApi.cancel(selectedOrder.id);
      if (response.success) {
        setSelectedOrder(response.data);
        setUpdateSuccess(t.updateSuccess);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setUpdateError('Không thể hủy đơn hàng');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t.search}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">{t.allStatus}</option>
            <option value="PENDING">{t.PENDING}</option>
            <option value="CONFIRMED">{t.CONFIRMED}</option>
            <option value="SHIPPING">{t.SHIPPING}</option>
            <option value="COMPLETED">{t.COMPLETED}</option>
            <option value="CANCELLED">{t.CANCELLED}</option>
          </select>
        </div>
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
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noOrders}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">{t.orderId}</th>
                    <th className="px-6 py-4">{t.customer}</th>
                    <th className="px-6 py-4">{t.date}</th>
                    <th className="px-6 py-4">{t.total}</th>
                    <th className="px-6 py-4">{t.status}</th>
                    <th className="px-6 py-4 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-black text-slate-900 dark:text-slate-200 text-sm">{order.orderNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{getCustomerName(order)}</p>
                          <p className="text-xs text-slate-400">{order.shippingPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-xs font-medium">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-black text-rose-600 dark:text-rose-400 text-sm">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${statusConfig[order.status].color}`}>
                          {statusConfig[order.status].icon}
                          {statusConfig[order.status].label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewDetail(order)}
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
              <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500">
                  {t.page} {pagination.page} / {pagination.pages} ({pagination.total} {t.orders})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {t.prev}
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {t.next}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Hash size={20} />
                  {selectedOrder.orderNumber}
                </h2>
                <p className="text-sm text-slate-500">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-rose-500" />
                </div>
              ) : (
                <>
                  {/* Messages */}
                  {updateError && (
                    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3 flex items-center gap-2">
                      <AlertCircle className="text-rose-500 shrink-0" size={16} />
                      <p className="text-rose-700 dark:text-rose-400 text-sm">{updateError}</p>
                    </div>
                  )}
                  {updateSuccess && (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle className="text-emerald-500 shrink-0" size={16} />
                      <p className="text-emerald-700 dark:text-emerald-400 text-sm">{updateSuccess}</p>
                    </div>
                  )}

                  {/* Status & Actions */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${statusConfig[selectedOrder.status].color}`}>
                      {statusConfig[selectedOrder.status].icon}
                      {statusConfig[selectedOrder.status].label}
                    </div>

                    {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                      <div className="flex items-center gap-2">
                        {selectedOrder.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateStatus('CONFIRMED')}
                            disabled={updating}
                            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-xl text-sm font-bold flex items-center gap-2"
                          >
                            {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            {t.CONFIRMED}
                          </button>
                        )}
                        {selectedOrder.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleUpdateStatus('SHIPPING')}
                            disabled={updating}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-xl text-sm font-bold flex items-center gap-2"
                          >
                            {updating ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                            {t.SHIPPING}
                          </button>
                        )}
                        {selectedOrder.status === 'SHIPPING' && (
                          <button
                            onClick={() => handleUpdateStatus('COMPLETED')}
                            disabled={updating}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-xl text-sm font-bold flex items-center gap-2"
                          >
                            {updating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            {t.COMPLETED}
                          </button>
                        )}
                        <button
                          onClick={handleCancelOrder}
                          disabled={updating}
                          className="px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold flex items-center gap-2"
                        >
                          <XCircle size={14} />
                          {t.cancelOrder}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Customer & Shipping Info */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.shippingInfo}</h3>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <User size={16} className="text-slate-400 mt-0.5" />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{getCustomerName(selectedOrder)}</p>
                            {selectedOrder.user?.email && (
                              <p className="text-sm text-slate-500">{selectedOrder.user.email}</p>
                            )}
                            {selectedOrder.guestInfo?.email && (
                              <p className="text-sm text-slate-500">{selectedOrder.guestInfo.email}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone size={16} className="text-slate-400 mt-0.5" />
                          <p className="text-sm text-slate-700 dark:text-slate-300">{selectedOrder.shippingPhone}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin size={16} className="text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{selectedOrder.shippingAddress}</p>
                            {selectedOrder.shippingCity && (
                              <p className="text-sm text-slate-500">{selectedOrder.shippingCity}</p>
                            )}
                          </div>
                        </div>
                        {selectedOrder.notes && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">{t.notes}</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{selectedOrder.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Payment Info */}
                      <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.paymentInfo}</h3>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">Phương thức</span>
                          <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.paymentMethod}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-500">Trạng thái</span>
                          <span className={`font-bold ${paymentStatusConfig[selectedOrder.paymentStatus].color}`}>
                            {paymentStatusConfig[selectedOrder.paymentStatus].label}
                          </span>
                        </div>
                        {selectedOrder.trackingNumber && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="text-sm text-slate-500">{t.trackingNumber}</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedOrder.trackingNumber}</span>
                          </div>
                        )}
                      </div>

                      {/* Tracking Input */}
                      {selectedOrder.status === 'SHIPPING' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.trackingNumber}</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              defaultValue={selectedOrder.trackingNumber || ''}
                              placeholder="VD: GHTK123456789"
                              className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20"
                              onBlur={(e) => {
                                if (e.target.value !== selectedOrder.trackingNumber) {
                                  handleUpdateTracking(e.target.value);
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.orderItems}</h3>
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
                        {selectedOrder.items.map((item) => (
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
                                <p className="text-xs text-slate-500">{item.variant}</p>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-slate-500">{t.quantity}: {item.quantity}</span>
                                <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary */}
                      <div className="bg-rose-50 dark:bg-rose-500/10 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{t.subtotal}</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {formatCurrency(selectedOrder.totalAmount - selectedOrder.shippingFee + selectedOrder.discount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">{t.shippingFee}</span>
                          <span className="font-medium text-slate-900 dark:text-white">
                            {formatCurrency(selectedOrder.shippingFee)}
                          </span>
                        </div>
                        {selectedOrder.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{t.discount}</span>
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              -{formatCurrency(selectedOrder.discount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-black pt-2 border-t border-rose-200 dark:border-rose-500/30">
                          <span className="text-rose-600 dark:text-rose-400">{t.grandTotal}</span>
                          <span className="text-rose-600 dark:text-rose-400">{formatCurrency(selectedOrder.totalAmount)}</span>
                        </div>
                      </div>
                    </div>
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

export default Orders;

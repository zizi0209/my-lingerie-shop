'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, CheckCircle,
  Ticket, Percent, Tag, Calendar, Users, TrendingUp, Copy, Eye
} from 'lucide-react';
import { couponApi, campaignApi, type Coupon, type Campaign } from '@/lib/couponApi';
import SearchInput from '../components/SearchInput';
import { useLanguage } from '../components/LanguageContext';

interface CouponFormData {
  code: string;
  name: string;
  description: string;
  discountType: string;
  discountValue: string;
  maxDiscount: string;
  minOrderValue: string;
  quantity: string;
  maxUsagePerUser: string;
  couponType: string;
  isPublic: boolean;
  startDate: string;
  endDate: string;
  campaignId: string;
  isActive: boolean;
}

const initialFormData: CouponFormData = {
  code: '',
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxDiscount: '',
  minOrderValue: '',
  quantity: '',
  maxUsagePerUser: '1',
  couponType: 'PUBLIC',
  isPublic: true,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  campaignId: '',
  isActive: true,
};

const Coupons: React.FC = () => {
  const { language } = useLanguage();

  // List states
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý mã giảm giá' : 'Coupon Management',
    subtitle: language === 'vi' ? 'Tạo và quản lý voucher, mã khuyến mãi' : 'Create and manage vouchers, promo codes',
    addNew: language === 'vi' ? 'Thêm mã' : 'Add Coupon',
    edit: language === 'vi' ? 'Sửa mã giảm giá' : 'Edit Coupon',
    code: language === 'vi' ? 'Mã giảm giá' : 'Coupon Code',
    name: language === 'vi' ? 'Tên mã' : 'Name',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    discountType: language === 'vi' ? 'Loại giảm' : 'Discount Type',
    discountValue: language === 'vi' ? 'Giá trị' : 'Value',
    maxDiscount: language === 'vi' ? 'Giảm tối đa' : 'Max Discount',
    minOrder: language === 'vi' ? 'Đơn tối thiểu' : 'Min Order',
    quantity: language === 'vi' ? 'Số lượng' : 'Quantity',
    maxPerUser: language === 'vi' ? 'Tối đa/người' : 'Max per User',
    couponType: language === 'vi' ? 'Phân loại' : 'Type',
    isPublic: language === 'vi' ? 'Công khai' : 'Public',
    startDate: language === 'vi' ? 'Ngày bắt đầu' : 'Start Date',
    endDate: language === 'vi' ? 'Ngày kết thúc' : 'End Date',
    campaign: language === 'vi' ? 'Chiến dịch' : 'Campaign',
    active: language === 'vi' ? 'Kích hoạt' : 'Active',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Xác nhận xóa mã giảm giá này?' : 'Delete this coupon?',
    loadError: language === 'vi' ? 'Không thể tải dữ liệu' : 'Cannot load data',
    noData: language === 'vi' ? 'Chưa có mã giảm giá nào' : 'No coupons found',
    search: language === 'vi' ? 'Tìm theo mã hoặc tên...' : 'Search by code or name...',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    deleteSuccess: language === 'vi' ? 'Đã xóa!' : 'Deleted!',
    used: language === 'vi' ? 'Đã dùng' : 'Used',
    unlimited: language === 'vi' ? 'Không giới hạn' : 'Unlimited',
    allTypes: language === 'vi' ? 'Tất cả loại' : 'All Types',
    percentage: language === 'vi' ? 'Phần trăm' : 'Percentage',
    fixedAmount: language === 'vi' ? 'Số tiền cố định' : 'Fixed Amount',
    freeShipping: language === 'vi' ? 'Miễn phí ship' : 'Free Shipping',
    newUser: language === 'vi' ? 'Thành viên mới' : 'New User',
    public: language === 'vi' ? 'Công khai' : 'Public',
    private: language === 'vi' ? 'Riêng tư' : 'Private',
    product: language === 'vi' ? 'Theo sản phẩm' : 'Product',
    shipping: language === 'vi' ? 'Vận chuyển' : 'Shipping',
    noCampaign: language === 'vi' ? 'Không có chiến dịch' : 'No Campaign',
    copied: language === 'vi' ? 'Đã copy!' : 'Copied!',
  };

  // Discount type labels
  const discountTypeLabels: Record<string, string> = {
    PERCENTAGE: t.percentage,
    FIXED_AMOUNT: t.fixedAmount,
    FREE_SHIPPING: t.freeShipping,
    BUY_X_GET_Y: 'Buy X Get Y',
  };

  // Coupon type labels
  const couponTypeLabels: Record<string, string> = {
    NEW_USER: t.newUser,
    PUBLIC: t.public,
    PRIVATE: t.private,
    PRODUCT: t.product,
    SHIPPING: t.shipping,
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [couponsRes, campaignsRes] = await Promise.all([
        couponApi.list({
          page: pagination.page,
          limit: pagination.limit,
          search: searchQuery || undefined,
          couponType: typeFilter || undefined,
        }),
        campaignApi.list({ limit: 100 }),
      ]);

      if (couponsRes.success) {
        setCoupons(couponsRes.data);
        setPagination(couponsRes.pagination);
      }
      if (campaignsRes.success) {
        setCampaigns(campaignsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, typeFilter, t.loadError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate code from name
  const generateCode = (name: string): string => {
    return name
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'D')
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 15);
  };

  // Open create modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(initialFormData);
    setFormError(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue) : '',
      quantity: coupon.quantity ? String(coupon.quantity) : '',
      maxUsagePerUser: String(coupon.maxUsagePerUser),
      couponType: coupon.couponType,
      isPublic: coupon.isPublic,
      startDate: coupon.startDate.split('T')[0],
      endDate: coupon.endDate ? coupon.endDate.split('T')[0] : '',
      campaignId: coupon.campaignId ? String(coupon.campaignId) : '',
      isActive: coupon.isActive,
    });
    setFormError(null);
    setShowModal(true);
  };

  // Handle form change
  const handleFormChange = (field: keyof CouponFormData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto generate code from name
      if (field === 'name' && !editingCoupon && typeof value === 'string') {
        updated.code = generateCode(value);
      }
      return updated;
    });
  };

  // Save coupon
  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.discountValue) {
      setFormError(language === 'vi' ? 'Vui lòng điền đầy đủ thông tin bắt buộc' : 'Please fill required fields');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: Partial<Coupon> = {
        code: formData.code,
        name: formData.name,
        description: formData.description || null,
        discountType: formData.discountType as Coupon['discountType'],
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : null,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        maxUsagePerUser: Number(formData.maxUsagePerUser) || 1,
        couponType: formData.couponType as Coupon['couponType'],
        isPublic: formData.isPublic,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        campaignId: formData.campaignId ? Number(formData.campaignId) : null,
        isActive: formData.isActive,
      };

      if (editingCoupon) {
        await couponApi.update(editingCoupon.id, payload);
      } else {
        await couponApi.create(payload);
      }

      setSuccessMessage(t.saveSuccess);
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowModal(false);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // Delete coupon
  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      setDeletingId(id);
      await couponApi.delete(id);
      setSuccessMessage(t.deleteSuccess);
      setTimeout(() => setSuccessMessage(null), 3000);
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccessMessage(t.copied);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Format discount display
  const formatDiscount = (coupon: Coupon) => {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}%${coupon.maxDiscount ? ` (max ${formatCurrency(coupon.maxDiscount)})` : ''}`;
    }
    if (coupon.discountType === 'FIXED_AMOUNT') {
      return formatCurrency(coupon.discountValue);
    }
    if (coupon.discountType === 'FREE_SHIPPING') {
      return t.freeShipping;
    }
    return String(coupon.discountValue);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-7 h-7 text-primary" />
            {t.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t.addNew}
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t.search}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="">{t.allTypes}</option>
          {Object.entries(couponTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noData}</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.code}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.name}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.discountType}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.discountValue}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.used}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.couponType}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t.active}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                            {coupon.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(coupon.code)}
                            className="text-gray-400 hover:text-primary"
                            title="Copy"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{coupon.name}</div>
                        {coupon.campaign && (
                          <div className="text-xs text-gray-500">{coupon.campaign.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-sm">
                          {coupon.discountType === 'PERCENTAGE' && <Percent className="w-4 h-4" />}
                          {coupon.discountType === 'FIXED_AMOUNT' && <Tag className="w-4 h-4" />}
                          {discountTypeLabels[coupon.discountType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-primary">
                        {formatDiscount(coupon)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {coupon.usedCount} / {coupon.quantity || '∞'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          coupon.couponType === 'NEW_USER' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          coupon.couponType === 'PRIVATE' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {couponTypeLabels[coupon.couponType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {coupon.isActive ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(coupon.id)}
                            disabled={deletingId === coupon.id}
                            className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {deletingId === coupon.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                ←
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCoupon ? t.edit : t.addNew}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.code} *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                    placeholder="VD: SALE50K"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.name} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Giảm 50K cho đơn đầu"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.description}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Discount Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.discountType} *
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => handleFormChange('discountType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="PERCENTAGE">{t.percentage}</option>
                    <option value="FIXED_AMOUNT">{t.fixedAmount}</option>
                    <option value="FREE_SHIPPING">{t.freeShipping}</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.discountValue} * {formData.discountType === 'PERCENTAGE' ? '(%)' : '(VND)'}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => handleFormChange('discountValue', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '50000'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Max Discount */}
                {formData.discountType === 'PERCENTAGE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.maxDiscount} (VND)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) => handleFormChange('maxDiscount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="100000"
                    />
                  </div>
                )}

                {/* Min Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.minOrder} (VND)
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) => handleFormChange('minOrderValue', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="300000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.quantity}
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => handleFormChange('quantity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t.unlimited}
                  />
                </div>

                {/* Max per User */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.maxPerUser}
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsagePerUser}
                    onChange={(e) => handleFormChange('maxUsagePerUser', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="1"
                  />
                </div>

                {/* Coupon Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.couponType}
                  </label>
                  <select
                    value={formData.couponType}
                    onChange={(e) => handleFormChange('couponType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(couponTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.startDate}
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleFormChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.endDate}
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleFormChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Campaign */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.campaign}
                </label>
                <select
                  value={formData.campaignId}
                  onChange={(e) => handleFormChange('campaignId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{t.noCampaign}</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => handleFormChange('isPublic', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t.isPublic}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleFormChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t.active}</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;

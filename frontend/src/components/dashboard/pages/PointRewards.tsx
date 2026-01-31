'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, CheckCircle,
  Gift, Coins
} from 'lucide-react';
import { pointRewardApi, type PointReward } from '@/lib/couponApi';
import { useLanguage } from '../components/LanguageContext';

interface RewardFormData {
  name: string;
  description: string;
  pointCost: string;
  rewardType: string;
  discountValue: string;
  discountType: string;
  quantity: string;
  maxPerUser: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
}

const initialFormData: RewardFormData = {
  name: '',
  description: '',
  pointCost: '',
  rewardType: 'DISCOUNT',
  discountValue: '',
  discountType: 'FIXED_AMOUNT',
  quantity: '',
  maxPerUser: '',
  isActive: true,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
};

const PointRewards: React.FC = () => {
  const { language } = useLanguage();

  // List states
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<PointReward | null>(null);
  const [formData, setFormData] = useState<RewardFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Kho quà đổi điểm' : 'Point Rewards',
    subtitle: language === 'vi' ? 'Quản lý quà/voucher đổi từ điểm tích lũy' : 'Manage rewards redeemable with points',
    addNew: language === 'vi' ? 'Thêm quà' : 'Add Reward',
    edit: language === 'vi' ? 'Sửa quà' : 'Edit Reward',
    name: language === 'vi' ? 'Tên quà' : 'Reward Name',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    pointCost: language === 'vi' ? 'Số điểm cần' : 'Points Required',
    rewardType: language === 'vi' ? 'Loại quà' : 'Reward Type',
    discountValue: language === 'vi' ? 'Giá trị giảm' : 'Discount Value',
    discountType: language === 'vi' ? 'Loại giảm' : 'Discount Type',
    quantity: language === 'vi' ? 'Số lượng' : 'Quantity',
    maxPerUser: language === 'vi' ? 'Tối đa/người' : 'Max per User',
    active: language === 'vi' ? 'Kích hoạt' : 'Active',
    startDate: language === 'vi' ? 'Ngày bắt đầu' : 'Start Date',
    endDate: language === 'vi' ? 'Ngày kết thúc' : 'End Date',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Xác nhận xóa quà này?' : 'Delete this reward?',
    loadError: language === 'vi' ? 'Không thể tải dữ liệu' : 'Cannot load data',
    noData: language === 'vi' ? 'Chưa có quà nào' : 'No rewards found',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    deleteSuccess: language === 'vi' ? 'Đã xóa!' : 'Deleted!',
    redeemed: language === 'vi' ? 'Đã đổi' : 'Redeemed',
    unlimited: language === 'vi' ? 'Không giới hạn' : 'Unlimited',
    voucher: 'Voucher',
    gift: language === 'vi' ? 'Quà tặng' : 'Gift',
    discount: language === 'vi' ? 'Giảm giá' : 'Discount',
    percentage: language === 'vi' ? 'Phần trăm' : 'Percentage',
    fixedAmount: language === 'vi' ? 'Số tiền cố định' : 'Fixed Amount',
    points: language === 'vi' ? 'điểm' : 'points',
  };

  // Reward type labels
  const rewardTypeLabels: Record<string, string> = {
    VOUCHER: t.voucher,
    GIFT: t.gift,
    DISCOUNT: t.discount,
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await pointRewardApi.list({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response.success) {
        setRewards(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, t.loadError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open create modal
  const handleOpenCreate = () => {
    setEditingReward(null);
    setFormData(initialFormData);
    setFormError(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (reward: PointReward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      pointCost: String(reward.pointCost),
      rewardType: reward.rewardType,
      discountValue: reward.discountValue ? String(reward.discountValue) : '',
      discountType: reward.discountType || 'FIXED_AMOUNT',
      quantity: reward.quantity ? String(reward.quantity) : '',
      maxPerUser: reward.maxPerUser ? String(reward.maxPerUser) : '',
      isActive: reward.isActive,
      startDate: reward.startDate.split('T')[0],
      endDate: reward.endDate ? reward.endDate.split('T')[0] : '',
    });
    setFormError(null);
    setShowModal(true);
  };

  // Handle form change
  const handleFormChange = (field: keyof RewardFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Save reward
  const handleSave = async () => {
    if (!formData.name || !formData.pointCost || !formData.rewardType) {
      setFormError(language === 'vi' ? 'Vui lòng điền đầy đủ thông tin' : 'Please fill all fields');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: Partial<PointReward> = {
        name: formData.name,
        description: formData.description || null,
        pointCost: Number(formData.pointCost),
        rewardType: formData.rewardType as PointReward['rewardType'],
        discountValue: formData.discountValue ? Number(formData.discountValue) : null,
        discountType: formData.discountType || null,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        maxPerUser: formData.maxPerUser ? Number(formData.maxPerUser) : null,
        isActive: formData.isActive,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
      };

      if (editingReward) {
        await pointRewardApi.update(editingReward.id, payload);
      } else {
        await pointRewardApi.create(payload);
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

  // Delete reward
  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      setDeletingId(id);
      await pointRewardApi.delete(id);
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

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gift className="w-7 h-7 text-primary" />
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
      ) : rewards.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noData}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow p-5 hover:shadow-lg transition-shadow ${
                !reward.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{reward.name}</h3>
                    <span className="text-xs text-gray-500">{rewardTypeLabels[reward.rewardType]}</span>
                  </div>
                </div>
                {!reward.isActive && (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    {t.active}: Off
                  </span>
                )}
              </div>

              {reward.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                  {reward.description}
                </p>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 text-primary font-semibold">
                  <Coins className="w-5 h-5" />
                  {reward.pointCost} {t.points}
                </div>
                {reward.discountValue && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {reward.discountType === 'PERCENTAGE' 
                      ? `${reward.discountValue}%` 
                      : formatCurrency(reward.discountValue)}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  {t.redeemed}: {reward.redeemedCount} / {reward.quantity || '∞'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(reward)}
                    className="p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    disabled={deletingId === reward.id}
                    className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {deletingId === reward.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingReward ? t.edit : t.addNew}
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
                  placeholder="VD: Voucher giảm 50K"
                />
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
                {/* Point Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.pointCost} *
                  </label>
                  <input
                    type="number"
                    value={formData.pointCost}
                    onChange={(e) => handleFormChange('pointCost', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="500"
                  />
                </div>

                {/* Reward Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.rewardType} *
                  </label>
                  <select
                    value={formData.rewardType}
                    onChange={(e) => handleFormChange('rewardType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {Object.entries(rewardTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.rewardType === 'DISCOUNT' && (
                <div className="grid grid-cols-2 gap-4">
                  {/* Discount Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.discountType}
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => handleFormChange('discountType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="FIXED_AMOUNT">{t.fixedAmount}</option>
                      <option value="PERCENTAGE">{t.percentage}</option>
                    </select>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t.discountValue}
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
              )}

              <div className="grid grid-cols-2 gap-4">
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
                    value={formData.maxPerUser}
                    onChange={(e) => handleFormChange('maxPerUser', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={t.unlimited}
                  />
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

              {/* Active */}
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

export default PointRewards;

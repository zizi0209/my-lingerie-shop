'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, CheckCircle,
  Megaphone, Calendar, Ticket
} from 'lucide-react';
import { campaignApi, type Campaign } from '@/lib/couponApi';
import SearchInput from '../components/SearchInput';
import { useLanguage } from '../components/LanguageContext';

interface CampaignFormData {
  name: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const initialFormData: CampaignFormData = {
  name: '',
  slug: '',
  description: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  isActive: true,
};

const Campaigns: React.FC = () => {
  const { language } = useLanguage();

  // List states
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý chiến dịch' : 'Campaign Management',
    subtitle: language === 'vi' ? 'Tạo chiến dịch khuyến mãi theo mùa/sự kiện' : 'Create seasonal/event promotions',
    addNew: language === 'vi' ? 'Thêm chiến dịch' : 'Add Campaign',
    edit: language === 'vi' ? 'Sửa chiến dịch' : 'Edit Campaign',
    name: language === 'vi' ? 'Tên chiến dịch' : 'Campaign Name',
    slug: language === 'vi' ? 'Slug (URL)' : 'Slug (URL)',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    startDate: language === 'vi' ? 'Ngày bắt đầu' : 'Start Date',
    endDate: language === 'vi' ? 'Ngày kết thúc' : 'End Date',
    active: language === 'vi' ? 'Kích hoạt' : 'Active',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Xác nhận xóa chiến dịch này?' : 'Delete this campaign?',
    loadError: language === 'vi' ? 'Không thể tải dữ liệu' : 'Cannot load data',
    noData: language === 'vi' ? 'Chưa có chiến dịch nào' : 'No campaigns found',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    deleteSuccess: language === 'vi' ? 'Đã xóa!' : 'Deleted!',
    coupons: language === 'vi' ? 'mã giảm giá' : 'coupons',
    status: language === 'vi' ? 'Trạng thái' : 'Status',
    running: language === 'vi' ? 'Đang chạy' : 'Running',
    upcoming: language === 'vi' ? 'Sắp tới' : 'Upcoming',
    ended: language === 'vi' ? 'Đã kết thúc' : 'Ended',
    inactive: language === 'vi' ? 'Tạm dừng' : 'Inactive',
  };

  // Generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Get campaign status
  const getCampaignStatus = (campaign: Campaign) => {
    if (!campaign.isActive) return { label: t.inactive, color: 'gray' };
    const now = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    if (now < start) return { label: t.upcoming, color: 'blue' };
    if (now > end) return { label: t.ended, color: 'red' };
    return { label: t.running, color: 'green' };
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await campaignApi.list({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response.success) {
        setCampaigns(response.data);
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
    setEditingCampaign(null);
    setFormData(initialFormData);
    setFormError(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description || '',
      startDate: campaign.startDate.split('T')[0],
      endDate: campaign.endDate.split('T')[0],
      isActive: campaign.isActive,
    });
    setFormError(null);
    setShowModal(true);
  };

  // Handle form change
  const handleFormChange = (field: keyof CampaignFormData, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'name' && !editingCampaign && typeof value === 'string') {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  // Save campaign
  const handleSave = async () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      setFormError(language === 'vi' ? 'Vui lòng điền đầy đủ thông tin' : 'Please fill all fields');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive,
      };

      if (editingCampaign) {
        await campaignApi.update(editingCampaign.id, payload);
      } else {
        await campaignApi.create(payload);
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

  // Delete campaign
  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      setDeletingId(id);
      await campaignApi.delete(id);
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

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary" />
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
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noData}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => {
            const status = getCampaignStatus(campaign);
            return (
              <div
                key={campaign.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    status.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    status.color === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    status.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {status.label}
                  </span>
                </div>

                {campaign.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {campaign.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Ticket className="w-4 h-4" />
                    {campaign._count?.coupons || 0} {t.coupons}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(campaign)}
                      className="p-2 text-gray-500 hover:text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      disabled={deletingId === campaign.id}
                      className="p-2 text-gray-500 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {deletingId === campaign.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingCampaign ? t.edit : t.addNew}
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
                  placeholder="VD: Sale Tết 2024"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t.slug}
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleFormChange('slug', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="sale-tet-2024"
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
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t.startDate} *
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
                    {t.endDate} *
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

export default Campaigns;

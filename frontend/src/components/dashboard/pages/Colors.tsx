'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Loader2, AlertCircle, X, CheckCircle, Palette } from 'lucide-react';
import { colorApi, type Color, type CreateColorData, type UpdateColorData } from '@/lib/colorApi';
import SearchInput from '../components/SearchInput';
import { useLanguage } from '../components/LanguageContext';

interface ColorFormData {
  name: string;
  hexCode: string;
  isActive: boolean;
}

const initialFormData: ColorFormData = {
  name: '',
  hexCode: '#000000',
  isActive: true,
};

const Colors: React.FC = () => {
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [colors, setColors] = useState<Color[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editingColor, setEditingColor] = useState<Color | null>(null);
  const [formData, setFormData] = useState<ColorFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const t = {
    title: language === 'vi' ? 'Quản lý màu sắc' : 'Color Management',
    subtitle: language === 'vi' ? 'Thuộc tính màu sắc cho sản phẩm' : 'Color attributes for products',
    addNew: language === 'vi' ? 'Thêm màu' : 'Add Color',
    edit: language === 'vi' ? 'Sửa màu' : 'Edit Color',
    name: language === 'vi' ? 'Tên màu' : 'Color Name',
    hexCode: language === 'vi' ? 'Mã màu' : 'Hex Code',
    isActive: language === 'vi' ? 'Hiển thị' : 'Active',
    order: language === 'vi' ? 'Thứ tự' : 'Order',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Bạn có chắc chắn muốn xóa màu này?' : 'Are you sure you want to delete this color?',
    deleteError: language === 'vi' ? 'Không thể xóa màu' : 'Cannot delete color',
    loadError: language === 'vi' ? 'Không thể tải danh sách màu' : 'Cannot load colors',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noColors: language === 'vi' ? 'Chưa có màu nào' : 'No colors found',
    variants: language === 'vi' ? 'biến thể' : 'variants',
    search: language === 'vi' ? 'Tìm theo tên...' : 'Search by name...',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    hasVariants: language === 'vi' ? 'Màu đang được sử dụng, không thể xóa' : 'Color is in use, cannot delete',
    active: language === 'vi' ? 'Đang hoạt động' : 'Active',
    inactive: language === 'vi' ? 'Tạm ẩn' : 'Inactive',
    pickColor: language === 'vi' ? 'Chọn màu' : 'Pick color',
  };

  const fetchColors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await colorApi.list();

      if (response.success) {
        let filtered = response.data;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = response.data.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.hexCode.toLowerCase().includes(query)
          );
        }
        setColors(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch colors:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, t.loadError]);

  useEffect(() => {
    fetchColors();
  }, [fetchColors, refreshTrigger]);

  const handleOpenCreate = () => {
    setEditingColor(null);
    setFormData(initialFormData);
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  const handleOpenEdit = (color: Color) => {
    setEditingColor(color);
    setFormData({
      name: color.name,
      hexCode: color.hexCode,
      isActive: color.isActive,
    });
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      if (editingColor) {
        const updateData: UpdateColorData = {
          name: formData.name,
          hexCode: formData.hexCode,
          isActive: formData.isActive,
        };
        await colorApi.update(editingColor.id, updateData);
      } else {
        const createData: CreateColorData = {
          name: formData.name,
          hexCode: formData.hexCode,
          isActive: formData.isActive,
        };
        await colorApi.create(createData);
      }

      setSuccessMessage(t.saveSuccess);
      setTimeout(() => {
        setShowModal(false);
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (err) {
      console.error('Save error:', err);
      const message = err instanceof Error ? err.message : 'Lỗi khi lưu màu sắc';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, variantCount: number) => {
    if (variantCount > 0) {
      alert(t.hasVariants);
      return;
    }
    if (!confirm(t.confirmDelete)) return;

    setDeletingId(id);
    try {
      await colorApi.delete(id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Delete error:', err);
      alert(t.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
            {t.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
        >
          <Plus size={18} />
          <span>{t.addNew}</span>
        </button>
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

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-rose-500" />
          <span className="ml-3 text-slate-500 font-medium">{t.loadingText}</span>
        </div>
      ) : colors.length === 0 ? (
        <div className="text-center py-20">
          <Palette size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noColors}</p>
        </div>
      ) : (
        /* Colors Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {colors.map((color) => (
            <div
              key={color.id}
              className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-500 dark:hover:border-rose-500 transition-all group"
            >
              {/* Color Preview */}
              <div 
                className="w-full aspect-square rounded-xl mb-3 border border-slate-200 dark:border-slate-700 shadow-inner"
                style={{ backgroundColor: color.hexCode }}
              />

              {/* Info */}
              <div className="text-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {color.name}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono uppercase">
                  {color.hexCode}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className={`w-2 h-2 rounded-full ${color.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-[10px] text-slate-400">
                    {color._count?.variants || 0} {t.variants}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenEdit(color)}
                  className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => handleDelete(color.id, color._count?.variants || 0)}
                  disabled={deletingId === color.id}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                >
                  {deletingId === color.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingColor ? t.edit : t.addNew}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Messages */}
              {formError && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="text-rose-500 shrink-0" size={20} />
                  <p className="text-rose-700 dark:text-rose-400 text-sm font-medium">{formError}</p>
                </div>
              )}
              {successMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-emerald-500 shrink-0" size={20} />
                  <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">{successMessage}</p>
                </div>
              )}

              {/* Color Preview & Picker */}
              <div className="flex items-center gap-4">
                <div 
                  className="w-20 h-20 rounded-xl border-2 border-slate-200 dark:border-slate-700 shadow-inner shrink-0"
                  style={{ backgroundColor: formData.hexCode }}
                />
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {t.pickColor}
                  </label>
                  <input
                    type="color"
                    value={formData.hexCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, hexCode: e.target.value.toUpperCase() }))}
                    className="w-full h-10 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.name} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Hồng phấn, Đen tuyền, Trắng ngà..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                />
              </div>

              {/* Hex Code */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {t.hexCode} *
                </label>
                <input
                  type="text"
                  value={formData.hexCode}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase();
                    if (!value.startsWith('#')) value = '#' + value;
                    setFormData(prev => ({ ...prev, hexCode: value }));
                  }}
                  required
                  pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                  placeholder="#FF0000"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-mono"
                />
              </div>

              {/* Active Toggle */}
              <label className="flex items-center justify-between py-3 cursor-pointer">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.isActive}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 dark:bg-slate-600 peer-checked:bg-emerald-500 rounded-full transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                </div>
              </label>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Colors;

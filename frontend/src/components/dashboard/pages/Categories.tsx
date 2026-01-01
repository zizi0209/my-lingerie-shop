'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, 
  Image as ImageIcon, CheckCircle, FolderOpen, Package, Upload
} from 'lucide-react';
import { categoryApi, type Category, type CreateCategoryData, type UpdateCategoryData } from '@/lib/categoryApi';
import { api } from '@/lib/api';
import SearchInput from '../components/SearchInput';
import { useLanguage } from '../components/LanguageContext';
import { 
  compressImage, 
  type CompressedImage, 
  formatFileSize, 
  revokePreviewUrls,
  ACCEPTED_IMAGE_TYPES 
} from '@/lib/imageUtils';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image: string;
}

const initialFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  image: '',
};

const Categories: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Image upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState<CompressedImage | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý danh mục' : 'Category Management',
    subtitle: language === 'vi' ? 'Phân loại sản phẩm của bạn' : 'Organize your products into categories',
    addNew: language === 'vi' ? 'Thêm danh mục' : 'Add Category',
    edit: language === 'vi' ? 'Sửa danh mục' : 'Edit Category',
    name: language === 'vi' ? 'Tên danh mục' : 'Category Name',
    slug: language === 'vi' ? 'Slug (URL)' : 'Slug (URL)',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    image: language === 'vi' ? 'Hình ảnh' : 'Image',
    imageUrl: language === 'vi' ? 'URL hình ảnh' : 'Image URL',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Bạn có chắc chắn muốn xóa danh mục này?' : 'Are you sure you want to delete this category?',
    deleteError: language === 'vi' ? 'Không thể xóa danh mục' : 'Cannot delete category',
    loadError: language === 'vi' ? 'Không thể tải danh sách danh mục' : 'Cannot load categories',
    categories: language === 'vi' ? 'danh mục' : 'categories',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noCategories: language === 'vi' ? 'Chưa có danh mục nào' : 'No categories found',
    products: language === 'vi' ? 'sản phẩm' : 'products',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    search: language === 'vi' ? 'Tìm theo tên...' : 'Search by name...',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    deleteSuccess: language === 'vi' ? 'Đã xóa danh mục!' : 'Category deleted!',
    uploadImage: language === 'vi' ? 'Tải ảnh lên' : 'Upload Image',
    selectFile: language === 'vi' ? 'Chọn file hoặc kéo thả' : 'Select file or drag & drop',
    compressing: language === 'vi' ? 'Đang nén ảnh...' : 'Compressing...',
    uploading: language === 'vi' ? 'Đang tải lên...' : 'Uploading...',
    webpOptimized: language === 'vi' ? 'Tự động chuyển WebP' : 'Auto-converted to WebP',
    clearImage: language === 'vi' ? 'Xóa ảnh' : 'Clear image',
    hasProducts: language === 'vi' ? 'Danh mục có sản phẩm, không thể xóa' : 'Category has products, cannot delete',
  };

  // Generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoryApi.list({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response.success) {
        let filtered = response.data;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = response.data.filter(cat => 
            cat.name.toLowerCase().includes(query) ||
            cat.slug.toLowerCase().includes(query)
          );
        }
        setCategories(filtered);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, t.loadError]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, refreshTrigger]);

  // Open create modal
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setUploadingImage(null);
    setFormData(initialFormData);
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setUploadingImage(null);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
    });
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Handle file select for image upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setUploadingImage(compressed);
    } catch (err) {
      console.error('Compression error:', err);
      setFormError('Không thể nén ảnh');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload image to server
  const handleUploadImage = async (): Promise<string | null> => {
    if (!uploadingImage) return formData.image || null;

    setIsUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', uploadingImage.file);
      uploadFormData.append('folder', 'categories');

      const response = await api.uploadFile<{ success: boolean; data: { url: string } }>(
        '/media/single',
        uploadFormData
      );

      if (response.success && response.data?.url) {
        return response.data.url;
      }
      return null;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      // Upload image if pending
      let imageUrl = formData.image;
      if (uploadingImage) {
        const uploadedUrl = await handleUploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      if (editingCategory) {
        // Update category
        const updateData: UpdateCategoryData = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          image: imageUrl || undefined,
        };
        await categoryApi.update(editingCategory.id, updateData);
      } else {
        // Create category
        const createData: CreateCategoryData = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          image: imageUrl || undefined,
        };
        await categoryApi.create(createData);
      }

      setSuccessMessage(t.saveSuccess);
      if (uploadingImage) {
        revokePreviewUrls([uploadingImage]);
        setUploadingImage(null);
      }
      
      setTimeout(() => {
        setShowModal(false);
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (err) {
      console.error('Save error:', err);
      const message = err instanceof Error ? err.message : 'Lỗi khi lưu danh mục';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const handleDelete = async (id: number, productCount: number) => {
    if (productCount > 0) {
      alert(t.hasProducts);
      return;
    }
    if (!confirm(t.confirmDelete)) return;

    setDeletingId(id);
    try {
      await categoryApi.delete(id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Delete error:', err);
      alert(t.deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  // Clear uploaded image
  const handleClearImage = () => {
    if (uploadingImage) {
      revokePreviewUrls([uploadingImage]);
      setUploadingImage(null);
    }
    setFormData(prev => ({ ...prev, image: '' }));
  };

  // Cleanup on modal close
  useEffect(() => {
    if (!showModal && uploadingImage) {
      revokePreviewUrls([uploadingImage]);
      setUploadingImage(null);
    }
  }, [showModal, uploadingImage]);

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
      ) : categories.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noCategories}</p>
        </div>
      ) : (
        <>
          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-rose-500 dark:hover:border-rose-500 transition-all group"
              >
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FolderOpen size={24} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors uppercase tracking-tight truncate">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">/{cat.slug}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Package size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {cat._count?.products || 0} {t.products}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat._count?.products || 0)}
                      disabled={deletingId === cat.id}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                    >
                      {deletingId === cat.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Description */}
                {cat.description && (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {cat.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <p className="text-sm text-slate-500">
                {t.page} {pagination.page} / {pagination.pages} ({pagination.total} {t.categories})
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingCategory ? t.edit : t.addNew}
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

              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.name} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      name,
                      slug: !editingCategory ? generateSlug(name) : prev.slug,
                    }));
                  }}
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.slug} *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium font-mono"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.description}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                />
              </div>

              {/* Image */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.image}</label>
                
                {/* Current/Preview Image */}
                {(uploadingImage || formData.image) && (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img 
                      src={uploadingImage?.preview || formData.image} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                    >
                      <X size={12} />
                    </button>
                    {uploadingImage && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] px-2 py-1 text-center">
                        <span className="text-emerald-400">{formatFileSize(uploadingImage.compressedSize)}</span>
                        <span className="text-slate-400 ml-1">(-{uploadingImage.reduction.toFixed(0)}%)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Zone */}
                {!uploadingImage && !formData.image && (
                  <div 
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-rose-400 dark:hover:border-rose-500 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {isCompressing ? (
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-sm font-medium">{t.compressing}</span>
                      </div>
                    ) : (
                      <div className="text-slate-500">
                        <Upload size={28} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-medium">{t.selectFile}</p>
                        <p className="text-xs opacity-70 mt-1">{t.webpOptimized}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Or URL Input */}
                {!uploadingImage && (
                  <div className="flex items-center gap-2">
                    <ImageIcon size={18} className="text-slate-400 shrink-0" />
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 text-sm"
                    />
                  </div>
                )}
              </div>

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
                  disabled={saving || isUploading}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl flex items-center gap-2"
                >
                  {(saving || isUploading) && <Loader2 size={16} className="animate-spin" />}
                  {isUploading ? t.uploading : saving ? t.saving : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

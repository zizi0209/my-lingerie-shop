'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, 
  FolderOpen, CheckCircle, FileText
} from 'lucide-react';
import { postCategoryApi, type PostCategory } from '@/lib/postApi';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { useLanguage } from '../components/LanguageContext';

interface FormData {
  name: string;
  slug: string;
}

const initialFormData: FormData = {
  name: '',
  slug: '',
};

const PostCategories: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<(PostCategory & { _count?: { posts: number } })[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PostCategory | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Danh mục bài viết' : 'Post Categories',
    subtitle: language === 'vi' ? 'Quản lý danh mục cho blog' : 'Manage categories for your blog',
    addNew: language === 'vi' ? 'Thêm danh mục' : 'Add Category',
    edit: language === 'vi' ? 'Sửa danh mục' : 'Edit Category',
    name: language === 'vi' ? 'Tên danh mục' : 'Category Name',
    slug: language === 'vi' ? 'Slug (URL)' : 'Slug (URL)',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Bạn có chắc chắn muốn xóa danh mục này?' : 'Are you sure you want to delete this category?',
    loadError: language === 'vi' ? 'Không thể tải danh sách danh mục' : 'Cannot load categories',
    categories: language === 'vi' ? 'danh mục' : 'categories',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noCategories: language === 'vi' ? 'Chưa có danh mục nào' : 'No categories found',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    search: language === 'vi' ? 'Tìm theo tên...' : 'Search by name...',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    posts: language === 'vi' ? 'bài viết' : 'posts',
    namePlaceholder: language === 'vi' ? 'Ví dụ: Tin tức' : 'Example: News',
    slugPlaceholder: language === 'vi' ? 'Ví dụ: tin-tuc' : 'Example: news',
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

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await postCategoryApi.list({
        page: pagination.page,
        limit: pagination.limit,
      });

      if (response.success) {
        let filteredData = response.data;
        if (searchQuery) {
          filteredData = response.data.filter(cat => 
            cat.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        setCategories(filteredData as (PostCategory & { _count?: { posts: number } })[]);
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
    setFormData(initialFormData);
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (category: PostCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
    });
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formData.name?.trim() || !formData.slug?.trim()) {
      setFormError(language === 'vi' ? 'Vui lòng điền đầy đủ tên và slug' : 'Please fill in name and slug');
      return;
    }

    setSaving(true);

    try {
      if (editingCategory) {
        await postCategoryApi.update(editingCategory.id, {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
        });
      } else {
        await postCategoryApi.create({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
        });
      }

      setSuccessMessage(t.saveSuccess);
      setTimeout(() => {
        setShowModal(false);
        setRefreshTrigger(prev => prev + 1);
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    setDeletingId(id);
    try {
      await postCategoryApi.delete(id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Delete error:', err);
      const message = err instanceof Error ? err.message : 'Không thể xóa danh mục';
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
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

      {/* Table */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">{t.name}</th>
                    <th className="px-6 py-4">{t.slug}</th>
                    <th className="px-6 py-4">{t.posts}</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4 text-slate-400 text-sm font-mono">
                        #{category.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                            <FolderOpen size={18} className="text-rose-500" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">{category.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400">
                          /{category.slug}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <FileText size={14} />
                          <span className="text-sm font-medium">{category._count?.posts || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(category)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            disabled={deletingId === category.id || (category._count?.posts || 0) > 0}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            title={(category._count?.posts || 0) > 0 ? (language === 'vi' ? 'Không thể xóa vì có bài viết' : 'Cannot delete: has posts') : ''}
                          >
                            {deletingId === category.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
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
                  placeholder={t.namePlaceholder}
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
                  placeholder={t.slugPlaceholder}
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
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

export default PostCategories;

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Loader2, AlertCircle, X, 
  FileText, CheckCircle, Eye, EyeOff, Calendar, User, Upload, Image as ImageIcon
} from 'lucide-react';
import { postApi, postCategoryApi, type Post, type PostCategory, type CreatePostData, type UpdatePostData } from '@/lib/postApi';
import { api } from '@/lib/api';
import SearchInput from '../components/SearchInput';
import Pagination from '../components/Pagination';
import { useLanguage } from '../components/LanguageContext';
import { 
  compressImage, 
  type CompressedImage, 
  formatFileSize, 
  revokePreviewUrls,
  ACCEPTED_IMAGE_TYPES 
} from '@/lib/imageUtils';
import { LexicalEditor } from '@/components/editor';

interface PostFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  thumbnail: string;
  categoryId: string;
  isPublished: boolean;
  adEnabled: boolean;
  adDelaySeconds: number;
}

const initialFormData: PostFormData = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  thumbnail: '',
  categoryId: '',
  isPublished: false,
  adEnabled: false,
  adDelaySeconds: Math.floor(Math.random() * 3) + 8, // Random 8-10 giây
};

const Posts: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [publishedFilter, setPublishedFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [formData, setFormData] = useState<PostFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete states
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Image upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState<CompressedImage | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Current user (for authorId)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý bài viết' : 'Post Management',
    subtitle: language === 'vi' ? 'Viết bài marketing thu hút khách hàng' : 'Write marketing posts to attract customers',
    addNew: language === 'vi' ? 'Thêm bài viết' : 'Add Post',
    edit: language === 'vi' ? 'Sửa bài viết' : 'Edit Post',
    postTitle: language === 'vi' ? 'Tiêu đề' : 'Title',
    slug: language === 'vi' ? 'Slug (URL)' : 'Slug (URL)',
    content: language === 'vi' ? 'Nội dung' : 'Content',
    excerpt: language === 'vi' ? 'Tóm tắt' : 'Excerpt',
    thumbnail: language === 'vi' ? 'Ảnh đại diện' : 'Thumbnail',
    category: language === 'vi' ? 'Danh mục' : 'Category',
    selectCategory: language === 'vi' ? 'Chọn danh mục' : 'Select category',
    published: language === 'vi' ? 'Đã xuất bản' : 'Published',
    draft: language === 'vi' ? 'Bản nháp' : 'Draft',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Bạn có chắc chắn muốn xóa bài viết này?' : 'Are you sure you want to delete this post?',
    loadError: language === 'vi' ? 'Không thể tải danh sách bài viết' : 'Cannot load posts',
    posts: language === 'vi' ? 'bài viết' : 'posts',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noPosts: language === 'vi' ? 'Chưa có bài viết nào' : 'No posts found',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    search: language === 'vi' ? 'Tìm theo tiêu đề...' : 'Search by title...',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    allCategories: language === 'vi' ? 'Tất cả danh mục' : 'All Categories',
    allStatus: language === 'vi' ? 'Tất cả trạng thái' : 'All Status',
    views: language === 'vi' ? 'lượt xem' : 'views',
    author: language === 'vi' ? 'Tác giả' : 'Author',
    uploadImage: language === 'vi' ? 'Tải ảnh lên' : 'Upload Image',
    selectFile: language === 'vi' ? 'Chọn file' : 'Select file',
    compressing: language === 'vi' ? 'Đang nén...' : 'Compressing...',
    clearImage: language === 'vi' ? 'Xóa ảnh' : 'Clear',
  };

  // Generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await postCategoryApi.list({ limit: 100 });
        if (response.success) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Get current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get<{ success: boolean; data: { id: number } }>('/users/profile');
        if (response.success) {
          setCurrentUserId(response.data.id);
        }
      } catch (err) {
        console.error('Failed to get current user:', err);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await postApi.list({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        isPublished: publishedFilter ? publishedFilter === 'true' : undefined,
      });

      if (response.success) {
        setPosts(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, categoryFilter, publishedFilter, t.loadError]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshTrigger]);

  // Open create modal
  const handleOpenCreate = () => {
    setEditingPost(null);
    setUploadingImage(null);
    setFormData(initialFormData);
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (post: Post) => {
    setEditingPost(post);
    setUploadingImage(null);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      thumbnail: post.thumbnail || '',
      categoryId: post.categoryId.toString(),
      isPublished: post.isPublished,
      adEnabled: post.adEnabled ?? false,
      adDelaySeconds: post.adDelaySeconds ?? (Math.floor(Math.random() * 3) + 8), // Random 8-10 giây
    });
    setFormError(null);
    setSuccessMessage(null);
    setShowModal(true);
  };

  // Handle file select
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

  // Upload thumbnail
  const uploadThumbnail = async (): Promise<string | null> => {
    if (!uploadingImage) return formData.thumbnail || null;

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', uploadingImage.file);
      uploadFormData.append('folder', 'posts');

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
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!currentUserId) {
      setFormError('Không thể xác định người dùng hiện tại');
      return;
    }

    if (!formData.title?.trim() || !formData.slug?.trim() || !formData.content?.trim() || !formData.categoryId) {
      setFormError('Vui lòng điền đầy đủ: Tiêu đề, Slug, Nội dung và Danh mục');
      return;
    }

    setSaving(true);

    try {
      // Upload thumbnail if pending
      let thumbnailUrl = formData.thumbnail;
      if (uploadingImage) {
        const uploadedUrl = await uploadThumbnail();
        if (uploadedUrl) {
          thumbnailUrl = uploadedUrl;
        }
      }

      if (editingPost) {
        const updateData: UpdatePostData = {
          title: formData.title.trim(),
          slug: formData.slug.trim(),
          content: formData.content.trim(),
          excerpt: formData.excerpt?.trim() || undefined,
          thumbnail: thumbnailUrl || undefined,
          categoryId: parseInt(formData.categoryId),
          isPublished: formData.isPublished,
          adEnabled: formData.adEnabled,
          adDelaySeconds: formData.adDelaySeconds,
        };
        await postApi.update(editingPost.id, updateData);
      } else {
        const createData: CreatePostData = {
          title: formData.title.trim(),
          slug: formData.slug.trim(),
          content: formData.content.trim(),
          excerpt: formData.excerpt?.trim() || undefined,
          thumbnail: thumbnailUrl || undefined,
          authorId: currentUserId,
          categoryId: parseInt(formData.categoryId),
          isPublished: formData.isPublished,
          adEnabled: formData.adEnabled,
          adDelaySeconds: formData.adDelaySeconds,
        };
        await postApi.create(createData);
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
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // Delete post
  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    setDeletingId(id);
    try {
      await postApi.delete(id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Không thể xóa bài viết');
    } finally {
      setDeletingId(null);
    }
  };

  // Clear thumbnail
  const handleClearThumbnail = () => {
    if (uploadingImage) {
      revokePreviewUrls([uploadingImage]);
      setUploadingImage(null);
    }
    setFormData(prev => ({ ...prev, thumbnail: '' }));
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t.search}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="">{t.allCategories}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <select
          value={publishedFilter}
          onChange={(e) => {
            setPublishedFilter(e.target.value);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none"
        >
          <option value="">{t.allStatus}</option>
          <option value="true">{t.published}</option>
          <option value="false">{t.draft}</option>
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
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t.noPosts}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">{t.postTitle}</th>
                    <th className="px-6 py-4">{t.category}</th>
                    <th className="px-6 py-4">{t.author}</th>
                    <th className="px-6 py-4">{t.views}</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                            {post.thumbnail ? (
                              <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText size={20} className="text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{post.title}</p>
                            <p className="text-xs text-slate-400 font-mono truncate">/{post.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400">
                          {post.category.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{post.author.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {post.views.toLocaleString()} {t.views}
                      </td>
                      <td className="px-6 py-4">
                        {post.isPublished ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-500/20 rounded-full text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">
                            <Eye size={12} />
                            {t.published}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                            <EyeOff size={12} />
                            {t.draft}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(post)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            disabled={deletingId === post.id}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg disabled:opacity-50"
                          >
                            {deletingId === post.id ? (
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingPost ? t.edit : t.addNew}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-5">
                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.postTitle} *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          title,
                          slug: !editingPost ? generateSlug(title) : prev.slug,
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

                  {/* Content */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.content} *</label>
                    <LexicalEditor
                      initialValue={formData.content}
                      onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                      placeholder={language === 'vi' ? 'Nội dung bài viết chi tiết...' : 'Write your post content here...'}
                      minHeight="300px"
                    />
                  </div>

                  {/* Excerpt */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.excerpt}</label>
                    <textarea
                      value={formData.excerpt}
                      onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                      rows={3}
                      placeholder={language === 'vi' ? 'Tóm tắt ngắn gọn về bài viết...' : 'A short summary of the post...'}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                    />
                  </div>
                </div>

                {/* Right Column - Settings */}
                <div className="space-y-5">
                  {/* Thumbnail */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.thumbnail}</label>
                    
                    {(uploadingImage || formData.thumbnail) && (
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img 
                          src={uploadingImage?.preview || formData.thumbnail} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={handleClearThumbnail}
                          className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
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

                    {!uploadingImage && !formData.thumbnail && (
                      <div 
                        className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center hover:border-rose-400 transition-colors cursor-pointer"
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
                            <span className="text-sm">{t.compressing}</span>
                          </div>
                        ) : (
                          <div className="text-slate-500">
                            <Upload size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">{t.selectFile}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {!uploadingImage && (
                      <div className="flex items-center gap-2">
                        <ImageIcon size={16} className="text-slate-400 shrink-0" />
                        <input
                          type="url"
                          value={formData.thumbnail}
                          onChange={(e) => setFormData(prev => ({ ...prev, thumbnail: e.target.value }))}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.category} *</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 dark:text-slate-200 font-medium"
                    >
                      <option value="">{t.selectCategory}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Published Toggle */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {language === 'vi' ? 'Xuất bản' : 'Publish'}
                    </label>
                    <div 
                      onClick={() => setFormData(prev => ({ ...prev, isPublished: !prev.isPublished }))}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        formData.isPublished 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                            formData.isPublished ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              formData.isPublished ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </div>
                          <span className={`text-sm font-bold ${
                            formData.isPublished 
                              ? 'text-emerald-700 dark:text-emerald-400' 
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {formData.isPublished ? t.published : t.draft}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {formData.isPublished 
                          ? (language === 'vi' ? 'Bài viết sẽ hiển thị công khai trên website' : 'Post will be visible publicly on the website')
                          : (language === 'vi' ? 'Bài viết sẽ được lưu dưới dạng bản nháp' : 'Post will be saved as a draft')
                        }
                      </p>
                    </div>
                  </div>

                  {/* Ad Configuration */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {language === 'vi' ? 'Quảng cáo sản phẩm' : 'Product Ads'}
                    </label>
                    
                    {/* Ad Enable Toggle */}
                    <div 
                      onClick={() => setFormData(prev => ({ ...prev, adEnabled: !prev.adEnabled }))}
                      className={`p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        formData.adEnabled 
                          ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30' 
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                            formData.adEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                          }`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                              formData.adEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </div>
                          <span className={`text-sm font-bold ${
                            formData.adEnabled 
                              ? 'text-blue-700 dark:text-blue-400' 
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {formData.adEnabled 
                              ? (language === 'vi' ? 'Popup quảng cáo BẬT' : 'Ad Popup ON') 
                              : (language === 'vi' ? 'Popup quảng cáo TẮT' : 'Ad Popup OFF')
                            }
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {formData.adEnabled 
                          ? (language === 'vi' ? 'Sẽ hiển thị popup quảng cáo sản phẩm khi người dùng đọc bài viết' : 'Will show product ad popup when users read the post')
                          : (language === 'vi' ? 'Không hiển thị popup quảng cáo' : 'No ad popup will be shown')
                        }
                      </p>
                    </div>

                    {/* Ad Delay Config */}
                    {formData.adEnabled && (
                      <div className="pt-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {language === 'vi' 
                            ? '⏱️ Popup sẽ tự động xuất hiện sau 8-10 giây khi người dùng đọc bài viết' 
                            : '⏱️ Popup will automatically appear after 8-10 seconds when users read the post'
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 rounded-xl flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Posts;

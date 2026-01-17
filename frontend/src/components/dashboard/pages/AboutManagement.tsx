'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, Loader2, AlertCircle, CheckCircle, Eye, EyeOff,
  FileText, Image as ImageIcon, Type, AlignLeft, Hash, RefreshCw,
  Upload, Link as LinkIcon, X
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '../components/LanguageContext';
import dynamic from 'next/dynamic';
import { 
  compressImage, 
  validateImageFile, 
  formatFileSize,
  type CompressedImage 
} from '@/lib/imageUtils';
import Image from 'next/image';

const LexicalEditor = dynamic(() => import('@/components/editor/LexicalEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 min-h-[150px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  ),
});

interface AboutSection {
  id: number;
  sectionKey: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SECTION_LABELS: Record<string, { vi: string; en: string; icon: React.ElementType }> = {
  hero: { vi: 'Hero Banner', en: 'Hero Banner', icon: ImageIcon },
  story: { vi: 'Câu chuyện thương hiệu', en: 'Brand Story', icon: FileText },
  values: { vi: 'Giá trị cốt lõi', en: 'Core Values', icon: Hash },
  team: { vi: 'Đội ngũ & Xưởng', en: 'Team & Workshop', icon: Type },
  cta: { vi: 'Call to Action', en: 'Call to Action', icon: AlignLeft },
};

const AboutManagement: React.FC = () => {
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [editingSection, setEditingSection] = useState<AboutSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<CompressedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');

  const t = {
    title: language === 'vi' ? 'Quản lý trang Giới thiệu' : 'About Page Management',
    subtitle: language === 'vi' ? 'Chỉnh sửa nội dung trang About Us' : 'Edit About Us page content',
    save: language === 'vi' ? 'Lưu' : 'Save',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    edit: language === 'vi' ? 'Chỉnh sửa' : 'Edit',
    sectionTitle: language === 'vi' ? 'Tiêu đề' : 'Title',
    sectionSubtitle: language === 'vi' ? 'Phụ đề' : 'Subtitle',
    sectionContent: language === 'vi' ? 'Nội dung' : 'Content',
    sectionImage: language === 'vi' ? 'URL hình ảnh' : 'Image URL',
    active: language === 'vi' ? 'Đang hiển thị' : 'Active',
    inactive: language === 'vi' ? 'Đang ẩn' : 'Inactive',
    saveSuccess: language === 'vi' ? 'Đã lưu thành công!' : 'Saved successfully!',
    saveError: language === 'vi' ? 'Lỗi khi lưu!' : 'Error saving!',
    loadError: language === 'vi' ? 'Lỗi khi tải dữ liệu!' : 'Error loading data!',
    refresh: language === 'vi' ? 'Làm mới' : 'Refresh',
    noSections: language === 'vi' ? 'Chưa có section nào. Hãy chạy seed để tạo dữ liệu mẫu.' : 'No sections yet. Run seed to create sample data.',
    uploadImage: language === 'vi' ? 'Tải ảnh lên' : 'Upload Image',
    pasteUrl: language === 'vi' ? 'Dán URL' : 'Paste URL',
    uploading: language === 'vi' ? 'Đang tải lên...' : 'Uploading...',
    selectImage: language === 'vi' ? 'Chọn ảnh' : 'Select Image',
    changeImage: language === 'vi' ? 'Đổi ảnh' : 'Change Image',
    compressionInfo: language === 'vi' ? 'Giảm' : 'Reduced',
  };

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: AboutSection[] }>('/about-sections?includeInactive=true');
      if (response.success) {
        setSections(response.data);
      }
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleSave = async (section: AboutSection) => {
    try {
      setSaving(section.sectionKey);
      setError(null);
      setSuccess(null);

      const response = await api.put<{ success: boolean; data: AboutSection }>(`/about-sections/${section.id}`, {
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        imageUrl: section.imageUrl,
        isActive: section.isActive,
        metadata: section.metadata,
      });

      if (response.success) {
        setSections(prev => prev.map(s => s.id === section.id ? response.data : s));
        setSuccess(t.saveSuccess);
        setEditingSection(null);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error saving section:', err);
      setError(t.saveError);
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async (section: AboutSection) => {
    const updatedSection = { ...section, isActive: !section.isActive };
    await handleSave(updatedSection);
  };

  const getSectionLabel = (key: string) => {
    const label = SECTION_LABELS[key];
    if (!label) return key;
    return language === 'vi' ? label.vi : label.en;
  };

  const getSectionIcon = (key: string) => {
    const label = SECTION_LABELS[key];
    return label?.icon || FileText;
  };

  const sanitizeHTML = (html: string): string => {
    if (typeof window === 'undefined') return html;
    const DOMPurify = require('dompurify');
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a', 'blockquote'],
      ALLOWED_ATTR: ['href', 'target', 'rel']
    });
  };

  const handleImageSelect = async (file: File) => {
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setUploadingImage(compressed);
      setError(null);
    } catch (err) {
      console.error('Image compression error:', err);
      setError(language === 'vi' ? 'Lỗi khi nén ảnh' : 'Image compression error');
    }
  };

  const handleImageUpload = async () => {
    if (!uploadingImage || !editingSection) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadingImage.file);

      const response = await api.uploadFile<{ success: boolean; data: { url: string; webpUrl?: string } }>(
        '/media/upload',
        formData
      );

      if (response.success && response.data) {
        // Ưu tiên dùng webpUrl nếu có, fallback về url
        const imageUrl = response.data.webpUrl || response.data.url;
        setEditingSection({ ...editingSection, imageUrl });
        setUploadingImage(null);
        setSuccess(language === 'vi' ? 'Ảnh đã được tải lên!' : 'Image uploaded!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(language === 'vi' ? 'Lỗi khi tải ảnh lên' : 'Image upload error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearUploadingImage = () => {
    if (uploadingImage?.preview) {
      URL.revokeObjectURL(uploadingImage.preview);
    }
    setUploadingImage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={fetchSections}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          {t.refresh}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Sections List */}
      {sections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t.noSections}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = getSectionIcon(section.sectionKey);
            const isEditing = editingSection?.id === section.id;

            return (
              <div
                key={section.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border ${
                  section.isActive 
                    ? 'border-gray-200 dark:border-gray-700' 
                    : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'
                } overflow-hidden`}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      section.isActive ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      <Icon className={`w-5 h-5 ${section.isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {getSectionLabel(section.sectionKey)}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Key: {section.sectionKey} | Order: {section.order}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(section)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                        section.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {section.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      {section.isActive ? t.active : t.inactive}
                    </button>
                    {!isEditing && (
                      <button
                        onClick={() => setEditingSection({ ...section })}
                        className="px-4 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition"
                      >
                        {t.edit}
                      </button>
                    )}
                  </div>
                </div>

                {/* Section Content */}
                <div className="p-5">
                  {isEditing && editingSection ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t.sectionTitle}
                          </label>
                          <input
                            type="text"
                            value={editingSection.title || ''}
                            onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t.sectionSubtitle}
                          </label>
                          <input
                            type="text"
                            value={editingSection.subtitle || ''}
                            onChange={(e) => setEditingSection({ ...editingSection, subtitle: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t.sectionContent}
                        </label>
                        <LexicalEditor
                          initialValue={editingSection.content || ''}
                          onChange={(html) => setEditingSection({ ...editingSection, content: html })}
                          placeholder={language === 'vi' ? 'Nhập nội dung section...' : 'Enter section content...'}
                          minHeight="200px"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t.sectionImage}
                        </label>
                        
                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setImageInputMode('upload')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                              imageInputMode === 'upload'
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <Upload className="w-4 h-4" />
                            {t.uploadImage}
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageInputMode('url')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                              imageInputMode === 'url'
                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            <LinkIcon className="w-4 h-4" />
                            {t.pasteUrl}
                          </button>
                        </div>

                        {/* Upload Mode */}
                        {imageInputMode === 'upload' ? (
                          <div className="space-y-3">
                            {/* Drag & Drop Zone */}
                            <div
                              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-900/50 hover:border-primary-400 dark:hover:border-primary-600 transition"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files?.[0];
                                if (file) handleImageSelect(file);
                              }}
                            >
                              <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                {language === 'vi' ? 'Tải ảnh lên' : 'Upload Image'}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                {language === 'vi' 
                                  ? 'Tự động chuyển đổi sang WebP để tối ưu dung lượng'
                                  : 'Auto-convert to WebP for optimization'}
                              </p>
                              <div className="relative inline-block">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageSelect(file);
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <button
                                  type="button"
                                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition"
                                >
                                  {language === 'vi' ? 'Chọn file hoặc kéo thả vào đây' : 'Choose file or drag here'}
                                </button>
                              </div>
                              <p className="text-xs text-gray-400 mt-3">
                                JPG, PNG, GIF, WebP (max 10MB)
                              </p>
                            </div>

                            {/* Uploading Preview */}
                            {uploadingImage && (
                              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                                <div className="flex items-start gap-4">
                                  <div className="relative w-24 h-24 flex-shrink-0">
                                    <Image
                                      src={uploadingImage.preview}
                                      alt="Preview"
                                      fill
                                      className="object-cover rounded-lg"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {uploadingImage.file.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                          {formatFileSize(uploadingImage.file.size)}
                                          {uploadingImage.reduction && (
                                            <span className="ml-2 text-green-600 dark:text-green-400">
                                              ({t.compressionInfo} {uploadingImage.reduction.toFixed(1)}%)
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                      {!isUploading && (
                                        <button
                                          type="button"
                                          onClick={handleClearUploadingImage}
                                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                        >
                                          <X className="w-5 h-5" />
                                        </button>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleImageUpload}
                                      disabled={isUploading}
                                      className="mt-3 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                      {isUploading ? (
                                        <>
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                          {t.uploading}
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="w-4 h-4" />
                                          {language === 'vi' ? 'Tải lên' : 'Upload'}
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Current Image Preview */}
                            {editingSection.imageUrl && !uploadingImage && (
                              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-20 h-20 flex-shrink-0">
                                    <Image
                                      src={editingSection.imageUrl}
                                      alt="Current"
                                      fill
                                      className="object-cover rounded-lg"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {language === 'vi' ? 'Ảnh hiện tại' : 'Current Image'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                      {editingSection.imageUrl}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setEditingSection({ ...editingSection, imageUrl: '' })}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* URL Mode */
                          <div>
                            <input
                              type="text"
                              value={editingSection.imageUrl || ''}
                              onChange={(e) => setEditingSection({ ...editingSection, imageUrl: e.target.value })}
                              placeholder="https://..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                            {editingSection.imageUrl && (
                              <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex items-center gap-4">
                                  <div className="relative w-20 h-20 flex-shrink-0">
                                    <Image
                                      src={editingSection.imageUrl}
                                      alt="Preview"
                                      fill
                                      className="object-cover rounded-lg"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {language === 'vi' ? 'Xem trước' : 'Preview'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                      {editingSection.imageUrl}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={() => handleSave(editingSection)}
                          disabled={saving === section.sectionKey}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
                        >
                          {saving === section.sectionKey ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {saving === section.sectionKey ? t.saving : t.save}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {section.title && (
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t.sectionTitle}:</span>
                          <p className="text-gray-900 dark:text-white font-medium">{section.title}</p>
                        </div>
                      )}
                      {section.subtitle && (
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t.sectionSubtitle}:</span>
                          <p className="text-gray-700 dark:text-gray-300">{section.subtitle}</p>
                        </div>
                      )}
                      {section.content && (
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t.sectionContent}:</span>
                          <div 
                            className="text-gray-600 dark:text-gray-400 text-sm prose dark:prose-invert max-w-none prose-p:my-1 line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: sanitizeHTML(section.content) }}
                          />
                        </div>
                      )}
                      {section.imageUrl && (
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{t.sectionImage}:</span>
                          <p className="text-blue-600 dark:text-blue-400 text-sm truncate">{section.imageUrl}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AboutManagement;

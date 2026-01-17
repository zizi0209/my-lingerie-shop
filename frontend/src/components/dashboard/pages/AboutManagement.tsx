'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle, Upload, Eye, Sparkles, Heart, Users, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { compressImage, formatFileSize, validateImageFile } from '@/lib/imageUtils';
import Image from 'next/image';
import { useLanguage } from '../components/LanguageContext';

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

const sectionIcons: Record<string, React.ElementType> = {
  hero: Sparkles,
  story: Heart,
  values: Users,
  team: Users,
  cta: MessageCircle,
};

const sectionLabels: Record<string, { vi: string; en: string }> = {
  hero: { vi: 'Hero Banner', en: 'Hero Banner' },
  story: { vi: 'Câu chuyện thương hiệu', en: 'Brand Story' },
  values: { vi: 'Giá trị cốt lõi', en: 'Core Values' },
  team: { vi: 'Đội ngũ', en: 'Team' },
  cta: { vi: 'Call to Action', en: 'Call to Action' },
};

const translations = {
  vi: {
    title: 'Quản lý trang Giới thiệu',
    subtitle: 'Chỉnh sửa nội dung các phần trên trang Giới thiệu',
    save: 'Lưu thay đổi',
    saving: 'Đang lưu...',
    saveSuccess: 'Đã lưu thành công!',
    saveError: 'Lỗi khi lưu',
    preview: 'Xem trang',
    loading: 'Đang tải...',
    titleField: 'Tiêu đề',
    subtitleField: 'Phụ đề',
    contentField: 'Nội dung',
    imageField: 'Hình ảnh',
    uploadImage: 'Tải ảnh lên',
    changeImage: 'Đổi ảnh',
    uploading: 'Đang tải...',
    active: 'Hiển thị',
    inactive: 'Ẩn',
    metadata: 'Dữ liệu bổ sung (JSON)',
  },
  en: {
    title: 'About Page Management',
    subtitle: 'Edit content for About Us page sections',
    save: 'Save Changes',
    saving: 'Saving...',
    saveSuccess: 'Saved successfully!',
    saveError: 'Error saving',
    preview: 'View Page',
    loading: 'Loading...',
    titleField: 'Title',
    subtitleField: 'Subtitle',
    contentField: 'Content',
    imageField: 'Image',
    uploadImage: 'Upload Image',
    changeImage: 'Change Image',
    uploading: 'Uploading...',
    active: 'Visible',
    inactive: 'Hidden',
    metadata: 'Metadata (JSON)',
  }
};

const AboutManagement: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.vi;

  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState<Record<number, boolean>>({});

  // Fetch sections
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: AboutSection[] }>('/about-sections?includeInactive=true');
      if (response.success) {
        setSections(response.data.sort((a, b) => a.order - b.order));
      }
    } catch (err) {
      setError('Không thể tải danh sách section');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // Update section
  const updateSection = async (section: AboutSection) => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await api.put<{ success: boolean; data: AboutSection }>(`/about-sections/${section.id}`, {
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        imageUrl: section.imageUrl,
        metadata: section.metadata,
        isActive: section.isActive,
      });

      if (response && response.success) {
        setSuccess(t.saveSuccess);
        setTimeout(() => setSuccess(null), 3000);
        await fetchSections();
      }
    } catch (err) {
      setError(t.saveError);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (sectionId: number, file: File) => {
    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        alert(validation.error);
        return;
      }

      setUploadingImages(prev => ({ ...prev, [sectionId]: true }));

      // Compress image
      const compressed = await compressImage(file);
      
      // Upload to backend
      const formData = new FormData();
      formData.append('image', compressed.file);

      const response = await api.uploadFile<{ success: boolean; data: { url: string } }>('/media/upload', formData);

      if (response && response.success) {
        // Update section with new image URL
        const section = sections.find(s => s.id === sectionId);
        if (section) {
          const updated = { ...section, imageUrl: response.data.url };
          setSections(prev => prev.map(s => s.id === sectionId ? updated : s));
          await updateSection(updated);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Lỗi khi tải ảnh lên');
    } finally {
      setUploadingImages(prev => ({ ...prev, [sectionId]: false }));
    }
  };

  // Handle field change
  const handleFieldChange = (sectionId: number, field: keyof AboutSection, value: string | boolean) => {
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, [field]: value } : s
    ));
  };

  // Handle metadata change
  const handleMetadataChange = (sectionId: number, value: string) => {
    try {
      const parsed = value ? JSON.parse(value) : null;
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { ...s, metadata: parsed } : s
      ));
    } catch (err) {
      console.error('Invalid JSON:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">{t.loading}</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t.subtitle}</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-600 dark:text-green-400">{success}</div>
        </div>
      )}

      {/* Action Bar */}
      <div className="mb-6 flex justify-between items-center">
        <a
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <Eye className="w-4 h-4" />
          {t.preview}
        </a>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {sections.map((section) => {
          const Icon = sectionIcons[section.sectionKey] || Sparkles;
          const label = sectionLabels[section.sectionKey] || { vi: section.sectionKey, en: section.sectionKey };

          return (
            <div
              key={section.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-primary-500" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {label[language as keyof typeof label]}
                  </h3>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={section.isActive}
                    onChange={(e) => handleFieldChange(section.id, 'isActive', e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {section.isActive ? t.active : t.inactive}
                  </span>
                </label>
              </div>

              {/* Section Form */}
              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.titleField}
                  </label>
                  <input
                    type="text"
                    value={section.title || ''}
                    onChange={(e) => handleFieldChange(section.id, 'title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nhập tiêu đề..."
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.subtitleField}
                  </label>
                  <input
                    type="text"
                    value={section.subtitle || ''}
                    onChange={(e) => handleFieldChange(section.id, 'subtitle', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nhập phụ đề..."
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.contentField}
                  </label>
                  <textarea
                    value={section.content || ''}
                    onChange={(e) => handleFieldChange(section.id, 'content', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="Nhập nội dung..."
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.imageField}
                  </label>
                  
                  {section.imageUrl ? (
                    <div className="space-y-3">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <Image
                          src={section.imageUrl}
                          alt={section.title || ''}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition">
                        <Upload className="w-4 h-4" />
                        {uploadingImages[section.id] ? t.uploading : t.changeImage}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(section.id, file);
                          }}
                          className="hidden"
                          disabled={uploadingImages[section.id]}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                      <div className="flex flex-col items-center justify-center py-6">
                        <Upload className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {uploadingImages[section.id] ? t.uploading : t.uploadImage}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(section.id, file);
                        }}
                        className="hidden"
                        disabled={uploadingImages[section.id]}
                      />
                    </label>
                  )}
                </div>

                {/* Metadata (for advanced users) */}
                {section.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.metadata}
                    </label>
                    <textarea
                      value={JSON.stringify(section.metadata, null, 2)}
                      onChange={(e) => handleMetadataChange(section.id, e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-900 dark:bg-gray-950 text-green-400 font-mono text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                )}

                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => updateSection(section)}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t.saving}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {t.save}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sections.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Chưa có section nào. Vui lòng chạy seed database.
        </div>
      )}
    </div>
  );
};

export default AboutManagement;

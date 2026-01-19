'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, Loader2, AlertCircle, CheckCircle, Eye, EyeOff, Plus, Trash2,
  FileText, Image as ImageIcon, Type, AlignLeft, Hash, RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '../components/LanguageContext';
import dynamic from 'next/dynamic';

import { sanitizeForPreview } from '@/lib/sanitize';
import Image from 'next/image';
import { ImageUploadField } from './ImageUploadField';

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
  craftsmanship: { vi: 'Cam kết chất lượng', en: 'Quality Commitment', icon: Hash },
  values: { vi: 'Giá trị cốt lõi', en: 'Core Values', icon: Hash },
  stats: { vi: 'Thống kê', en: 'Statistics', icon: Hash },
  team: { vi: 'Đội ngũ', en: 'Team', icon: Type },
  socialproof: { vi: 'Báo chí & Đối tác', en: 'Press & Partners', icon: FileText },
  cta: { vi: 'Call to Action', en: 'Call to Action', icon: AlignLeft },
};

// Metadata type definitions
interface CraftsmanshipItem {
  icon: string;
  title: string;
  description: string;
}

interface ValueItem {
  icon: string;
  title: string;
  description: string;
}

interface StatItem {
  number: number;
  suffix: string;
  label: string;
  decimals?: number;
}

interface TeamMember {
  name: string;
  role: string;
  image: string;
}

interface CTAButton {
  text: string;
  link: string;
  variant: 'primary' | 'outline';
}

interface Quote {
  quote: string;
  author: string;
  publication: string;
  date: string;
}

interface Partner {
  name: string;
}

const AboutManagement: React.FC = () => {
  const { language } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [editingSection, setEditingSection] = useState<AboutSection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  // Helper function để update editingSection safely (tránh stale closure)
  const updateEditingSection = (updates: Partial<AboutSection>) => {
    setEditingSection(prev => prev ? { ...prev, ...updates } : prev);
  };

  // Helper để update metadata safely
  const updateMetadata = (metadataUpdates: Record<string, unknown>) => {
    setEditingSection(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        metadata: { ...prev.metadata, ...metadataUpdates }
      };
    });
  };

  const handleSave = async (section: AboutSection) => {
    try {
      setSaving(section.sectionKey);
      setError(null);
      setSuccess(null);

      // Debug: log data trước khi save
      console.log('💾 Saving section:', {
        id: section.id,
        sectionKey: section.sectionKey,
        imageUrl: section.imageUrl,
        hasImage: !!section.imageUrl
      });

      const response = await api.put<{ success: boolean; data: AboutSection }>(`/about-sections/${section.id}`, {
        title: section.title,
        subtitle: section.subtitle,
        content: section.content,
        imageUrl: section.imageUrl,
        isActive: section.isActive,
        metadata: section.metadata,
      });

      console.log('💾 Save response:', {
        success: response.success,
        imageUrl: response.data?.imageUrl
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

  // ===== METADATA MANAGEMENT HANDLERS =====
  
  // Craftsmanship Items
  const handleAddCraftsmanshipItem = () => {
    if (!editingSection) return;
    const items = (editingSection.metadata as { items?: CraftsmanshipItem[] })?.items || [];
    const newItem: CraftsmanshipItem = { icon: 'sparkles', title: '', description: '' };
    setEditingSection({
      ...editingSection,
      metadata: { ...editingSection.metadata, items: [...items, newItem] }
    });
  };

  const handleUpdateCraftsmanshipItem = (index: number, field: keyof CraftsmanshipItem, value: string) => {
    if (!editingSection) return;
    setEditingSection(prev => {
      if (!prev) return prev;
      const items = [...((prev.metadata as { items?: CraftsmanshipItem[] })?.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, metadata: { ...prev.metadata, items } };
    });
  };

  const handleDeleteCraftsmanshipItem = (index: number) => {
    if (!editingSection) return;
    setEditingSection(prev => {
      if (!prev) return prev;
      const items = ((prev.metadata as { items?: CraftsmanshipItem[] })?.items || []).filter((_, i) => i !== index);
      return { ...prev, metadata: { ...prev.metadata, items } };
    });
  };

  // Values Items
  const handleAddValueItem = () => {
    if (!editingSection) return;
    const values = (editingSection.metadata as { values?: ValueItem[] })?.values || [];
    const newValue: ValueItem = { icon: '💖', title: '', description: '' };
    setEditingSection({
      ...editingSection,
      metadata: { ...editingSection.metadata, values: [...values, newValue] }
    });
  };

  const handleUpdateValueItem = (index: number, field: keyof ValueItem, value: string) => {
    if (!editingSection) return;
    const values = [...((editingSection.metadata as { values?: ValueItem[] })?.values || [])];
    values[index] = { ...values[index], [field]: value };
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, values } });
  };

  const handleDeleteValueItem = (index: number) => {
    if (!editingSection) return;
    const values = ((editingSection.metadata as { values?: ValueItem[] })?.values || []).filter((_, i) => i !== index);
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, values } });
  };

  // Stats Management
  const handleUpdateStat = (index: number, field: keyof StatItem, value: string | number) => {
    if (!editingSection) return;
    const stats = [...((editingSection.metadata as { stats?: StatItem[] })?.stats || [])];
    stats[index] = { ...stats[index], [field]: field === 'number' || field === 'decimals' ? Number(value) : value };
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, stats } });
  };

  // Team Members Management
  const handleAddTeamMember = () => {
    if (!editingSection) return;
    const members = (editingSection.metadata as { members?: TeamMember[] })?.members || [];
    const newMember: TeamMember = { name: '', role: '', image: '' };
    setEditingSection({
      ...editingSection,
      metadata: { ...editingSection.metadata, members: [...members, newMember] }
    });
  };

  const handleUpdateTeamMember = (index: number, field: keyof TeamMember, value: string) => {
    if (!editingSection) return;
    const members = [...((editingSection.metadata as { members?: TeamMember[] })?.members || [])];
    members[index] = { ...members[index], [field]: value };
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, members } });
  };

  const handleDeleteTeamMember = (index: number) => {
    if (!editingSection) return;
    const members = ((editingSection.metadata as { members?: TeamMember[] })?.members || []).filter((_, i) => i !== index);
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, members } });
  };

  // CTA Buttons Management
  const handleUpdateCTAButton = (index: number, field: keyof CTAButton, value: string) => {
    if (!editingSection) return;
    const buttons = [...((editingSection.metadata as { buttons?: CTAButton[] })?.buttons || [])];
    buttons[index] = { ...buttons[index], [field]: value };
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, buttons } });
  };

  // Helper: Generate current date in "Tháng MM/YYYY" format
  const generateCurrentDate = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `Tháng ${month}/${year}`;
  };

  // Social Proof Management - Quotes
  const handleAddQuote = () => {
    if (!editingSection) return;
    const quotes = (editingSection.metadata as { quotes?: Quote[] })?.quotes || [];
    const newQuote: Quote = { quote: '', author: '', publication: '', date: generateCurrentDate() };
    setEditingSection({
      ...editingSection,
      metadata: { ...editingSection.metadata, quotes: [...quotes, newQuote] }
    });
  };

  const handleUpdateQuote = (index: number, field: keyof Quote, value: string) => {
    if (!editingSection) return;
    const quotes = [...((editingSection.metadata as { quotes?: Quote[] })?.quotes || [])];
    quotes[index] = { ...quotes[index], [field]: value };
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, quotes } });
  };

  const handleDeleteQuote = (index: number) => {
    if (!editingSection) return;
    const quotes = ((editingSection.metadata as { quotes?: Quote[] })?.quotes || []).filter((_, i) => i !== index);
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, quotes } });
  };

  // Social Proof Management - Partners
  const handleAddPartner = () => {
    if (!editingSection) return;
    const partners = (editingSection.metadata as { partners?: Partner[] })?.partners || [];
    const newPartner: Partner = { name: '' };
    setEditingSection({
      ...editingSection,
      metadata: { ...editingSection.metadata, partners: [...partners, newPartner] }
    });
  };

  const handleUpdatePartner = (index: number, field: keyof Partner, value: string) => {
    if (!editingSection) return;
    const partners = [...((editingSection.metadata as { partners?: Partner[] })?.partners || [])];
    partners[index] = { ...partners[index], [field]: value };
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, partners } });
  };

  const handleDeletePartner = (index: number) => {
    if (!editingSection) return;
    const partners = ((editingSection.metadata as { partners?: Partner[] })?.partners || []).filter((_, i) => i !== index);
    setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, partners } });
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
                      {/* Định nghĩa fields cần hiển thị cho từng section */}
                      {(() => {
                        const key = editingSection.sectionKey;
                        const needsTitle = ['hero', 'story', 'craftsmanship', 'values', 'team', 'socialproof', 'cta'].includes(key);
                        const needsSubtitle = ['hero', 'story', 'craftsmanship', 'values', 'team', 'socialproof'].includes(key);
                        const needsContent = ['hero', 'story', 'craftsmanship', 'team', 'cta'].includes(key);
                        const needsImage = ['hero', 'story'].includes(key);

                        return (
                          <>
                            {/* Title & Subtitle */}
                            {(needsTitle || needsSubtitle) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {needsTitle && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      {t.sectionTitle}
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSection.title || ''}
                                      onChange={(e) => updateEditingSection({ title: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    />
                                  </div>
                                )}
                                {needsSubtitle && (
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      {t.sectionSubtitle}
                                    </label>
                                    <input
                                      type="text"
                                      value={editingSection.subtitle || ''}
                                      onChange={(e) => updateEditingSection({ subtitle: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Content Editor */}
                            {needsContent && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  {t.sectionContent}
                                </label>
                                <LexicalEditor
                                  initialValue={editingSection.content || ''}
                                  onChange={(html) => updateEditingSection({ content: html })}
                                  placeholder={language === 'vi' ? 'Nhập nội dung section...' : 'Enter section content...'}
                                  minHeight="200px"
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* ===== METADATA MANAGEMENT UI ===== */}

                      {/* Craftsmanship Items */}
                      {editingSection.sectionKey === 'craftsmanship' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              ✨ Các mục chất lượng (Ren cao cấp, Lụa tơ tằm, Đường may Seamless, Gọng mềm)
                            </h4>
                            <button
                              type="button"
                              onClick={handleAddCraftsmanshipItem}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm mục
                            </button>
                          </div>
                          <div className="space-y-3">
                            {((editingSection.metadata as { items?: CraftsmanshipItem[] })?.items || []).map((item, index) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 space-y-2">
                                    <input
                                      type="text"
                                      value={item.icon}
                                      onChange={(e) => handleUpdateCraftsmanshipItem(index, 'icon', e.target.value)}
                                      placeholder="Icon (sparkles, heart, scissors, shield)"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => handleUpdateCraftsmanshipItem(index, 'title', e.target.value)}
                                      placeholder="Tiêu đề"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    <textarea
                                      value={item.description}
                                      onChange={(e) => handleUpdateCraftsmanshipItem(index, 'description', e.target.value)}
                                      placeholder="Mô tả"
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCraftsmanshipItem(index)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mt-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Values Items */}
                      {editingSection.sectionKey === 'values' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              💎 Các giá trị (Body Positivity, Sustainability, Discrete Packaging)
                            </h4>
                            <button
                              type="button"
                              onClick={handleAddValueItem}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm giá trị
                            </button>
                          </div>
                          <div className="space-y-3">
                            {((editingSection.metadata as { values?: ValueItem[] })?.values || []).map((item, index) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 space-y-2">
                                    <input
                                      type="text"
                                      value={item.icon}
                                      onChange={(e) => handleUpdateValueItem(index, 'icon', e.target.value)}
                                      placeholder="Emoji (💖, 🌿, 📦)"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) => handleUpdateValueItem(index, 'title', e.target.value)}
                                      placeholder="Tiêu đề (Body Positivity)"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    <textarea
                                      value={item.description}
                                      onChange={(e) => handleUpdateValueItem(index, 'description', e.target.value)}
                                      placeholder="Mô tả"
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteValueItem(index)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mt-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      {editingSection.sectionKey === 'stats' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                            📊 Số liệu thống kê (với hiệu ứng đếm tăng dần khi scroll)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {((editingSection.metadata as { stats?: StatItem[] })?.stats || []).map((stat, index) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="space-y-2">
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="number"
                                      value={stat.number}
                                      onChange={(e) => handleUpdateStat(index, 'number', e.target.value)}
                                      placeholder="Số"
                                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={stat.suffix}
                                      onChange={(e) => handleUpdateStat(index, 'suffix', e.target.value)}
                                      placeholder="Hậu tố (+, /5)"
                                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={stat.label}
                                    onChange={(e) => handleUpdateStat(index, 'label', e.target.value)}
                                    placeholder="Nhãn (Khách hàng hài lòng)"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Team Members */}
                      {editingSection.sectionKey === 'team' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              👥 Thành viên đội ngũ (tên, vị trí, ảnh đại diện)
                            </h4>
                            <button
                              type="button"
                              onClick={handleAddTeamMember}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm thành viên
                            </button>
                          </div>
                          <div className="space-y-3">
                            {((editingSection.metadata as { members?: TeamMember[] })?.members || []).map((member, index) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 space-y-3">
                                    <input
                                      type="text"
                                      value={member.name}
                                      onChange={(e) => handleUpdateTeamMember(index, 'name', e.target.value)}
                                      placeholder="Tên"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={member.role}
                                      onChange={(e) => handleUpdateTeamMember(index, 'role', e.target.value)}
                                      placeholder="Vị trí (Founder & Creative Director)"
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    />
                                    <ImageUploadField
                                      value={member.image}
                                      onChange={(url) => handleUpdateTeamMember(index, 'image', url)}
                                      label={language === 'vi' ? 'Ảnh đại diện' : 'Avatar'}
                                      placeholder="URL ảnh đại diện"
                                      language={language}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTeamMember(index)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mt-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CTA Buttons */}
                      {editingSection.sectionKey === 'cta' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              🎯 Các nút hành động (Khám phá bộ sưu tập, Tư vấn chọn Size)
                            </h4>
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingSection) return;
                                const buttons = (editingSection.metadata as { buttons?: CTAButton[] })?.buttons || [];
                                const newButton: CTAButton = { text: '', link: '', variant: 'primary' };
                                setEditingSection({
                                  ...editingSection,
                                  metadata: { ...editingSection.metadata, buttons: [...buttons, newButton] }
                                });
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm button
                            </button>
                          </div>
                          <div className="space-y-3">
                            {((editingSection.metadata as { buttons?: CTAButton[] })?.buttons || []).map((button, index) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <input
                                        type="text"
                                        value={button.text}
                                        onChange={(e) => handleUpdateCTAButton(index, 'text', e.target.value)}
                                        placeholder="Text button"
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                      />
                                      <input
                                        type="text"
                                        value={button.link}
                                        onChange={(e) => handleUpdateCTAButton(index, 'link', e.target.value)}
                                        placeholder="Link (/san-pham, /contact)"
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                      />
                                      <select
                                        value={button.variant}
                                        onChange={(e) => handleUpdateCTAButton(index, 'variant', e.target.value)}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                      >
                                        <option value="primary">Primary (nền trắng)</option>
                                        <option value="outline">Outline (viền)</option>
                                      </select>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!editingSection) return;
                                      const buttons = ((editingSection.metadata as { buttons?: CTAButton[] })?.buttons || []).filter((_, i) => i !== index);
                                      setEditingSection({ ...editingSection, metadata: { ...editingSection.metadata, buttons } });
                                    }}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mt-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Social Proof - Partners */}
                      {editingSection.sectionKey === 'socialproof' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              📰 Các thương hiệu hợp tác (Elle, Đẹp, VnExpress, Harper's Bazaar, Vogue VN)
                            </h4>
                            <button
                              type="button"
                              onClick={handleAddPartner}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm thương hiệu
                            </button>
                          </div>
                          <div className="space-y-2">
                            {((editingSection.metadata as { partners?: Partner[] })?.partners || []).map((partner, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={partner.name}
                                  onChange={(e) => handleUpdatePartner(index, 'name', e.target.value)}
                                  placeholder="Tên thương hiệu (Elle, Đẹp, VnExpress...)"
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeletePartner(index)}
                                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Social Proof - Quotes */}
                      {editingSection.sectionKey === 'socialproof' && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              💬 Các quotes/báo chí (Lingerie Shop là một..., Elle Vietnam, Tháng 10/2024)
                            </h4>
                            <button
                              type="button"
                              onClick={handleAddQuote}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Thêm quote
                            </button>
                          </div>
                          <div className="space-y-3">
                            {((editingSection.metadata as { quotes?: Quote[] })?.quotes || []).map((quote, index) => (
                              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 space-y-2">
                                    <textarea
                                      value={quote.quote}
                                      onChange={(e) => handleUpdateQuote(index, 'quote', e.target.value)}
                                      placeholder="Nội dung quote (vd: 'Lingerie Shop là một thương hiệu tôi yêu thích...')"
                                      rows={2}
                                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      <input
                                        type="text"
                                        value={quote.author}
                                        onChange={(e) => handleUpdateQuote(index, 'author', e.target.value)}
                                        placeholder="Tác giả/Người viết"
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                      />
                                      <input
                                        type="text"
                                        value={quote.publication}
                                        onChange={(e) => handleUpdateQuote(index, 'publication', e.target.value)}
                                        placeholder="Tờ báo/Xuất xứ (Elle Vietnam, Vogue VN)"
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuote(index)}
                                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mt-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Image Upload - Chỉ cho hero và story */}
                      {['hero', 'story'].includes(editingSection.sectionKey) && (
                        <ImageUploadField
                          value={editingSection.imageUrl || ''}
                          onChange={(url) => updateEditingSection({ imageUrl: url })}
                          label={t.sectionImage}
                          placeholder="https://..."
                          language={language}
                        />
                      )}

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
                      {(() => {
                        const key = section.sectionKey;
                        const hasMetadata = section.metadata && Object.keys(section.metadata).length > 0;
                        
                        return (
                          <>
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
                                  dangerouslySetInnerHTML={{ __html: sanitizeForPreview(section.content) }}
                                />
                              </div>
                            )}
                            {section.imageUrl && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{t.sectionImage}:</span>
                                <p className="text-blue-600 dark:text-blue-400 text-sm truncate">{section.imageUrl}</p>
                              </div>
                            )}
                            {hasMetadata && (
                              <div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {key === 'craftsmanship' && '✨ Cam kết chất lượng'}
                                  {key === 'values' && '💎 Giá trị cốt lõi'}
                                  {key === 'stats' && '📊 Thống kê'}
                                  {key === 'team' && '👥 Đội ngũ'}
                                  {key === 'socialproof' && '🏆 Báo chí & Đối tác'}
                                  {key === 'cta' && '🎯 Các nút CTA'}
                                </span>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                  {key === 'craftsmanship' && `${(section.metadata as { items?: unknown[] })?.items?.length || 0} mục`}
                                  {key === 'values' && `${(section.metadata as { values?: unknown[] })?.values?.length || 0} giá trị`}
                                  {key === 'stats' && `${(section.metadata as { stats?: unknown[] })?.stats?.length || 0} số liệu`}
                                  {key === 'team' && `${(section.metadata as { members?: unknown[] })?.members?.length || 0} thành viên`}
                                  {key === 'socialproof' && `${(section.metadata as { partners?: unknown[] })?.partners?.length || 0} đối tác`}
                                  {key === 'cta' && `${(section.metadata as { buttons?: unknown[] })?.buttons?.length || 0} nút`}
                                </p>
                              </div>
                            )}
                          </>
                        );
                      })()}
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

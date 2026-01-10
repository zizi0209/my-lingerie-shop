'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Move, Settings, Eye, EyeOff, Plus, Trash2, Save, 
  Loader2, AlertCircle, CheckCircle, GripVertical,
  Image as ImageIcon, Type, ShoppingBag, Sparkles, Star, Mail,
  Layout, Layers, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '../components/LanguageContext';
import { LexicalEditor } from '@/components/editor';

interface PageSection {
  id: number;
  code: string;
  name: string;
  isVisible: boolean;
  order: number;
  content: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface SectionTemplate {
  code: string;
  name: string;
  icon: React.ElementType;
  description: string;
  defaultContent: Record<string, unknown>;
}

const sectionTemplates: SectionTemplate[] = [
  {
    code: 'hero',
    name: 'Hero Banner',
    icon: ImageIcon,
    description: 'Banner chính với hình ảnh lớn và CTA',
    defaultContent: {
      title: 'Bộ sưu tập mới',
      subtitle: 'Khám phá vẻ đẹp quyến rũ',
      buttonText: 'Mua ngay',
      buttonLink: '/san-pham',
      backgroundImage: 'https://images.unsplash.com/photo-1519644473771-e45d361c9bb8?q=80&w=1170&auto=format&fit=crop',
    }
  },
  {
    code: 'featured',
    name: 'Sản phẩm nổi bật',
    icon: Star,
    description: 'Hiển thị các sản phẩm được đánh dấu nổi bật',
    defaultContent: {
      title: 'Sản phẩm nổi bật',
      limit: 8,
    }
  },
  {
    code: 'new',
    name: 'Sản phẩm mới',
    icon: Sparkles,
    description: 'Hiển thị sản phẩm mới nhất',
    defaultContent: {
      title: 'Hàng mới về',
      limit: 8,
    }
  },
  {
    code: 'categories',
    name: 'Danh mục',
    icon: Layers,
    description: 'Hiển thị các danh mục sản phẩm',
    defaultContent: {
      title: 'Danh mục sản phẩm',
      style: 'grid',
    }
  },
  {
    code: 'promotion',
    name: 'Banner khuyến mãi',
    icon: ShoppingBag,
    description: 'Banner quảng cáo khuyến mãi',
    defaultContent: {
      title: 'Flash Sale',
      subtitle: 'Giảm đến 50%',
      backgroundImage: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1972&auto=format&fit=crop',
      link: '/san-pham?sale=true',
    }
  },
  {
    code: 'text',
    name: 'Khối văn bản',
    icon: Type,
    description: 'Nội dung văn bản tùy chỉnh',
    defaultContent: {
      title: 'Về chúng tôi',
      content: '',
    }
  },
  {
    code: 'newsletter',
    name: 'Đăng ký nhận tin',
    icon: Mail,
    description: 'Form đăng ký nhận bản tin',
    defaultContent: {
      title: 'Đăng ký nhận tin',
      subtitle: 'Nhận ưu đãi độc quyền',
    }
  },
];

const translations = {
  vi: {
    title: 'Quản lý trang chủ',
    subtitle: 'Tùy chỉnh các section hiển thị trên trang chủ',
    activeSections: 'Các section đang hoạt động',
    addSection: 'Thêm section',
    noSections: 'Chưa có section nào. Nhấn "Thêm section" để bắt đầu.',
    save: 'Lưu thay đổi',
    saving: 'Đang lưu...',
    saveSuccess: 'Đã lưu thành công!',
    saveError: 'Lỗi khi lưu',
    delete: 'Xóa',
    confirmDelete: 'Bạn có chắc muốn xóa section này?',
    visible: 'Hiển thị',
    hidden: 'Đã ẩn',
    dragToReorder: 'Kéo để sắp xếp thứ tự',
    sectionSettings: 'Cài đặt section',
    selectTemplate: 'Chọn loại section',
    cancel: 'Hủy',
    add: 'Thêm',
    preview: 'Xem trước',
  },
  en: {
    title: 'Homepage Management',
    subtitle: 'Customize sections displayed on homepage',
    activeSections: 'Active Sections',
    addSection: 'Add Section',
    noSections: 'No sections yet. Click "Add Section" to start.',
    save: 'Save Changes',
    saving: 'Saving...',
    saveSuccess: 'Saved successfully!',
    saveError: 'Error saving',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this section?',
    visible: 'Visible',
    hidden: 'Hidden',
    dragToReorder: 'Drag to reorder',
    sectionSettings: 'Section Settings',
    selectTemplate: 'Select section type',
    cancel: 'Cancel',
    add: 'Add',
    preview: 'Preview',
  }
};

const HomeComponent: React.FC = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.vi;

  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Fetch sections
  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{ success: boolean; data: PageSection[] }>('/page-sections?includeHidden=true');
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

  // Toggle visibility
  const toggleVisibility = async (section: PageSection) => {
    try {
      await api.put(`/page-sections/${section.id}`, {
        isVisible: !section.isVisible
      });
      setSections(prev => prev.map(s => 
        s.id === section.id ? { ...s, isVisible: !s.isVisible } : s
      ));
    } catch (err) {
      setError('Lỗi khi cập nhật');
      console.error(err);
    }
  };

  // Delete section
  const deleteSection = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;
    
    try {
      await api.delete(`/page-sections/${id}`);
      setSections(prev => prev.filter(s => s.id !== id));
      setSuccess('Đã xóa section');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Lỗi khi xóa section');
      console.error(err);
    }
  };

  // Add new section
  const addSection = async (template: SectionTemplate) => {
    try {
      setSaving(true);
      const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.order)) : 0;
      
      const response = await api.post<{ success: boolean; data: PageSection }>('/page-sections', {
        code: `${template.code}_${Date.now()}`,
        name: template.name,
        isVisible: true,
        order: maxOrder + 1,
        content: template.defaultContent,
      });
      
      if (response.success) {
        setSections(prev => [...prev, response.data]);
        setShowAddModal(false);
        setSuccess('Đã thêm section mới');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Lỗi khi thêm section');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Update section content
  const updateSectionContent = async (section: PageSection, content: Record<string, unknown>) => {
    try {
      await api.put(`/page-sections/${section.id}`, { content });
      setSections(prev => prev.map(s => 
        s.id === section.id ? { ...s, content } : s
      ));
      setEditingSection(null);
      setSuccess('Đã cập nhật section');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Lỗi khi cập nhật');
      console.error(err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newSections = [...sections];
    const draggedSection = newSections[draggedItem];
    newSections.splice(draggedItem, 1);
    newSections.splice(index, 0, draggedSection);
    
    // Update order
    newSections.forEach((s, i) => s.order = i);
    setSections(newSections);
    setDraggedItem(index);
  };

  const handleDragEnd = async () => {
    if (draggedItem === null) return;
    
    // Save new order to backend
    try {
      for (const section of sections) {
        await api.put(`/page-sections/${section.id}`, { order: section.order });
      }
    } catch (err) {
      console.error('Error saving order:', err);
    }
    
    setDraggedItem(null);
  };

  // Get icon for section
  const getSectionIcon = (code: string) => {
    const template = sectionTemplates.find(t => code.startsWith(t.code));
    return template?.icon || Layout;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-sm transition-colors"
        >
          <Plus size={18} />
          {t.addSection}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={18} className="text-red-500" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-green-500 shrink-0" size={20} />
          <p className="text-green-700 dark:text-green-400 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Sections List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white">{t.activeSections}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.dragToReorder}</p>
        </div>

        {sections.length === 0 ? (
          <div className="p-12 text-center">
            <Layout className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">{t.noSections}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {sections.map((section, index) => {
              const Icon = getSectionIcon(section.code);
              return (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`p-4 flex items-center gap-4 cursor-move transition-colors ${
                    draggedItem === index ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  } ${!section.isVisible ? 'opacity-50' : ''}`}
                >
                  {/* Drag Handle */}
                  <div className="text-slate-400 dark:text-slate-600">
                    <GripVertical size={20} />
                  </div>

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    section.isVisible 
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Icon size={20} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                      {section.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {section.code}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    section.isVisible
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {section.isVisible ? t.visible : t.hidden}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleVisibility(section)}
                      className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title={section.isVisible ? 'Ẩn' : 'Hiển thị'}
                    >
                      {section.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                      onClick={() => setEditingSection(section)}
                      className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title={t.sectionSettings}
                    >
                      <Settings size={18} />
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t.delete}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.selectTemplate}</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sectionTemplates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.code}
                      onClick={() => addSection(template)}
                      disabled={saving}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl text-left hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center group-hover:bg-primary-500 group-hover:text-white transition-colors">
                          <Icon size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white">
                            {template.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <SectionEditor
          section={editingSection}
          onSave={(content) => updateSectionContent(editingSection, content)}
          onClose={() => setEditingSection(null)}
          t={t}
        />
      )}
    </div>
  );
};

// Section Editor Component
interface SectionEditorProps {
  section: PageSection;
  onSave: (content: Record<string, unknown>) => void;
  onClose: () => void;
  t: typeof translations.vi;
}

const SectionEditor: React.FC<SectionEditorProps> = ({ section, onSave, onClose, t }) => {
  const [content, setContent] = useState<Record<string, unknown>>(
    (section.content as Record<string, unknown>) || {}
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(content);
    setSaving(false);
  };

  const updateField = (key: string, value: unknown) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.sectionSettings}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{section.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
          {Object.entries(content).map(([key, value]) => {
            // Check if this is a rich text field (content field in text sections)
            const isRichTextField = key === 'content' && section.code.startsWith('text');
            
            return (
            <div key={key} className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {key.replace(/_/g, ' ')}
              </label>
              {isRichTextField ? (
                <LexicalEditor
                  initialValue={(value as string) || ''}
                  onChange={(html) => updateField(key, html)}
                  placeholder="Nhập nội dung văn bản..."
                  minHeight="200px"
                />
              ) : typeof value === 'string' && value.length > 100 ? (
                <textarea
                  value={value as string}
                  onChange={(e) => updateField(key, e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-slate-200"
                />
              ) : typeof value === 'number' ? (
                <input
                  type="number"
                  value={value as number}
                  onChange={(e) => updateField(key, parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-slate-200"
                />
              ) : typeof value === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => updateField(key, e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {value ? 'Bật' : 'Tắt'}
                  </span>
                </label>
              ) : (
                <input
                  type="text"
                  value={(value as string) || ''}
                  onChange={(e) => updateField(key, e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-slate-200"
                />
              )}
            </div>
          );
          })}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeComponent;

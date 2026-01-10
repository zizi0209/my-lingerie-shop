'use client';

import React, { useState, useEffect } from 'react';
import { 
  Ruler, Save, Loader2, AlertCircle, CheckCircle, 
  ChevronDown, ChevronRight, Edit3, Eye, EyeOff,
  Plus, Trash2, ArrowLeft, BarChart3, Info
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '../components/LanguageContext';

// Types
type ProductType = 'BRA' | 'PANTY' | 'SET' | 'SLEEPWEAR' | 'SHAPEWEAR' | 'ACCESSORY';

interface SizeEntry {
  size: string;
  [key: string]: string;
}

interface MeasurementStep {
  name: string;
  description: string;
  image?: string;
}

interface SizeChartTemplate {
  id: number;
  productType: ProductType;
  name: string;
  description: string | null;
  headers: string[];
  sizes: SizeEntry[];
  measurements: MeasurementStep[];
  tips: string[];
  internationalSizes: Record<string, unknown> | null;
  measurementImage: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStats {
  productsByType: { type: ProductType; count: number }[];
  customSizeChartCount: number;
}

const PRODUCT_TYPE_INFO: Record<ProductType, { label: string; labelVi: string; color: string; icon: string }> = {
  BRA: { label: 'Bra', labelVi: 'Áo lót', color: 'bg-pink-500', icon: '👙' },
  PANTY: { label: 'Panty', labelVi: 'Quần lót', color: 'bg-purple-500', icon: '🩲' },
  SET: { label: 'Set', labelVi: 'Set đồ lót', color: 'bg-rose-500', icon: '💝' },
  SLEEPWEAR: { label: 'Sleepwear', labelVi: 'Đồ ngủ', color: 'bg-indigo-500', icon: '👗' },
  SHAPEWEAR: { label: 'Shapewear', labelVi: 'Đồ định hình', color: 'bg-amber-500', icon: '🎀' },
  ACCESSORY: { label: 'Accessory', labelVi: 'Phụ kiện', color: 'bg-slate-500', icon: '✨' },
};

const SizeChartsManager: React.FC = () => {
  const { language } = useLanguage();
  
  // State
  const [templates, setTemplates] = useState<SizeChartTemplate[]>([]);
  const [stats, setStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // UI State
  const [selectedType, setSelectedType] = useState<ProductType | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SizeChartTemplate | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<ProductType>>(new Set());

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý bảng size' : 'Size Charts Manager',
    subtitle: language === 'vi' ? 'Cấu hình bảng size cho từng loại sản phẩm' : 'Configure size charts for each product type',
    save: language === 'vi' ? 'Lưu thay đổi' : 'Save Changes',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    edit: language === 'vi' ? 'Chỉnh sửa' : 'Edit',
    preview: language === 'vi' ? 'Xem trước' : 'Preview',
    active: language === 'vi' ? 'Đang hiển thị' : 'Active',
    inactive: language === 'vi' ? 'Đã ẩn' : 'Hidden',
    noData: language === 'vi' ? 'Chưa có dữ liệu' : 'No data',
    loadError: language === 'vi' ? 'Không thể tải dữ liệu' : 'Failed to load data',
    saveSuccess: language === 'vi' ? 'Đã lưu thành công!' : 'Saved successfully!',
    products: language === 'vi' ? 'sản phẩm' : 'products',
    customCharts: language === 'vi' ? 'bảng size tùy chỉnh' : 'custom size charts',
    
    // Sections
    basicInfo: language === 'vi' ? 'Thông tin cơ bản' : 'Basic Information',
    sizeTable: language === 'vi' ? 'Bảng size' : 'Size Table',
    measurements: language === 'vi' ? 'Hướng dẫn đo' : 'Measurement Guide',
    tips: language === 'vi' ? 'Mẹo chọn size' : 'Size Tips',
    
    // Fields
    name: language === 'vi' ? 'Tên bảng size' : 'Chart Name',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    headers: language === 'vi' ? 'Tiêu đề cột' : 'Column Headers',
    note: language === 'vi' ? 'Ghi chú' : 'Note',
    
    // Actions
    addRow: language === 'vi' ? 'Thêm dòng' : 'Add Row',
    addColumn: language === 'vi' ? 'Thêm cột' : 'Add Column',
    addTip: language === 'vi' ? 'Thêm mẹo' : 'Add Tip',
    addMeasurement: language === 'vi' ? 'Thêm bước đo' : 'Add Measurement',
    back: language === 'vi' ? 'Quay lại' : 'Back',
  };

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; data: SizeChartTemplate[] }>('/admin/size-templates'),
        api.get<{ success: boolean; data: TemplateStats }>('/admin/size-templates/stats/usage'),
      ]);
      
      if (templatesRes.success) {
        setTemplates(templatesRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  // Toggle template visibility
  const handleToggleActive = async (type: ProductType) => {
    try {
      const res = await api.patch<{ success: boolean; data: SizeChartTemplate }>(
        `/admin/size-templates/${type}/toggle`
      );
      if (res.success) {
        setTemplates(prev => prev.map(t => 
          t.productType === type ? { ...t, isActive: res.data.isActive } : t
        ));
        setSuccess(res.data.isActive ? t.active : t.inactive);
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  // Save template changes
  const handleSave = async () => {
    if (!editingTemplate) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await api.put<{ success: boolean; data: SizeChartTemplate }>(
        `/admin/size-templates/${editingTemplate.productType}`,
        {
          name: editingTemplate.name,
          description: editingTemplate.description,
          headers: editingTemplate.headers,
          sizes: editingTemplate.sizes,
          measurements: editingTemplate.measurements,
          tips: editingTemplate.tips,
          note: editingTemplate.note,
          isActive: editingTemplate.isActive,
        }
      );
      
      if (res.success) {
        setTemplates(prev => prev.map(t => 
          t.productType === editingTemplate.productType ? res.data : t
        ));
        setSuccess(t.saveSuccess);
        setEditingTemplate(null);
        setSelectedType(null);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Start editing
  const handleEdit = (template: SizeChartTemplate) => {
    setSelectedType(template.productType);
    setEditingTemplate({ ...template });
  };

  // Update editing template
  const updateTemplate = (updates: Partial<SizeChartTemplate>) => {
    if (!editingTemplate) return;
    setEditingTemplate({ ...editingTemplate, ...updates });
  };

  // Toggle expand
  const toggleExpand = (type: ProductType) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Get product count for type
  const getProductCount = (type: ProductType): number => {
    if (!stats) return 0;
    const found = stats.productsByType.find(p => p.type === type);
    return found?.count || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary-500" />
        <span className="ml-3 text-slate-500 font-medium">
          {language === 'vi' ? 'Đang tải...' : 'Loading...'}
        </span>
      </div>
    );
  }

  // Edit mode
  if (selectedType && editingTemplate) {
    return (
      <SizeChartEditor
        template={editingTemplate}
        onUpdate={updateTemplate}
        onSave={handleSave}
        onCancel={() => {
          setSelectedType(null);
          setEditingTemplate(null);
        }}
        saving={saving}
        error={error}
        t={t}
        language={language}
      />
    );
  }

  // List view
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic flex items-center gap-3">
            <Ruler size={28} className="text-primary-500" />
            {t.title}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{t.subtitle}</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-emerald-500 shrink-0" size={20} />
          <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Stats Card */}
      {stats && (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-50 dark:bg-primary-500/10 rounded-xl">
              <BarChart3 size={20} className="text-primary-500" />
            </div>
            <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
              {language === 'vi' ? 'Thống kê' : 'Statistics'}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {Object.entries(PRODUCT_TYPE_INFO).map(([type, info]) => {
              const count = getProductCount(type as ProductType);
              return (
                <div key={type} className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-2xl">{info.icon}</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'vi' ? info.labelVi : info.label}
                  </p>
                  <p className="text-lg font-black text-slate-900 dark:text-white">{count}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            {stats.customSizeChartCount} {t.customCharts}
          </p>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-3">
        {templates.map((template) => {
          const info = PRODUCT_TYPE_INFO[template.productType];
          const isExpanded = expandedTemplates.has(template.productType);
          const productCount = getProductCount(template.productType);
          
          return (
            <div 
              key={template.productType}
              className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div 
                className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => toggleExpand(template.productType)}
              >
                <div className="flex items-center gap-4">
                  <button className="text-slate-400">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  <span className="text-2xl">{info.icon}</span>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {template.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {template.productType} • {productCount} {t.products}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Active toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleActive(template.productType);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      template.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {template.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                    {template.isActive ? t.active : t.inactive}
                  </button>
                  
                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(template);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 flex items-center gap-1.5 hover:bg-primary-200 dark:hover:bg-primary-500/30 transition-colors"
                  >
                    <Edit3 size={14} />
                    {t.edit}
                  </button>
                </div>
              </div>
              
              {/* Expanded Content - Preview */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-0 border-t border-slate-100 dark:border-slate-800">
                  <div className="mt-4 space-y-4">
                    {/* Description */}
                    {template.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">{template.description}</p>
                    )}
                    
                    {/* Size Table Preview */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800">
                            {template.headers.map((header, i) => (
                              <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-300">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(template.sizes as SizeEntry[]).slice(0, 4).map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                              {template.headers.map((header, j) => {
                                const key = header.toLowerCase().replace(/\s+/g, '');
                                const value = row[key] || row[Object.keys(row)[j]] || '-';
                                return (
                                  <td key={j} className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                    {typeof value === 'string' ? value : '-'}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(template.sizes as SizeEntry[]).length > 4 && (
                        <p className="text-xs text-slate-400 mt-2 text-center">
                          +{(template.sizes as SizeEntry[]).length - 4} {language === 'vi' ? 'dòng khác' : 'more rows'}
                        </p>
                      )}
                    </div>
                    
                    {/* Tips preview */}
                    {template.tips.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {template.tips.slice(0, 2).map((tip, i) => (
                          <span key={i} className="px-3 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs rounded-lg">
                            💡 {tip.length > 50 ? tip.slice(0, 50) + '...' : tip}
                          </span>
                        ))}
                        {template.tips.length > 2 && (
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs rounded-lg">
                            +{template.tips.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state for ACCESSORY */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
        <Info size={24} className="mx-auto text-slate-400 mb-2" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {language === 'vi' 
            ? 'Loại "Phụ kiện" (ACCESSORY) không có bảng size vì không cần chọn size.'
            : 'The "Accessory" type has no size chart as it doesn\'t require size selection.'}
        </p>
      </div>
    </div>
  );
};

// ==================== EDITOR COMPONENT ====================

interface EditorProps {
  template: SizeChartTemplate;
  onUpdate: (updates: Partial<SizeChartTemplate>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
  t: Record<string, string>;
  language: string;
}

const SizeChartEditor: React.FC<EditorProps> = ({
  template,
  onUpdate,
  onSave,
  onCancel,
  saving,
  error,
  t,
  language
}) => {
  const info = PRODUCT_TYPE_INFO[template.productType];
  
  // Add new size row
  const addSizeRow = () => {
    const newRow: SizeEntry = { size: '' };
    template.headers.forEach((h, i) => {
      if (i > 0) newRow[h.toLowerCase().replace(/\s+/g, '')] = '';
    });
    onUpdate({ sizes: [...template.sizes, newRow] });
  };
  
  // Remove size row
  const removeSizeRow = (index: number) => {
    onUpdate({ sizes: template.sizes.filter((_, i) => i !== index) });
  };
  
  // Update size cell
  const updateSizeCell = (rowIndex: number, key: string, value: string) => {
    const newSizes = [...template.sizes];
    newSizes[rowIndex] = { ...newSizes[rowIndex], [key]: value };
    onUpdate({ sizes: newSizes });
  };
  
  // Add tip
  const addTip = () => {
    onUpdate({ tips: [...template.tips, ''] });
  };
  
  // Update tip
  const updateTip = (index: number, value: string) => {
    const newTips = [...template.tips];
    newTips[index] = value;
    onUpdate({ tips: newTips });
  };
  
  // Remove tip
  const removeTip = (index: number) => {
    onUpdate({ tips: template.tips.filter((_, i) => i !== index) });
  };
  
  // Add measurement
  const addMeasurement = () => {
    onUpdate({ 
      measurements: [...template.measurements, { name: '', description: '' }] 
    });
  };
  
  // Update measurement
  const updateMeasurement = (index: number, field: 'name' | 'description', value: string) => {
    const newMeasurements = [...template.measurements];
    newMeasurements[index] = { ...newMeasurements[index], [field]: value };
    onUpdate({ measurements: newMeasurements });
  };
  
  // Remove measurement
  const removeMeasurement = (index: number) => {
    onUpdate({ measurements: template.measurements.filter((_, i) => i !== index) });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{info.icon}</span>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {t.edit}: {template.name}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{template.productType}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-200 dark:shadow-none transition-colors"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-red-500 shrink-0" size={20} />
          <p className="text-red-700 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{t.basicInfo}</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.name}</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-slate-200 font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {language === 'vi' ? 'Trạng thái' : 'Status'}
              </label>
              <button
                onClick={() => onUpdate({ isActive: !template.isActive })}
                className={`w-full px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                  template.isActive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {template.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                {template.isActive ? t.active : t.inactive}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.description}</label>
            <textarea
              value={template.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-slate-200 font-medium resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.note}</label>
            <textarea
              value={template.note || ''}
              onChange={(e) => onUpdate({ note: e.target.value })}
              rows={2}
              placeholder={language === 'vi' ? 'Ghi chú đặc biệt (hiển thị dưới bảng size)...' : 'Special notes (displayed below size table)...'}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:text-slate-200 font-medium resize-none"
            />
          </div>
        </div>
      </div>

      {/* Size Table */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{t.sizeTable}</h2>
          <button
            onClick={addSizeRow}
            className="px-3 py-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            {t.addRow}
          </button>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800">
                {template.headers.map((header, i) => (
                  <th key={i} className="px-3 py-2 text-left font-bold text-slate-700 dark:text-slate-300 min-w-[100px]">
                    {header}
                  </th>
                ))}
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {template.sizes.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-slate-100 dark:border-slate-800">
                  {template.headers.map((header, colIndex) => {
                    const key = colIndex === 0 ? 'size' : header.toLowerCase().replace(/\s+/g, '');
                    return (
                      <td key={colIndex} className="px-2 py-2">
                        <input
                          type="text"
                          value={row[key] || ''}
                          onChange={(e) => updateSizeCell(rowIndex, key, e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500 dark:text-slate-200"
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2">
                    <button
                      onClick={() => removeSizeRow(rowIndex)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {template.sizes.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">{t.noData}</p>
          )}
        </div>
      </div>

      {/* Measurements */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{t.measurements}</h2>
          <button
            onClick={addMeasurement}
            className="px-3 py-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            {t.addMeasurement}
          </button>
        </div>
        <div className="p-5 space-y-4">
          {template.measurements.map((m, i) => (
            <div key={i} className="flex gap-4 items-start p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  value={m.name}
                  onChange={(e) => updateMeasurement(i, 'name', e.target.value)}
                  placeholder={language === 'vi' ? 'Tên bước đo (VD: Vòng ngực)' : 'Measurement name'}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium outline-none focus:ring-1 focus:ring-primary-500 dark:text-slate-200"
                />
                <textarea
                  value={m.description}
                  onChange={(e) => updateMeasurement(i, 'description', e.target.value)}
                  placeholder={language === 'vi' ? 'Hướng dẫn cách đo...' : 'How to measure...'}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500 dark:text-slate-200 resize-none"
                />
              </div>
              <button
                onClick={() => removeMeasurement(i)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {template.measurements.length === 0 && (
            <p className="text-center text-slate-400 py-4 text-sm">{t.noData}</p>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{t.tips}</h2>
          <button
            onClick={addTip}
            className="px-3 py-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            {t.addTip}
          </button>
        </div>
        <div className="p-5 space-y-3">
          {template.tips.map((tip, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span className="text-amber-500">💡</span>
              <input
                type="text"
                value={tip}
                onChange={(e) => updateTip(i, e.target.value)}
                placeholder={language === 'vi' ? 'Nhập mẹo chọn size...' : 'Enter size tip...'}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500 dark:text-slate-200"
              />
              <button
                onClick={() => removeTip(i)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {template.tips.length === 0 && (
            <p className="text-center text-slate-400 py-4 text-sm">{t.noData}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SizeChartsManager;

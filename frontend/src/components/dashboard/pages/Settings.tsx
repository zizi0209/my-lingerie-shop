'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, Loader2, AlertCircle, CheckCircle, 
  Globe, Bell, Palette, Phone, Mail, MapPin, 
  Image as ImageIcon, Upload, X, Store, Facebook, Instagram,
  ShoppingCart, CreditCard, Zap, Settings as SettingsIcon,
  TrendingUp, Package, DollarSign, Shield
} from 'lucide-react';
import { api } from '@/lib/api';
import { useLanguage } from '../components/LanguageContext';
import { compressImage, ACCEPTED_IMAGE_TYPES, formatFileSize, type CompressedImage } from '@/lib/imageUtils';

interface SystemConfig {
  // Store Info
  store_name?: string;
  store_description?: string;
  store_email?: string;
  store_phone?: string;
  store_address?: string;
  store_logo?: string;
  store_favicon?: string;
  
  // Social
  social_facebook?: string;
  social_instagram?: string;
  social_tiktok?: string;
  
  // SEO
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  og_image?: string; // Open Graph Image URL
  
  // Notifications
  notify_order_email?: string;
  notify_low_stock?: string;
  notification_emails?: string; // Comma-separated emails
  low_stock_threshold?: string; // Number as string
  
  // Shipping & Orders
  freeship_threshold?: string; // Number as string
  default_shipping_fee?: string; // Number as string
  
  // Payment
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  
  // Marketing & Integrations
  facebook_pixel_id?: string;
  google_analytics_id?: string;
  tiktok_pixel_id?: string;
  
  // Policies
  return_policy?: string; // Text or URL
  size_guide?: string; // Text or URL
  
  // System
  maintenance_mode?: string; // 'true' or 'false'
  
  // Theme
  primary_color?: string;
  secondary_color?: string;
}

const defaultConfig: SystemConfig = {
  store_name: '',
  store_description: '',
  store_email: '',
  store_phone: '',
  store_address: '',
  store_logo: '',
  store_favicon: '',
  social_facebook: '',
  social_instagram: '',
  social_tiktok: '',
  seo_title: '',
  seo_description: '',
  seo_keywords: '',
  og_image: '',
  notify_order_email: 'true',
  notify_low_stock: 'true',
  notification_emails: '',
  low_stock_threshold: '5',
  freeship_threshold: '500000',
  default_shipping_fee: '30000',
  bank_name: '',
  bank_account_number: '',
  bank_account_holder: '',
  facebook_pixel_id: '',
  google_analytics_id: '',
  tiktok_pixel_id: '',
  return_policy: '',
  size_guide: '',
  maintenance_mode: 'false',
  primary_color: '#f43f5e',
  secondary_color: '#8b5cf6',
};

type TabKey = 'general' | 'orders' | 'payment' | 'notifications' | 'integrations';

const Settings: React.FC = () => {
  const { language } = useLanguage();
  
  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Image upload
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState<CompressedImage | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // OG Image upload
  const ogImageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingOgImage, setUploadingOgImage] = useState<CompressedImage | null>(null);
  const [isCompressingOgImage, setIsCompressingOgImage] = useState(false);

  // Translations
  const t = {
    title: language === 'vi' ? 'Cài đặt hệ thống' : 'System Settings',
    subtitle: language === 'vi' ? 'Cấu hình thông tin cửa hàng và hệ thống' : 'Configure store and system settings',
    save: language === 'vi' ? 'Lưu thay đổi' : 'Save Changes',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    saveSuccess: language === 'vi' ? 'Đã lưu cấu hình thành công!' : 'Settings saved successfully!',
    loadError: language === 'vi' ? 'Không thể tải cấu hình' : 'Cannot load settings',
    
    // Tabs
    tabGeneral: language === 'vi' ? 'Chung' : 'General',
    tabOrders: language === 'vi' ? 'Đơn hàng' : 'Orders',
    tabPayment: language === 'vi' ? 'Thanh toán' : 'Payment',
    tabNotifications: language === 'vi' ? 'Thông báo' : 'Notifications',
    tabIntegrations: language === 'vi' ? 'Tích hợp' : 'Integrations',
    
    // Sections
    storeInfo: language === 'vi' ? 'Thông tin cửa hàng' : 'Store Information',
    socialMedia: language === 'vi' ? 'Mạng xã hội' : 'Social Media',
    seoSettings: language === 'vi' ? 'Cài đặt SEO' : 'SEO Settings',
    notifications: language === 'vi' ? 'Thông báo' : 'Notifications',
    appearance: language === 'vi' ? 'Giao diện' : 'Appearance',
    shippingSettings: language === 'vi' ? 'Cài đặt vận chuyển' : 'Shipping Settings',
    orderSettings: language === 'vi' ? 'Cài đặt đơn hàng' : 'Order Settings',
    bankInfo: language === 'vi' ? 'Thông tin ngân hàng' : 'Bank Information',
    marketingPixels: language === 'vi' ? 'Mã theo dõi Marketing' : 'Marketing Pixels',
    policies: language === 'vi' ? 'Chính sách & Hướng dẫn' : 'Policies & Guides',
    systemSettings: language === 'vi' ? 'Cài đặt hệ thống' : 'System Settings',
    
    // Fields - Store
    storeName: language === 'vi' ? 'Tên cửa hàng' : 'Store Name',
    storeDesc: language === 'vi' ? 'Mô tả cửa hàng' : 'Store Description',
    storeEmail: language === 'vi' ? 'Email liên hệ' : 'Contact Email',
    storePhone: language === 'vi' ? 'Số điện thoại' : 'Phone Number',
    storeAddress: language === 'vi' ? 'Địa chỉ' : 'Address',
    storeLogo: language === 'vi' ? 'Logo cửa hàng' : 'Store Logo',
    
    // Fields - Social
    facebook: 'Facebook',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    
    // Fields - SEO
    seoTitle: language === 'vi' ? 'Tiêu đề SEO' : 'SEO Title',
    seoDescription: language === 'vi' ? 'Mô tả SEO' : 'SEO Description',
    seoKeywords: language === 'vi' ? 'Từ khóa SEO' : 'SEO Keywords',
    ogImage: language === 'vi' ? 'Ảnh chia sẻ (OG Image)' : 'Share Image (OG Image)',
    ogImageHelp: language === 'vi' ? 'Ảnh hiển thị khi chia sẻ website trên mạng xã hội (1200x630px khuyến nghị)' : 'Image displayed when sharing website on social media (1200x630px recommended)',
    uploadOgImage: language === 'vi' ? 'Tải ảnh lên' : 'Upload Image',
    removeOgImage: language === 'vi' ? 'Xóa ảnh' : 'Remove Image',
    
    // Fields - Notifications
    orderAlerts: language === 'vi' ? 'Thông báo đơn hàng mới qua email' : 'Email alerts for new orders',
    stockWarnings: language === 'vi' ? 'Cảnh báo hết hàng' : 'Low stock warnings',
    notificationEmails: language === 'vi' ? 'Email nhận thông báo' : 'Notification Emails',
    notificationEmailsHelp: language === 'vi' ? 'Nhập nhiều email cách nhau bằng dấu phẩy' : 'Enter multiple emails separated by commas',
    lowStockThreshold: language === 'vi' ? 'Ngưỡng cảnh báo hết hàng' : 'Low Stock Threshold',
    lowStockThresholdHelp: language === 'vi' ? 'Số lượng tồn kho tối thiểu để nhận cảnh báo' : 'Minimum stock quantity to trigger alert',
    
    // Fields - Shipping & Orders
    freeshipThreshold: language === 'vi' ? 'Ngưỡng miễn phí vận chuyển' : 'Free Shipping Threshold',
    freeshipThresholdHelp: language === 'vi' ? 'Giá trị đơn hàng tối thiểu để miễn phí ship' : 'Minimum order value for free shipping',
    defaultShippingFee: language === 'vi' ? 'Phí vận chuyển mặc định' : 'Default Shipping Fee',
    
    // Fields - Payment
    bankName: language === 'vi' ? 'Tên ngân hàng' : 'Bank Name',
    bankAccountNumber: language === 'vi' ? 'Số tài khoản' : 'Account Number',
    bankAccountHolder: language === 'vi' ? 'Chủ tài khoản' : 'Account Holder',
    
    // Fields - Marketing
    facebookPixel: language === 'vi' ? 'Facebook Pixel ID' : 'Facebook Pixel ID',
    googleAnalytics: language === 'vi' ? 'Google Analytics ID' : 'Google Analytics ID',
    tiktokPixel: language === 'vi' ? 'TikTok Pixel ID' : 'TikTok Pixel ID',
    
    // Fields - Policies
    returnPolicy: language === 'vi' ? 'Chính sách đổi trả' : 'Return Policy',
    returnPolicyHelp: language === 'vi' ? 'Nhập nội dung hoặc URL đến trang chính sách' : 'Enter policy text or URL',
    sizeGuide: language === 'vi' ? 'Hướng dẫn chọn size' : 'Size Guide',
    sizeGuideHelp: language === 'vi' ? 'Nhập hướng dẫn hoặc URL đến trang size guide' : 'Enter guide text or URL',
    
    // Fields - System
    maintenanceMode: language === 'vi' ? 'Chế độ bảo trì' : 'Maintenance Mode',
    maintenanceModeHelp: language === 'vi' ? 'Tạm đóng cửa website để bảo trì' : 'Temporarily close website for maintenance',
    
    // Fields - Theme
    primaryColor: language === 'vi' ? 'Màu chính' : 'Primary Color',
    secondaryColor: language === 'vi' ? 'Màu phụ' : 'Secondary Color',
    
    // Actions
    uploadLogo: language === 'vi' ? 'Tải logo lên' : 'Upload Logo',
    removeLogo: language === 'vi' ? 'Xóa logo' : 'Remove Logo',
    compressing: language === 'vi' ? 'Đang nén...' : 'Compressing...',
    
    // Currency
    vnd: language === 'vi' ? 'VNĐ' : 'VND',
    items: language === 'vi' ? 'sản phẩm' : 'items',
  };

  // Tab configurations
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'general', label: t.tabGeneral, icon: <Store size={18} /> },
    { key: 'orders', label: t.tabOrders, icon: <ShoppingCart size={18} /> },
    { key: 'payment', label: t.tabPayment, icon: <CreditCard size={18} /> },
    { key: 'notifications', label: t.tabNotifications, icon: <Bell size={18} /> },
    { key: 'integrations', label: t.tabIntegrations, icon: <Zap size={18} /> },
  ];

  // Fetch config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ success: boolean; data: SystemConfig }>('/admin/system-config');
        if (response.success) {
          setConfig({ ...defaultConfig, ...response.data });
        }
      } catch (err) {
        console.error('Failed to fetch config:', err);
        setError(t.loadError);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [t.loadError]);

  // Handle input change
  const handleChange = (key: keyof SystemConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Handle toggle change
  const handleToggle = (key: keyof SystemConfig) => {
    setConfig(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true'
    }));
  };

  // Handle logo upload
  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      setUploadingLogo(compressed);
    } catch (err) {
      console.error('Compression error:', err);
    } finally {
      setIsCompressing(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // Upload logo to server
  const uploadLogo = async (): Promise<string | null> => {
    if (!uploadingLogo) return config.store_logo || null;

    try {
      const formData = new FormData();
      formData.append('image', uploadingLogo.file);
      formData.append('folder', 'settings');

      const response = await api.uploadFile<{ success: boolean; data: { url: string } }>(
        '/media/single',
        formData
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

  // Save config
  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // Upload logo if pending
      let logoUrl = config.store_logo;
      if (uploadingLogo) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Upload OG Image if pending
      let ogImageUrl = config.og_image;
      if (uploadingOgImage) {
        const uploadedUrl = await uploadOgImage();
        if (uploadedUrl) {
          ogImageUrl = uploadedUrl;
        }
      }

      const configToSave = {
        ...config,
        store_logo: logoUrl,
        og_image: ogImageUrl,
      };

      await api.put('/admin/system-config', configToSave);
      
      setConfig(configToSave);
      setUploadingLogo(null);
      setUploadingOgImage(null);
      setSuccess(t.saveSuccess);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setUploadingLogo(null);
    setConfig(prev => ({ ...prev, store_logo: '' }));
  };

  // Handle OG Image upload
  const handleOgImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingOgImage(true);
    try {
      const compressed = await compressImage(file);
      setUploadingOgImage(compressed);
    } catch (err) {
      console.error('Compression error:', err);
    } finally {
      setIsCompressingOgImage(false);
      if (ogImageInputRef.current) ogImageInputRef.current.value = '';
    }
  };

  // Upload OG Image to server
  const uploadOgImage = async (): Promise<string | null> => {
    if (!uploadingOgImage) return config.og_image || null;

    try {
      const formData = new FormData();
      formData.append('image', uploadingOgImage.file);
      formData.append('folder', 'settings');

      const response = await api.uploadFile<{ success: boolean; data: { url: string } }>(
        '/media/single',
        formData
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

  // Remove OG Image
  const handleRemoveOgImage = () => {
    setUploadingOgImage(null);
    setConfig(prev => ({ ...prev, og_image: '' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-rose-500" />
        <span className="ml-3 text-slate-500 font-medium">
          {language === 'vi' ? 'Đang tải...' : 'Loading...'}
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{saving ? t.saving : t.save}</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-rose-500 shrink-0" size={20} />
          <p className="text-rose-700 dark:text-rose-400 text-sm font-medium">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="text-emerald-500 shrink-0" size={20} />
          <p className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {/* ==================== TAB: GENERAL ==================== */}
        {activeTab === 'general' && (
          <>
            {/* Store Information */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                  <Store size={20} className="text-rose-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.storeInfo}</h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Logo */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.storeLogo}</label>
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                      {(uploadingLogo || config.store_logo) ? (
                        <img 
                          src={uploadingLogo?.preview || config.store_logo} 
                          alt="Logo" 
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <ImageIcon size={32} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES}
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isCompressing}
                        className="px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg flex items-center gap-2"
                      >
                        {isCompressing ? (
                          <><Loader2 size={14} className="animate-spin" /> {t.compressing}</>
                        ) : (
                          <><Upload size={14} /> {t.uploadLogo}</>
                        )}
                      </button>
                      {(uploadingLogo || config.store_logo) && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                        >
                          <X size={14} /> {t.removeLogo}
                        </button>
                      )}
                      {uploadingLogo && (
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(uploadingLogo.compressedSize)} (-{uploadingLogo.reduction.toFixed(0)}%)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.storeName}</label>
                    <input
                      type="text"
                      value={config.store_name || ''}
                      onChange={(e) => handleChange('store_name', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Mail size={12} /> {t.storeEmail}
                    </label>
                    <input
                      type="email"
                      value={config.store_email || ''}
                      onChange={(e) => handleChange('store_email', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Phone size={12} /> {t.storePhone}
                    </label>
                    <input
                      type="tel"
                      value={config.store_phone || ''}
                      onChange={(e) => handleChange('store_phone', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <MapPin size={12} /> {t.storeAddress}
                    </label>
                    <input
                      type="text"
                      value={config.store_address || ''}
                      onChange={(e) => handleChange('store_address', e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.storeDesc}</label>
                  <textarea
                    value={config.store_description || ''}
                    onChange={(e) => handleChange('store_description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                  <Globe size={20} className="text-blue-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.socialMedia}</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Facebook size={12} /> {t.facebook}
                  </label>
                  <input
                    type="url"
                    value={config.social_facebook || ''}
                    onChange={(e) => handleChange('social_facebook', e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Instagram size={12} /> {t.instagram}
                  </label>
                  <input
                    type="url"
                    value={config.social_instagram || ''}
                    onChange={(e) => handleChange('social_instagram', e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.tiktok}</label>
                  <input
                    type="url"
                    value={config.social_tiktok || ''}
                    onChange={(e) => handleChange('social_tiktok', e.target.value)}
                    placeholder="https://tiktok.com/..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                  <SettingsIcon size={20} className="text-purple-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.systemSettings}</h2>
              </div>
              <div className="p-6">
                <div 
                  onClick={() => handleToggle('maintenance_mode')}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex items-center justify-between ${
                    config.maintenance_mode === 'true'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{t.maintenanceMode}</div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.maintenanceModeHelp}</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors ml-4 ${
                    config.maintenance_mode === 'true' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      config.maintenance_mode === 'true' ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
                  <Palette size={20} className="text-purple-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.appearance}</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.primaryColor}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.primary_color || '#f43f5e'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="w-12 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.primary_color || '#f43f5e'}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.secondaryColor}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.secondary_color || '#8b5cf6'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="w-12 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={config.secondary_color || '#8b5cf6'}
                      onChange={(e) => handleChange('secondary_color', e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB: ORDERS ==================== */}
        {activeTab === 'orders' && (
          <>
            {/* Shipping Settings */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                  <Package size={20} className="text-blue-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.shippingSettings}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.freeshipThreshold}</label>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.freeshipThresholdHelp}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.freeship_threshold || ''}
                        onChange={(e) => handleChange('freeship_threshold', e.target.value)}
                        placeholder="500000"
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                      />
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t.vnd}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.defaultShippingFee}</label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 opacity-0">Placeholder</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.default_shipping_fee || ''}
                        onChange={(e) => handleChange('default_shipping_fee', e.target.value)}
                        placeholder="30000"
                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                      />
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t.vnd}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB: PAYMENT ==================== */}
        {activeTab === 'payment' && (
          <>
            {/* Bank Information */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-xl">
                  <CreditCard size={20} className="text-green-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.bankInfo}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.bankName}</label>
                  <input
                    type="text"
                    value={config.bank_name || ''}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    placeholder="Vietcombank, Techcombank..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.bankAccountNumber}</label>
                  <input
                    type="text"
                    value={config.bank_account_number || ''}
                    onChange={(e) => handleChange('bank_account_number', e.target.value)}
                    placeholder="1234567890"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.bankAccountHolder}</label>
                  <input
                    type="text"
                    value={config.bank_account_holder || ''}
                    onChange={(e) => handleChange('bank_account_holder', e.target.value)}
                    placeholder="NGUYEN VAN A"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium uppercase"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB: NOTIFICATIONS ==================== */}
        {activeTab === 'notifications' && (
          <>
            {/* Notification Settings */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                  <Bell size={20} className="text-amber-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.notifications}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-3">
                  {/* Toggle: Low Stock Warnings */}
                  <div 
                    onClick={() => handleToggle('notify_low_stock')}
                    className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex items-center justify-between ${
                      config.notify_low_stock === 'true'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{t.stockWarnings}</span>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      config.notify_low_stock === 'true' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        config.notify_low_stock === 'true' ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>

                  {/* Low Stock Threshold - Only shown when alert is enabled */}
                  {config.notify_low_stock === 'true' && (
                    <div className="ml-4 space-y-2 pt-2 animate-in fade-in duration-300">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.lowStockThreshold}</label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.lowStockThresholdHelp}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={config.low_stock_threshold || ''}
                          onChange={(e) => handleChange('low_stock_threshold', e.target.value)}
                          placeholder="5"
                          min="0"
                          className="w-32 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                        />
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t.items}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200 dark:border-slate-700"></div>

                <div className="space-y-3">
                  {/* Toggle: Order Email Alerts */}
                  <div 
                    onClick={() => handleToggle('notify_order_email')}
                    className={`p-4 rounded-xl cursor-pointer border-2 transition-all flex items-center justify-between ${
                      config.notify_order_email === 'true'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{t.orderAlerts}</span>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                      config.notify_order_email === 'true' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        config.notify_order_email === 'true' ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </div>

                  {/* Notification Emails - Only shown when order alert is enabled */}
                  {config.notify_order_email === 'true' && (
                    <div className="ml-4 space-y-2 pt-2 animate-in fade-in duration-300">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Mail size={12} />
                        {t.notificationEmails}
                      </label>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.notificationEmailsHelp}</p>
                      <input
                        type="text"
                        value={config.notification_emails || ''}
                        onChange={(e) => handleChange('notification_emails', e.target.value)}
                        placeholder="admin@example.com, owner@example.com"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB: INTEGRATIONS ==================== */}
        {activeTab === 'integrations' && (
          <>
            {/* Marketing Pixels */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                  <TrendingUp size={20} className="text-indigo-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.marketingPixels}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Facebook size={12} />
                    {t.facebookPixel}
                  </label>
                  <input
                    type="text"
                    value={config.facebook_pixel_id || ''}
                    onChange={(e) => handleChange('facebook_pixel_id', e.target.value)}
                    placeholder="123456789012345"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Globe size={12} />
                    {t.googleAnalytics}
                  </label>
                  <input
                    type="text"
                    value={config.google_analytics_id || ''}
                    onChange={(e) => handleChange('google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX or UA-XXXXXXXXX-X"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.tiktokPixel}</label>
                  <input
                    type="text"
                    value={config.tiktok_pixel_id || ''}
                    onChange={(e) => handleChange('tiktok_pixel_id', e.target.value)}
                    placeholder="XXXXXXXXXXXXXX"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                  <Globe size={20} className="text-emerald-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.seoSettings}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.seoTitle}</label>
                  <input
                    type="text"
                    value={config.seo_title || ''}
                    onChange={(e) => handleChange('seo_title', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.seoDescription}</label>
                  <textarea
                    value={config.seo_description || ''}
                    onChange={(e) => handleChange('seo_description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.seoKeywords}</label>
                  <input
                    type="text"
                    value={config.seo_keywords || ''}
                    onChange={(e) => handleChange('seo_keywords', e.target.value)}
                    placeholder={language === 'vi' ? 'lingerie, nội y, đồ lót...' : 'lingerie, underwear, intimate...'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                  />
                </div>

                {/* OG Image */}
                <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-5">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.ogImage}</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.ogImageHelp}</p>
                  <div className="flex items-start gap-4">
                    <div className="w-48 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                      {(uploadingOgImage || config.og_image) ? (
                        <img 
                          src={uploadingOgImage?.preview || config.og_image} 
                          alt="OG Image" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <ImageIcon size={32} className="text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={ogImageInputRef}
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES}
                        onChange={handleOgImageSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => ogImageInputRef.current?.click()}
                        disabled={isCompressingOgImage}
                        className="px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg flex items-center gap-2"
                      >
                        {isCompressingOgImage ? (
                          <><Loader2 size={14} className="animate-spin" /> {t.compressing}</>
                        ) : (
                          <><Upload size={14} /> {t.uploadOgImage}</>
                        )}
                      </button>
                      {(uploadingOgImage || config.og_image) && (
                        <button
                          type="button"
                          onClick={handleRemoveOgImage}
                          className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2"
                        >
                          <X size={14} /> {t.removeOgImage}
                        </button>
                      )}
                      {uploadingOgImage && (
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(uploadingOgImage.compressedSize)} (-{uploadingOgImage.reduction.toFixed(0)}%)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Policies & Guides */}
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                  <Shield size={20} className="text-rose-500" />
                </div>
                <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{t.policies}</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.returnPolicy}</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.returnPolicyHelp}</p>
                  <textarea
                    value={config.return_policy || ''}
                    onChange={(e) => handleChange('return_policy', e.target.value)}
                    rows={4}
                    placeholder={language === 'vi' ? 'Nhập nội dung chính sách đổi trả hoặc URL...' : 'Enter return policy content or URL...'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.sizeGuide}</label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.sizeGuideHelp}</p>
                  <textarea
                    value={config.size_guide || ''}
                    onChange={(e) => handleChange('size_guide', e.target.value)}
                    rows={4}
                    placeholder={language === 'vi' ? 'Nhập hướng dẫn chọn size hoặc URL...' : 'Enter size guide content or URL...'}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}

      </div>
      
    </div>
  );
};

export default Settings;

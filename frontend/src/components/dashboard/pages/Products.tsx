'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, Wand2, Filter, Loader2, AlertCircle, X, 
  Image as ImageIcon, CheckCircle, Eye, EyeOff, Star, Package, Upload
} from 'lucide-react';
import { productApi, type Product, type ProductImage, type CreateProductData, type UpdateProductData } from '@/lib/productApi';
import { categoryApi, type Category } from '@/lib/categoryApi';
import { api } from '@/lib/api';
import { generateProductDescription } from '../services/geminiService';
import SearchInput from '../components/SearchInput';
import { useLanguage } from '../components/LanguageContext';
import { 
  compressImage, 
  type CompressedImage, 
  formatFileSize, 
  validateImageFile,
  revokePreviewUrls,
  ACCEPTED_IMAGE_TYPES 
} from '@/lib/imageUtils';

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  price: string;
  salePrice: string;
  categoryId: string;
  isFeatured: boolean;
  isVisible: boolean;
  newImages: string[];
  variants: Array<{ size: string; color: string; stock: string }>;
}

const initialFormData: ProductFormData = {
  name: '',
  slug: '',
  description: '',
  price: '',
  salePrice: '',
  categoryId: '',
  isFeatured: false,
  isVisible: true,
  newImages: [],
  variants: [{ size: '', color: '', stock: '' }],
};

const Products: React.FC = () => {
  const { language } = useLanguage();
  
  // List states
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // AI states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiProduct, setAIProduct] = useState<Product | null>(null);
  const [aiDescription, setAIDescription] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  // Deleting image state
  const [deletingImageId, setDeletingImageId] = useState<number | null>(null);

  // Image upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImages, setUploadingImages] = useState<CompressedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // Modal tab state
  const [activeTab, setActiveTab] = useState<'info' | 'images' | 'variants'>('info');

  // Existing variants for edit mode
  const [existingVariants, setExistingVariants] = useState<Array<{
    id: number;
    sku: string;
    size: string;
    color: string;
    stock: number;
    price: number | null;
    salePrice: number | null;
  }>>([]);

  // Translations
  const t = {
    title: language === 'vi' ? 'Quản lý sản phẩm' : 'Product Management',
    subtitle: language === 'vi' ? 'Quản lý danh mục sản phẩm của bạn' : 'Manage your product catalog',
    addNew: language === 'vi' ? 'Thêm sản phẩm' : 'Add Product',
    edit: language === 'vi' ? 'Sửa sản phẩm' : 'Edit Product',
    name: language === 'vi' ? 'Tên sản phẩm' : 'Product Name',
    slug: language === 'vi' ? 'Slug (URL)' : 'Slug (URL)',
    description: language === 'vi' ? 'Mô tả' : 'Description',
    price: language === 'vi' ? 'Giá' : 'Price',
    salePrice: language === 'vi' ? 'Giá khuyến mãi' : 'Sale Price',
    category: language === 'vi' ? 'Danh mục' : 'Category',
    selectCategory: language === 'vi' ? 'Chọn danh mục' : 'Select category',
    featured: language === 'vi' ? 'Sản phẩm nổi bật' : 'Featured Product',
    visible: language === 'vi' ? 'Hiển thị' : 'Visible',
    currentImages: language === 'vi' ? 'Hình ảnh hiện tại' : 'Current Images',
    addNewImages: language === 'vi' ? 'Thêm hình ảnh mới' : 'Add New Images',
    imageUrl: language === 'vi' ? 'URL hình ảnh' : 'Image URL',
    addImage: language === 'vi' ? 'Thêm ảnh' : 'Add Image',
    deleteImage: language === 'vi' ? 'Xóa ảnh' : 'Delete Image',
    noImages: language === 'vi' ? 'Chưa có hình ảnh' : 'No images yet',
    variants: language === 'vi' ? 'Biến thể sản phẩm' : 'Product Variants',
    size: language === 'vi' ? 'Kích thước' : 'Size',
    color: language === 'vi' ? 'Màu sắc' : 'Color',
    stock: language === 'vi' ? 'Tồn kho' : 'Stock',
    addVariant: language === 'vi' ? 'Thêm biến thể' : 'Add Variant',
    save: language === 'vi' ? 'Lưu' : 'Save',
    cancel: language === 'vi' ? 'Hủy' : 'Cancel',
    saving: language === 'vi' ? 'Đang lưu...' : 'Saving...',
    confirmDelete: language === 'vi' ? 'Bạn có chắc chắn muốn xóa sản phẩm này?' : 'Are you sure you want to delete this product?',
    confirmDeleteImage: language === 'vi' ? 'Xóa hình ảnh này?' : 'Delete this image?',
    deleteError: language === 'vi' ? 'Không thể xóa sản phẩm' : 'Cannot delete product',
    loadError: language === 'vi' ? 'Không thể tải danh sách sản phẩm' : 'Cannot load products',
    products: language === 'vi' ? 'sản phẩm' : 'products',
    filter: language === 'vi' ? 'Lọc' : 'Filter',
    loadingText: language === 'vi' ? 'Đang tải...' : 'Loading...',
    noProducts: language === 'vi' ? 'Không có sản phẩm nào' : 'No products found',
    details: language === 'vi' ? 'Chi tiết sản phẩm' : 'Product Details',
    status: language === 'vi' ? 'Trạng thái' : 'Status',
    actions: language === 'vi' ? 'Thao tác' : 'Actions',
    active: language === 'vi' ? 'Hiển thị' : 'Active',
    outOfStock: language === 'vi' ? 'Hết hàng' : 'Out of Stock',
    draft: language === 'vi' ? 'Nháp' : 'Draft',
    units: language === 'vi' ? 'đơn vị' : 'units',
    prev: language === 'vi' ? 'Trước' : 'Prev',
    next: language === 'vi' ? 'Sau' : 'Next',
    page: language === 'vi' ? 'Trang' : 'Page',
    search: language === 'vi' ? 'Tìm theo tên, mô tả...' : 'Search by name, description...',
    aiTitle: language === 'vi' ? 'AI Mô tả sản phẩm' : 'AI Product Description',
    aiGenerate: language === 'vi' ? 'Tạo mô tả' : 'Generate Description',
    aiGenerating: language === 'vi' ? 'Đang tạo...' : 'Generating...',
    aiUse: language === 'vi' ? 'Sử dụng mô tả này' : 'Use this description',
    aiRegenerate: language === 'vi' ? 'Tạo lại' : 'Regenerate',
    aiNoKey: language === 'vi' ? 'Chưa cấu hình API key. Vui lòng thêm NEXT_PUBLIC_GOOGLE_API_KEY vào file .env' : 'API key not configured. Please add NEXT_PUBLIC_GOOGLE_API_KEY to .env file',
    saveSuccess: language === 'vi' ? 'Lưu thành công!' : 'Saved successfully!',
    imageAdded: language === 'vi' ? 'Đã thêm hình ảnh' : 'Image added',
    imageDeleted: language === 'vi' ? 'Đã xóa hình ảnh' : 'Image deleted',
    uploadImages: language === 'vi' ? 'Tải ảnh lên' : 'Upload Images',
    selectFiles: language === 'vi' ? 'Chọn file hoặc kéo thả vào đây' : 'Select files or drag & drop here',
    compressing: language === 'vi' ? 'Đang nén ảnh...' : 'Compressing images...',
    uploading: language === 'vi' ? 'Đang tải lên...' : 'Uploading...',
    compressed: language === 'vi' ? 'Đã nén' : 'Compressed',
    reduction: language === 'vi' ? 'giảm' : 'reduced',
    uploadAndSave: language === 'vi' ? 'Tải lên & Lưu' : 'Upload & Save',
    pendingUpload: language === 'vi' ? 'Ảnh chờ tải lên' : 'Pending uploads',
    clearAll: language === 'vi' ? 'Xóa tất cả' : 'Clear all',
    webpOptimized: language === 'vi' ? 'Tự động chuyển đổi sang WebP để tối ưu dung lượng' : 'Auto-converted to WebP for optimal size',
    tabInfo: language === 'vi' ? 'Thông tin' : 'Info',
    tabImages: language === 'vi' ? 'Hình ảnh' : 'Images',
    tabVariants: language === 'vi' ? 'Biến thể' : 'Variants',
    sku: language === 'vi' ? 'Mã SKU' : 'SKU',
    variantPrice: language === 'vi' ? 'Giá riêng' : 'Custom Price',
    deleteVariant: language === 'vi' ? 'Xóa biến thể' : 'Delete Variant',
    confirmDeleteVariant: language === 'vi' ? 'Bạn có chắc chắn muốn xóa biến thể này?' : 'Are you sure you want to delete this variant?',
    variantDeleted: language === 'vi' ? 'Đã xóa biến thể' : 'Variant deleted',
    variantAdded: language === 'vi' ? 'Đã thêm biến thể' : 'Variant added',
    addVariantToProduct: language === 'vi' ? 'Thêm vào sản phẩm' : 'Add to Product',
    existingVariants: language === 'vi' ? 'Biến thể hiện có' : 'Existing Variants',
    newVariants: language === 'vi' ? 'Biến thể mới' : 'New Variants',
    noVariants: language === 'vi' ? 'Chưa có biến thể nào' : 'No variants yet',
  };

  // Load categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryApi.list({ limit: 100 });
        if (response.success) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productApi.list({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      });

      if (response.success) {
        setProducts(response.data);
        setPagination(response.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, categoryFilter, t.loadError]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts, refreshTrigger]);

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

  // Search handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Delete product
  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      await productApi.delete(id);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(t.deleteError);
    }
  };

  // Open create modal
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setExistingImages([]);
    setExistingVariants([]);
    setUploadingImages([]);
    setFormData(initialFormData);
    setFormError(null);
    setSuccessMessage(null);
    setActiveTab('info');
    setShowModal(true);
  };

  // Open edit modal
  const handleOpenEdit = async (product: Product) => {
    setEditingProduct(product);
    setExistingImages(product.images || []);
    setExistingVariants(product.variants || []);
    setUploadingImages([]);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: product.price.toString(),
      salePrice: product.salePrice?.toString() || '',
      categoryId: product.categoryId.toString(),
      isFeatured: product.isFeatured,
      isVisible: product.isVisible,
      newImages: [],
      variants: [{ size: '', color: '', stock: '' }],
    });
    setFormError(null);
    setSuccessMessage(null);
    setActiveTab('info');
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      if (editingProduct) {
        // Update product
        const updateData: UpdateProductData = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || undefined,
          price: Number(formData.price),
          salePrice: formData.salePrice ? Number(formData.salePrice) : undefined,
          categoryId: Number(formData.categoryId),
          isFeatured: formData.isFeatured,
          isVisible: formData.isVisible,
        };
        await productApi.update(editingProduct.id, updateData);

        // Add new images if any
        const validNewImages = formData.newImages.filter(url => url.trim());
        if (validNewImages.length > 0) {
          await productApi.images.add(editingProduct.id, validNewImages);
        }

        setSuccessMessage(t.saveSuccess);
        setRefreshTrigger(prev => prev + 1);
        
        // Refresh existing images
        const imagesRes = await productApi.images.list(editingProduct.id);
        if (imagesRes.success) {
          setExistingImages(imagesRes.data);
        }
        setFormData(prev => ({ ...prev, newImages: [] }));
      } else {
        // Create product
        // First, upload pending images to get URLs
        const uploadedImageUrls: string[] = [];
        if (uploadingImages.length > 0) {
          setUploadProgress(t.uploading);
          for (let i = 0; i < uploadingImages.length; i++) {
            const img = uploadingImages[i];
            setUploadProgress(`${t.uploading} (${i + 1}/${uploadingImages.length})`);
            
            const uploadFormData = new FormData();
            uploadFormData.append('image', img.file);
            uploadFormData.append('folder', 'products');

            try {
              const response = await api.uploadFile<{ success: boolean; data: { url: string } }>(
                '/media/single',
                uploadFormData
              );
              if (response.success && response.data?.url) {
                uploadedImageUrls.push(response.data.url);
              }
            } catch (uploadErr) {
              console.error('Upload error:', uploadErr);
            }
          }
          setUploadProgress('');
        }

        // Combine URL images and uploaded images
        const allImages = [
          ...formData.newImages.filter(url => url.trim()),
          ...uploadedImageUrls,
        ];

        // Validate required fields
        const priceNum = parseFloat(formData.price);
        const categoryIdNum = parseInt(formData.categoryId);
        
        if (!formData.name?.trim()) {
          setFormError('Vui lòng nhập tên sản phẩm');
          setSaving(false);
          return;
        }
        if (!formData.slug?.trim()) {
          setFormError('Vui lòng nhập slug');
          setSaving(false);
          return;
        }
        if (isNaN(priceNum) || priceNum <= 0) {
          setFormError('Vui lòng nhập giá hợp lệ');
          setSaving(false);
          return;
        }
        if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
          setFormError('Vui lòng chọn danh mục');
          setSaving(false);
          return;
        }

        const validVariants = formData.variants.filter(v => v.size && v.color);
        const createData: CreateProductData = {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description?.trim() || undefined,
          price: priceNum,
          salePrice: formData.salePrice ? parseFloat(formData.salePrice) : undefined,
          categoryId: categoryIdNum,
          isFeatured: formData.isFeatured,
          isVisible: formData.isVisible,
          images: allImages.length > 0 ? allImages : undefined,
          variants: validVariants.length > 0 ? validVariants.map(v => ({
            size: v.size,
            color: v.color,
            stock: parseInt(v.stock) || 0,
          })) : undefined,
        };

        await productApi.create(createData);
        
        // Cleanup
        revokePreviewUrls(uploadingImages);
        setUploadingImages([]);
        setShowModal(false);
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  // Delete existing image
  const handleDeleteImage = async (imageId: number) => {
    if (!confirm(t.confirmDeleteImage)) return;

    setDeletingImageId(imageId);
    try {
      await productApi.images.delete(imageId);
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      setSuccessMessage(t.imageDeleted);
    } catch (err) {
      console.error('Failed to delete image:', err);
      setFormError('Không thể xóa hình ảnh');
    } finally {
      setDeletingImageId(null);
    }
  };

  // Add new image field
  const handleAddNewImage = () => {
    setFormData(prev => ({ ...prev, newImages: [...prev.newImages, ''] }));
  };

  const handleRemoveNewImage = (index: number) => {
    setFormData(prev => ({ ...prev, newImages: prev.newImages.filter((_, i) => i !== index) }));
  };

  const handleNewImageChange = (index: number, value: string) => {
    const newImages = [...formData.newImages];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, newImages }));
  };

  // Handle file selection for upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    setFormError(null);

    try {
      const compressedList: CompressedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`${t.compressing} (${i + 1}/${files.length})`);

        // Validate file
        const validation = validateImageFile(file);
        if (!validation.valid) {
          setFormError(`${file.name}: ${validation.error}`);
          continue;
        }

        // Compress image
        const compressed = await compressImage(file);
        compressedList.push(compressed);
      }

      setUploadingImages(prev => [...prev, ...compressedList]);
      setUploadProgress('');
    } catch (err) {
      console.error('Compression error:', err);
      setFormError('Lỗi khi nén ảnh');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove pending upload image
  const handleRemoveUploadingImage = (index: number) => {
    setUploadingImages(prev => {
      const toRemove = prev[index];
      if (toRemove?.preview) {
        URL.revokeObjectURL(toRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  // Clear all pending uploads
  const handleClearAllUploads = () => {
    revokePreviewUrls(uploadingImages);
    setUploadingImages([]);
  };

  // Upload images to server (Cloudinary)
  const handleUploadImages = async () => {
    if (!editingProduct || uploadingImages.length === 0) return;

    setIsUploading(true);
    setFormError(null);

    try {
      const uploadedUrls: string[] = [];

      for (let i = 0; i < uploadingImages.length; i++) {
        const img = uploadingImages[i];
        setUploadProgress(`${t.uploading} (${i + 1}/${uploadingImages.length})`);

        // Upload via FormData to Cloudinary
        const uploadFormData = new FormData();
        uploadFormData.append('image', img.file);
        uploadFormData.append('folder', 'products');

        const response = await api.uploadFile<{ success: boolean; data: { url: string; id: number } }>(
          '/media/single',
          uploadFormData
        );

        if (response.success && response.data?.url) {
          uploadedUrls.push(response.data.url);
        } else {
          console.error('Upload failed for image:', img.file.name);
        }
      }

      // Add uploaded URLs to product images
      if (uploadedUrls.length > 0) {
        await productApi.images.add(editingProduct.id, uploadedUrls);

        // Refresh existing images list
        const imagesRes = await productApi.images.list(editingProduct.id);
        if (imagesRes.success) {
          setExistingImages(imagesRes.data);
        }

        // Clear pending uploads
        revokePreviewUrls(uploadingImages);
        setUploadingImages([]);
        setSuccessMessage(`${t.imageAdded} (${uploadedUrls.length})`);
        setRefreshTrigger(prev => prev + 1);
      } else {
        setFormError('Không thể upload ảnh. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Lỗi khi tải ảnh lên';
      setFormError(message);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Cleanup on modal close
  useEffect(() => {
    if (!showModal) {
      revokePreviewUrls(uploadingImages);
      setUploadingImages([]);
    }
  }, [showModal]);

  // Variant handlers
  const handleAddVariant = () => {
    setFormData(prev => ({ ...prev, variants: [...prev.variants, { size: '', color: '', stock: '' }] }));
  };

  const handleRemoveVariant = (index: number) => {
    if (formData.variants.length > 1) {
      setFormData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
    }
  };

  const handleVariantChange = (index: number, field: 'size' | 'color' | 'stock', value: string) => {
    const newVariants = [...formData.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  // AI Description
  const handleOpenAI = (product: Product) => {
    setAIProduct(product);
    setAIDescription('');
    setAIError(null);
    setShowAIModal(true);
  };

  const handleGenerateAI = async () => {
    if (!aiProduct) return;

    // Check API key
    if (!process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
      setAIError(t.aiNoKey);
      return;
    }

    setAILoading(true);
    setAIError(null);

    try {
      const features = `${aiProduct.category?.name || ''}, giá ${formatCurrency(aiProduct.price)}`;
      const result = await generateProductDescription(aiProduct.name, features);
      setAIDescription(result);
    } catch (err) {
      console.error('AI generation error:', err);
      setAIError(err instanceof Error ? err.message : 'Không thể tạo mô tả');
    } finally {
      setAILoading(false);
    }
  };

  const handleUseAIDescription = async () => {
    if (!aiProduct || !aiDescription) return;

    try {
      await productApi.update(aiProduct.id, { description: aiDescription });
      setShowAIModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setAIError('Không thể lưu mô tả');
    }
  };

  // Helpers
  const getTotalStock = (product: Product): number => {
    return product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  };

  const getProductStatus = (product: Product): 'active' | 'out_of_stock' | 'draft' => {
    if (!product.isVisible) return 'draft';
    if (getTotalStock(product) === 0) return 'out_of_stock';
    return 'active';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{t.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t.subtitle}</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-rose-200 dark:shadow-rose-950/20 active:scale-95"
        >
          <Plus size={20} />
          <span>{t.addNew}</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-rose-500" size={20} />
          <p className="text-rose-700 dark:text-rose-400 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {/* Search */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/20">
          <SearchInput
            placeholder={t.search}
            className="w-full max-w-sm"
            onSearch={handleSearch}
          />
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {pagination.total} {t.products}
            </span>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">{language === 'vi' ? 'Tất cả danh mục' : 'All Categories'}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">{t.details}</th>
                <th className="px-6 py-4">{t.category}</th>
                <th className="px-6 py-4">{t.price}</th>
                <th className="px-6 py-4">{t.stock}</th>
                <th className="px-6 py-4">{t.status}</th>
                <th className="px-6 py-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                      <span className="text-slate-500 dark:text-slate-400">{t.loadingText}</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">{t.noProducts}</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const stock = getTotalStock(product);
                  const status = getProductStatus(product);
                  const mainImage = product.images?.[0]?.url;

                  return (
                    <tr key={product.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-500/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                            {mainImage ? (
                              <img src={mainImage} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon size={20} className="text-slate-400" />
                              </div>
                            )}
                            {product.images?.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[10px] px-1 rounded">
                                +{product.images.length - 1}
                              </span>
                            )}
                            {stock === 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-200 text-sm group-hover:text-rose-600 transition-colors">
                                {product.name}
                              </span>
                              {product.isFeatured && <Star size={14} className="text-amber-500 fill-amber-500" />}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">ID: {product.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg">
                          {product.category?.name || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-slate-200 text-sm">
                            {formatCurrency(product.price)}
                          </span>
                          {product.salePrice && (
                            <span className="text-[10px] text-rose-500 font-bold">
                              Sale: {formatCurrency(product.salePrice)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-xs font-bold ${stock < 10 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}>
                            {stock} {t.units}
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${stock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(stock, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                          status === 'out_of_stock' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500'
                        }`}>
                          {status === 'active' ? t.active : status === 'out_of_stock' ? t.outOfStock : t.draft}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenAI(product)}
                            className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-all"
                            title="AI Description"
                          >
                            <Wand2 size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && products.length > 0 && pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t.page} {pagination.page} / {pagination.pages}
            </div>
            <div className="flex items-center gap-2">
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
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {editingProduct ? t.edit : t.addNew}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 shrink-0">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('info')}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Package size={16} className="inline mr-2" />
                  {t.tabInfo}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('images')}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'images' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <ImageIcon size={16} className="inline mr-2" />
                  {t.tabImages}
                  {(existingImages.length > 0 || uploadingImages.length > 0) && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full">
                      {existingImages.length + uploadingImages.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('variants')}
                  className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'variants' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  <Filter size={16} className="inline mr-2" />
                  {t.tabVariants}
                  {existingVariants.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full">
                      {existingVariants.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
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

                {/* TAB: Info */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              slug: !editingProduct ? generateSlug(name) : prev.slug,
                            }));
                          }}
                          required
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.slug} *</label>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          required
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.description}</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.price} (VND) *</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          required
                          min="0"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.salePrice}</label>
                        <input
                          type="number"
                          value={formData.salePrice}
                          onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
                          min="0"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.category} *</label>
                        <select
                          value={formData.categoryId}
                          onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                          required
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 font-medium"
                        >
                          <option value="">{t.selectCategory}</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isFeatured}
                          onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                          className="w-5 h-5 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Star size={16} /> {t.featured}
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isVisible}
                          onChange={(e) => setFormData(prev => ({ ...prev, isVisible: e.target.checked }))}
                          className="w-5 h-5 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          {formData.isVisible ? <Eye size={16} /> : <EyeOff size={16} />} {t.visible}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB: Images */}
                {activeTab === 'images' && (
                  <div className="space-y-6">
                    {/* Existing Images (Edit mode) */}
                    {editingProduct && existingImages.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.currentImages}</label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                          {existingImages.map((img, idx) => (
                            <div key={img.id || `img-${idx}`} className="relative group aspect-square">
                              <img src={img.url} alt="" className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(img.id)}
                                disabled={deletingImageId === img.id}
                                className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                              >
                                {deletingImageId === img.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload Images with WebP Compression */}
                    <div className="space-y-3 p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <Upload size={14} />
                            {t.uploadImages}
                          </label>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1">{t.webpOptimized}</p>
                        </div>
                        {uploadingImages.length > 0 && (
                          <button type="button" onClick={handleClearAllUploads} className="text-xs font-bold text-rose-500 hover:text-rose-600">
                            {t.clearAll}
                          </button>
                        )}
                      </div>

                      <div 
                        className="border-2 border-dashed border-emerald-300 dark:border-emerald-500/40 rounded-xl p-6 text-center hover:border-emerald-400 dark:hover:border-emerald-500/60 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_IMAGE_TYPES} onChange={handleFileSelect} className="hidden" />
                        {isCompressing ? (
                          <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Loader2 size={20} className="animate-spin" />
                            <span className="text-sm font-medium">{uploadProgress || t.compressing}</span>
                          </div>
                        ) : (
                          <div className="text-emerald-600 dark:text-emerald-400">
                            <Upload size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">{t.selectFiles}</p>
                            <p className="text-xs opacity-70 mt-1">JPG, PNG, GIF, WebP (max 10MB)</p>
                          </div>
                        )}
                      </div>

                      {uploadingImages.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {t.pendingUpload} ({uploadingImages.length})
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            {uploadingImages.map((img, index) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square rounded-xl overflow-hidden border-2 border-emerald-300 dark:border-emerald-500/40">
                                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                                </div>
                                <button type="button" onClick={() => handleRemoveUploadingImage(index)} className="absolute top-1 right-1 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X size={12} />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] px-2 py-1 text-center">
                                  <span className="text-emerald-400">{formatFileSize(img.compressedSize)}</span>
                                  <span className="text-slate-400 ml-1">(-{img.reduction.toFixed(0)}%)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {editingProduct && (
                            <button
                              type="button"
                              onClick={handleUploadImages}
                              disabled={isUploading}
                              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                              {isUploading ? (
                                <>
                                  <Loader2 size={16} className="animate-spin" />
                                  {uploadProgress || t.uploading}
                                </>
                              ) : (
                                <>
                                  <Upload size={16} />
                                  {t.uploadAndSave}
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* URL Images */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          {t.imageUrl} (URL)
                        </label>
                        <button type="button" onClick={handleAddNewImage} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1">
                          <Plus size={14} />
                          {t.addImage}
                        </button>
                      </div>
                      {formData.newImages.map((url, index) => (
                        <div key={index} className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <ImageIcon size={18} className="text-slate-400 shrink-0" />
                            <input
                              type="url"
                              value={url}
                              onChange={(e) => handleNewImageChange(index, e.target.value)}
                              placeholder="https://example.com/image.jpg"
                              className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 text-sm"
                            />
                            {url && <img src={url} alt="" className="w-10 h-10 object-cover rounded-lg border" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                          </div>
                          <button type="button" onClick={() => handleRemoveNewImage(index)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB: Variants */}
                {activeTab === 'variants' && (
                  <div className="space-y-6">
                    {/* Existing Variants (Edit mode) */}
                    {editingProduct && existingVariants.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{t.existingVariants}</label>
                        <div className="space-y-2">
                          {existingVariants.map((variant) => (
                            <div key={variant.id} className="flex gap-2 items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                              <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase">{t.sku}</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300">{variant.sku}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase">{t.size}</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300">{variant.size}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase">{t.color}</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300">{variant.color}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] text-slate-400 uppercase">{t.stock}</span>
                                  <p className="font-medium text-slate-700 dark:text-slate-300">{variant.stock}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm(t.confirmDeleteVariant)) return;
                                  try {
                                    await productApi.variants.delete(variant.id);
                                    setExistingVariants(prev => prev.filter(v => v.id !== variant.id));
                                    setSuccessMessage(t.variantDeleted);
                                  } catch {
                                    setFormError('Không thể xóa biến thể');
                                  }
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Variants */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                          {editingProduct ? t.newVariants : t.variants}
                        </label>
                        <button type="button" onClick={handleAddVariant} className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1">
                          <Plus size={14} />
                          {t.addVariant}
                        </button>
                      </div>
                      {formData.variants.length === 0 && !editingProduct && (
                        <p className="text-sm text-slate-400 italic">{t.noVariants}</p>
                      )}
                      {formData.variants.map((variant, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={variant.size}
                            onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                            placeholder={t.size}
                            className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 text-sm"
                          />
                          <input
                            type="text"
                            value={variant.color}
                            onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                            placeholder={t.color}
                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 text-sm"
                          />
                          <input
                            type="number"
                            value={variant.stock}
                            onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                            placeholder={t.stock}
                            min="0"
                            className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:text-slate-200 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            disabled={formData.variants.length === 1 && !editingProduct}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg disabled:opacity-30"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      {editingProduct && formData.variants.some(v => v.size && v.color && v.stock) && (
                        <button
                          type="button"
                          onClick={async () => {
                            const validVariants = formData.variants.filter(v => v.size && v.color && v.stock);
                            if (validVariants.length === 0) return;
                            try {
                              await productApi.variants.add(
                                editingProduct.id,
                                validVariants.map(v => ({
                                  size: v.size,
                                  color: v.color,
                                  stock: parseInt(v.stock),
                                }))
                              );
                              const res = await productApi.variants.list(editingProduct.id);
                              if (res.success) setExistingVariants(res.data);
                              setFormData(prev => ({ ...prev, variants: [{ size: '', color: '', stock: '' }] }));
                              setSuccessMessage(t.variantAdded);
                            } catch {
                              setFormError('Không thể thêm biến thể');
                            }
                          }}
                          className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          {t.addVariantToProduct}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
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

      {/* AI Modal */}
      {showAIModal && aiProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wand2 size={20} className="text-purple-500" />
                {t.aiTitle}
              </h2>
              <button onClick={() => setShowAIModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{aiProduct.name}</p>
                <p className="text-xs text-slate-500">{aiProduct.category?.name} - {formatCurrency(aiProduct.price)}</p>
              </div>

              {aiError && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4">
                  <p className="text-rose-700 dark:text-rose-400 text-sm">{aiError}</p>
                </div>
              )}

              {aiDescription ? (
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mô tả được tạo:</label>
                  <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{aiDescription}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerateAI}
                      disabled={aiLoading}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-purple-600 border border-purple-200 hover:bg-purple-50 dark:border-purple-500/30 dark:hover:bg-purple-500/10 rounded-xl flex items-center justify-center gap-2"
                    >
                      {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      {t.aiRegenerate}
                    </button>
                    <button
                      onClick={handleUseAIDescription}
                      className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 rounded-xl flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      {t.aiUse}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateAI}
                  disabled={aiLoading}
                  className="w-full px-4 py-3 text-sm font-bold text-white bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 rounded-xl flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t.aiGenerating}
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      {t.aiGenerate}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

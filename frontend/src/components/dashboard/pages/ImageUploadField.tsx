'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Link as LinkIcon, Loader2, X } from 'lucide-react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { 
  compressImage,
  validateImageFile, 
  formatFileSize,
  type CompressedImage 
} from '@/lib/imageUtils';
interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  language?: 'vi' | 'en';
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  value,
  onChange,
  label,
  placeholder = 'https://...',
  language = 'vi',
}) => {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploadingImage, setUploadingImage] = useState<CompressedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    uploadImage: language === 'vi' ? 'Tải ảnh lên' : 'Upload Image',
    pasteUrl: language === 'vi' ? 'Dán URL' : 'Paste URL',
    uploading: language === 'vi' ? 'Đang tải lên...' : 'Uploading...',
    upload: language === 'vi' ? 'Tải lên' : 'Upload',
    currentImage: language === 'vi' ? 'Ảnh hiện tại' : 'Current Image',
    preview: language === 'vi' ? 'Xem trước' : 'Preview',
    chooseFile: language === 'vi' ? 'Kéo thả ảnh vào đây hoặc click để chọn' : 'Drag & drop image here or click to select',
    dragActive: language === 'vi' ? 'Thả ảnh vào đây...' : 'Drop the image here...',
    compressionInfo: language === 'vi' ? 'Giảm' : 'Reduced',
  };

  const handleImageSelect = useCallback(async (file: File) => {
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
  }, [language]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleImageSelect(acceptedFiles[0]);
    }
  }, [handleImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleImageUpload = async () => {
    if (!uploadingImage) return;

    setIsUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const isAdmin = api.isAdmin();
      
      if (!token) {
        throw new Error('Token không tồn tại. Vui lòng đăng nhập lại!');
      }
      
      if (!isAdmin) {
        throw new Error('Bạn không có quyền admin để upload ảnh!');
      }
      
      const formData = new FormData();
      formData.append('file', uploadingImage.file);

      const response = await api.uploadFile<{ success: boolean; data: { url: string; webpUrl?: string } }>(
        '/media/upload',
        formData
      );

      if (response.success && response.data) {
        const imageUrl = response.data.webpUrl || response.data.url;
        onChange(imageUrl);
        setUploadingImage(null);
      }
    } catch (err) {
      console.error('❌ Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : (language === 'vi' ? 'Lỗi khi tải ảnh lên' : 'Image upload error');
      setError(errorMessage);
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

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            mode === 'upload'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {t.uploadImage}
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            mode === 'url'
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          {t.pasteUrl}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Upload Mode */}
      {mode === 'upload' ? (
        <div className="space-y-2">
          {/* File Input */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition cursor-pointer ${
              isDragActive
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 hover:border-primary-400 dark:hover:border-primary-600'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
            <p className={`text-xs ${isDragActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {isDragActive ? t.dragActive : t.chooseFile}
            </p>
          </div>

          {/* Uploading Preview */}
          {uploadingImage && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
              <div className="flex items-start gap-3">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <Image
                    src={uploadingImage.preview}
                    alt="Preview"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {uploadingImage.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatFileSize(uploadingImage.file.size)}
                    {uploadingImage.reduction && (
                      <span className="ml-1 text-green-600 dark:text-green-400">
                        ({t.compressionInfo} {uploadingImage.reduction.toFixed(1)}%)
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleImageUpload}
                    disabled={isUploading}
                    className="mt-2 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-medium transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {t.uploading}
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3" />
                        {t.upload}
                      </>
                    )}
                  </button>
                </div>
                {!isUploading && (
                  <button
                    type="button"
                    onClick={handleClearUploadingImage}
                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Current Image Preview */}
          {value && !uploadingImage && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={value}
                    alt="Current"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {t.currentImage}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {value}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* URL Mode */
        <div className="space-y-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
          />
          {value && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={value}
                    alt="Preview"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {t.preview}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {value}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

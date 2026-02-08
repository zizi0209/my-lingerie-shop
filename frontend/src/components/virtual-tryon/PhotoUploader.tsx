 'use client';

import { useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';

interface PhotoUploaderProps {
  onPhotoSelected: (file: File) => void;
  selectedPhoto: File | null;
  onClear: () => void;
}

export function PhotoUploader({ onPhotoSelected, selectedPhoto, onClear }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onPhotoSelected(file);
      }
    },
    [onPhotoSelected]
  );

  const previewUrl = selectedPhoto ? URL.createObjectURL(selectedPhoto) : null;

  if (selectedPhoto && previewUrl) {
    return (
      <div className="relative">
        <img
          src={previewUrl}
          alt="Preview"
          className="w-full h-48 sm:h-64 object-contain rounded-lg bg-gray-100"
        />
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-10 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 transition-all group"
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
        <Upload className="w-7 h-7 text-purple-600" />
      </div>
      <p className="text-base font-medium text-gray-700 mb-1">Tải ảnh của bạn lên</p>
      <p className="text-sm text-gray-500 mb-3">Kéo thả hoặc nhấn để chọn file</p>
      <p className="text-xs text-gray-400">PNG, JPG, WEBP - Tối đa 10MB</p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
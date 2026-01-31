import React, { useState } from 'react';
import MediaLibrary from './MediaLibrary';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  value,
  onChange,
  label = 'Upload ảnh',
  className = ''
}) => {
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      {/* Preview */}
      {value && (
        <div className="relative inline-block w-32 h-32">
          <Image
            src={value}
            alt="Preview"
            fill
            className="object-cover rounded-lg border"
            sizes="128px"
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setShowMediaLibrary(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {value ? 'Thay đổi ảnh' : 'Chọn ảnh từ thư viện'}
        </button>
      </div>

      {/* Media Library Modal */}
      {showMediaLibrary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Chọn ảnh</h2>
              <button
                onClick={() => setShowMediaLibrary(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <MediaLibrary
              onSelect={(media) => {
                onChange(media.url);
                setShowMediaLibrary(false);
              }}
              multiple={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
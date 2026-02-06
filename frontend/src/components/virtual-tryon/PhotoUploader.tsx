 'use client';
'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Camera, X, Info } from 'lucide-react';
import Webcam from 'react-webcam';

interface PhotoUploaderProps {
  onPhotoSelected: (file: File) => void;
  selectedPhoto: File | null;
  onClear: () => void;
}

export function PhotoUploader({ onPhotoSelected, selectedPhoto, onClear }: PhotoUploaderProps) {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onPhotoSelected(file);
      }
    },
    [onPhotoSelected]
  );

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
          onPhotoSelected(file);
          setShowCamera(false);
        });
    }
  }, [onPhotoSelected]);

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

  if (showCamera) {
    return (
      <div className="space-y-4">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          className="w-full h-48 sm:h-64 object-cover rounded-lg"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCapture}
            className="flex-1 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Chụp ảnh
          </button>
          <button
            type="button"
            onClick={() => setShowCamera(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-lg border text-sm ${
            mode === 'upload'
              ? 'border-pink-500 bg-pink-50 text-pink-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-1 sm:mr-2" />
          Upload
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('camera');
            setShowCamera(true);
          }}
          className={`flex-1 py-2 px-3 sm:px-4 rounded-lg border text-sm ${
            mode === 'camera'
              ? 'border-pink-500 bg-pink-50 text-pink-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Camera className="w-4 h-4 inline mr-1 sm:mr-2" />
          Camera
        </button>
      </div>

      {mode === 'upload' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-8 text-center cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-colors"
        >
          <Upload className="w-8 sm:w-12 h-8 sm:h-12 mx-auto text-gray-400 mb-2 sm:mb-4" />
          <p className="text-sm sm:text-base text-gray-600 mb-1 sm:mb-2">Chạm để chọn ảnh</p>
          <p className="text-xs sm:text-sm text-gray-400">PNG, JPG tối đa 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
        <div className="flex gap-2">
          <Info className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-blue-700">
            <p className="font-medium mb-0.5 sm:mb-1">Hướng dẫn</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-600">
              <li>Đứng thẳng, mặt hướng camera</li>
              <li>Nền đơn giản, ảnh toàn thân</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
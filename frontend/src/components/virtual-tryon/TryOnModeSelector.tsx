'use client';

import { Upload, Lock, ImageIcon } from 'lucide-react';

export type TryOnMode = 'live' | 'photo';

interface TryOnModeSelectorProps {
  onSelectMode: (mode: TryOnMode) => void;
  productName?: string;
}

export function TryOnModeSelector({ onSelectMode, productName }: TryOnModeSelectorProps) {
  return (
    <div className="space-y-4">
      {productName && (
        <p className="text-center text-gray-600">
          Chọn cách thử <span className="font-medium text-gray-900">{productName}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-4">
        <button
          type="button"
          onClick={() => onSelectMode('photo')}
          className="group relative p-5 border-2 border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50/50 transition-all text-left"
        >
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
              <ImageIcon className="w-3 h-3" />
              Ảnh
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Thử đồ bằng ảnh</h3>
              <p className="text-sm text-gray-500 mb-3">Upload ảnh toàn thân để xem trước sản phẩm</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                  Xử lý nhanh, không cần chờ đợi
                </li>
                <li className="flex items-center gap-2 text-xs text-gray-600">
                  <Lock className="w-3 h-3 text-gray-400" />
                  100% xử lý tại thiết bị
                </li>
              </ul>
            </div>
          </div>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">Cả hai phương thức đều miễn phí và bảo mật</p>
    </div>
  );
}


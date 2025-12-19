'use client';

import React, { useState } from 'react';
import MediaLibrary from '@/components/MediaLibrary';

const AdminMediaPage: React.FC = () => {
  const [showLibrary, setShowLibrary] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Quản lý Media</h1>

      {/* Quick Actions */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showLibrary ? 'Ẩn thư viện' : 'Hiển thị thư viện'}
        </button>
      </div>

      {/* Media Library */}
      {showLibrary && (
        <MediaLibrary
          onSelect={(media) => {
            console.log('Selected media:', media);
            alert(`Đã chọn ảnh: ${media.originalName}`);
          }}
        />
      )}

      {/* Usage Examples */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Hướng dẫn sử dụng</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="font-semibold mb-2">1. Upload ảnh đơn lẻ:</h3>
          <p className="text-gray-600 mb-4">
            Chọn 1 file ảnh và upload. Hệ thống sẽ tự động tối ưu và lưu trên Cloudinary.
          </p>

          <h3 className="font-semibold mb-2">2. Upload nhiều ảnh:</h3>
          <p className="text-gray-600 mb-4">
            Chọn nhiều file ảnh (tối đa 10 file cùng lúc).
          </p>

          <h3 className="font-semibold mb-2">3. Xóa ảnh:</h3>
          <p className="text-gray-600 mb-4">
            Hover vào ảnh và click nút delete để xóa. Ảnh sẽ được xóa cả trên Cloudinary và database.
          </p>

          <h3 className="font-semibold mb-2">4. Sử dụng trong các component:</h3>
          <pre className="bg-gray-800 text-white p-4 rounded overflow-x-auto">
{`import MediaLibrary from '@/components/MediaLibrary';

// Trong component của bạn:
<MediaLibrary
  onSelect={(media) => {
    // Lấy URL để sử dụng
    setImageUrl(media.url);
  }}
  multiple={false}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AdminMediaPage;
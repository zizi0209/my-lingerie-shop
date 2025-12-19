import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Image from 'next/image';

interface MediaItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  publicId: string;
  folder: string;
  createdAt: string;
}

interface MediaLibraryProps {
  onSelect?: (media: MediaItem) => void;
  multiple?: boolean;
  maxSelection?: number;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({
  onSelect,
  multiple = false,
  maxSelection = 10
}) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch media list
  const fetchMedia = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/media?page=${page}&limit=20`);
      setMediaList(response.data.data);
      setTotalPages(response.data.pagination.pages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching media:', error);
      alert('Lỗi khi tải danh sách media!');
    }
    setLoading(false);
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    if (files.length === 1) {
      // Single upload
      formData.append('image', files[0]);
      try {
        await axios.post('/api/media/single', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fetchMedia(currentPage);
        alert('Upload thành công!');
      } catch (error) {
        console.error('Upload error:', error);
        alert('Lỗi khi upload ảnh!');
      }
    } else {
      // Multiple upload
      Array.from(files).forEach((file) => {
        formData.append('images', file);
      });
      try {
        await axios.post('/api/media/multiple', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fetchMedia(currentPage);
        alert(`Upload thành công ${files.length} ảnh!`);
      } catch (error) {
        console.error('Multiple upload error:', error);
        alert('Lỗi khi upload nhiều ảnh!');
      }
    }
    setUploading(false);
    e.target.value = ''; // Reset input
  };

  // Handle media selection
  const handleMediaClick = (media: MediaItem) => {
    if (multiple) {
      const newSelection = selectedMedia.includes(media.id)
        ? selectedMedia.filter(id => id !== media.id)
        : [...selectedMedia, media.id];

      if (newSelection.length <= maxSelection) {
        setSelectedMedia(newSelection);
      } else {
        alert(`Chỉ được chọn tối đa ${maxSelection} ảnh!`);
      }
    } else {
      if (onSelect) {
        onSelect(media);
      }
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa ảnh này?')) return;

    try {
      await axios.delete(`/api/media/${id}`);
      fetchMedia(currentPage);
      alert('Xóa thành công!');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Lỗi khi xóa ảnh!');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Thư viện Media</h2>

      {/* Upload Section */}
      <div className="mb-6">
        <label className="block">
          <span className="sr-only">Choose files</span>
          <input
            type="file"
            multiple={multiple}
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100
              cursor-pointer disabled:opacity-50"
          />
        </label>
        {uploading && (
          <p className="mt-2 text-sm text-blue-600">Đang upload...</p>
        )}
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p>Đang tải...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mediaList.map((media) => (
              <div
                key={media.id}
                className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden
                  ${selectedMedia.includes(media.id) ? 'border-blue-500' : 'border-gray-200'}
                  hover:border-gray-400 transition-colors`}
                onClick={() => handleMediaClick(media)}
              >
                <div className="w-full h-32 relative">
                  <Image
                    src={media.url}
                    alt={media.originalName || 'Media image'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0
                  group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(media.id);
                    }}
                    className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Selection indicator */}
                {selectedMedia.includes(media.id) && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="p-2 bg-gray-50">
                  <p className="text-xs text-gray-600 truncate">{media.originalName}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(media.size)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button
                onClick={() => fetchMedia(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="px-4 py-2">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => fetchMedia(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          )}

          {/* Selected media preview */}
          {multiple && selectedMedia.length > 0 && (
            <div className="mt-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">
                  Đã chọn {selectedMedia.length} ảnh
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {selectedMedia.map((mediaId) => {
                    const media = mediaList.find((m) => m.id === mediaId);
                    if (!media) return null;
                    return (
                      <div key={media.id} className="w-full h-20 relative">
                        <Image
                          src={media.url}
                          alt={media.originalName || 'Selected media'}
                          fill
                          className="object-cover rounded"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MediaLibrary;
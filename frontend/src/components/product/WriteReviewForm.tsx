"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, X, Upload, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface InitialReviewData {
  reviewId: number;
  rating: number;
  title: string;
  content: string;
  fitType?: string;
}

interface WriteReviewFormProps {
  productId: number;
  productName: string;
  productImage?: string;
  variantName?: string;
  editMode?: boolean;
  initialData?: InitialReviewData;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function WriteReviewForm({
  productId,
  productName,
  productImage,
  variantName,
  editMode = false,
  initialData,
  onSuccess,
  onClose,
}: WriteReviewFormProps) {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [fitType, setFitType] = useState<string | null>(initialData?.fitType || null);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fitOptions = [
    { value: "SMALL", label: "Chật hơn mô tả" },
    { value: "TRUE_TO_SIZE", label: "Chuẩn form" },
    { value: "LARGE", label: "Rộng hơn mô tả" },
  ];

  const ratingLabels = [
    "",
    "Rất không hài lòng",
    "Không hài lòng",
    "Bình thường",
    "Hài lòng",
    "Rất hài lòng",
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setError("Tối đa 5 hình ảnh");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "reviews");

        const response = await api.uploadFile<{ success: boolean; data: { url: string } }>(
          "/media/upload",
          formData
        );

        if (response.success && response.data.url) {
          setImages(prev => [...prev, response.data.url]);
        }
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Lỗi khi upload hình ảnh");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Vui lòng chọn số sao đánh giá");
      return;
    }

    if (content.trim().length < 10) {
      setError("Nội dung đánh giá phải có ít nhất 10 ký tự");
      return;
    }

    setSubmitting(true);

    try {
      let response;
      
      if (editMode && initialData?.reviewId) {
        // Update existing review
        response = await api.put<{ success: boolean; message?: string }>(`/reviews/${initialData.reviewId}`, {
          rating,
          title: title.trim() || null,
          content: content.trim(),
          fitType,
        });
      } else {
        // Create new review
        response = await api.post<{ success: boolean; message: string }>("/reviews", {
          productId,
          rating,
          title: title.trim() || null,
          content: content.trim(),
          fitType,
          images: images.length > 0 ? images : undefined,
        });
      }

      if (response.success) {
        onSuccess?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : editMode ? "Lỗi khi cập nhật đánh giá" : "Lỗi khi gửi đánh giá";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          {editMode ? "Sửa đánh giá" : "Đánh giá sản phẩm"}
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50">
        {productImage && (
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
            <Image src={productImage} alt={productName} fill className="object-cover" />
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{productName}</p>
          {variantName && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Phân loại: {variantName}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Chất lượng sản phẩm <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300 dark:text-gray-600"
                  }`}
                />
              </button>
            ))}
            {(hoverRating || rating) > 0 && (
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {ratingLabels[hoverRating || rating]}
              </span>
            )}
          </div>
        </div>

        {/* Fit Type */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Độ vừa vặn
          </label>
          <div className="flex flex-wrap gap-2">
            {fitOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFitType(fitType === option.value ? null : option.value)}
                className={`px-4 py-2 text-sm border rounded-full transition ${
                  fitType === option.value
                    ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Tiêu đề (tùy chọn)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tóm tắt đánh giá của bạn"
            maxLength={100}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Nội dung đánh giá <span className="text-red-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            rows={4}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {content.length}/1000 ký tự (tối thiểu 10)
          </p>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Thêm hình ảnh (tối đa 5)
          </label>
          <div className="flex flex-wrap gap-2">
            {images.map((url, index) => (
              <div key={index} className="relative w-20 h-20 group">
                <Image
                  src={url}
                  alt={`Review image ${index + 1}`}
                  fill
                  className="object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {images.length < 5 && (
              <label className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Thêm</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || uploading}
            className="flex-1 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              editMode ? "Cập nhật đánh giá" : "Gửi đánh giá"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

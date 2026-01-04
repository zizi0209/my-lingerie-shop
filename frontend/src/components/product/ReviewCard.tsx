"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, ThumbsUp, CheckCircle, X } from "lucide-react";

interface ReviewImage {
  id: number;
  url: string;
}

interface ReviewCardProps {
  review: {
    id: number;
    rating: number;
    title: string | null;
    content: string;
    variantName: string | null;
    fitType: string | null;
    isVerified: boolean;
    images: ReviewImage[];
    helpfulCount: number;
    reply: string | null;
    repliedAt: string | null;
    user: {
      name: string;
      avatar: string | null;
    };
    createdAt: string;
  };
  onHelpful?: (reviewId: number) => void;
  hasVoted?: boolean;
}

export default function ReviewCard({ review, onHelpful, hasVoted = false }: ReviewCardProps) {
  const [showAllImages, setShowAllImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [voted, setVoted] = useState(hasVoted);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);

  const fitTypeLabels: Record<string, string> = {
    SMALL: "Chật hơn mô tả",
    TRUE_TO_SIZE: "Chuẩn form",
    LARGE: "Rộng hơn mô tả",
  };

  const handleHelpful = () => {
    if (onHelpful) {
      onHelpful(review.id);
    }
    setVoted(!voted);
    setHelpfulCount(prev => voted ? prev - 1 : prev + 1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 py-6 last:border-b-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {review.user.avatar ? (
              <Image
                src={review.user.avatar}
                alt={review.user.name}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {review.user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {review.user.name}
              </span>
              {review.isVerified && (
                <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Đã mua hàng
                </span>
              )}
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= review.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(review.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Variant & Fit Info */}
      {(review.variantName || review.fitType) && (
        <div className="flex flex-wrap gap-2 mb-3 text-xs">
          {review.variantName && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
              {review.variantName}
            </span>
          )}
          {review.fitType && (
            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
              {fitTypeLabels[review.fitType] || review.fitType}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      {review.title && (
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          {review.title}
        </h4>
      )}

      {/* Content */}
      <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        {review.content}
      </p>

      {/* Images */}
      {review.images.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {review.images.slice(0, showAllImages ? undefined : 4).map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImage(image.url)}
              className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:opacity-90 transition"
            >
              <Image
                src={image.url}
                alt={`Review image ${index + 1}`}
                fill
                className="object-cover"
              />
              {!showAllImages && index === 3 && review.images.length > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    +{review.images.length - 4}
                  </span>
                </div>
              )}
            </button>
          ))}
          {review.images.length > 4 && !showAllImages && (
            <button
              onClick={() => setShowAllImages(true)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Xem tất cả
            </button>
          )}
        </div>
      )}

      {/* Shop Reply */}
      {review.reply && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 border-l-4 border-primary-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              🏪 Phản hồi từ Shop
            </span>
            {review.repliedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                • {formatDate(review.repliedAt)}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {review.reply}
          </p>
        </div>
      )}

      {/* Helpful */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleHelpful}
          className={`inline-flex items-center gap-1.5 text-sm transition ${
            voted
              ? "text-primary-600 dark:text-primary-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <ThumbsUp className={`w-4 h-4 ${voted ? "fill-current" : ""}`} />
          Hữu ích ({helpfulCount})
        </button>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <Image
            src={selectedImage}
            alt="Review image"
            width={800}
            height={800}
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

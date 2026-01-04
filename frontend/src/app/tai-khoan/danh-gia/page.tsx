"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Edit2, Trash2, Loader2, Clock, CheckCircle, XCircle, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import WriteReviewForm from "@/components/product/WriteReviewForm";

interface ReviewImage {
  url: string;
}

interface ProductInfo {
  id: number;
  name: string;
  slug: string;
  images: { url: string }[];
}

interface Review {
  id: number;
  rating: number;
  title: string | null;
  content: string;
  status: string;
  fitType: string | null;
  images: ReviewImage[];
  createdAt: string;
  product: ProductInfo;
}

interface PendingItem {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  product: {
    id: number;
    name: string;
    slug: string;
    image: string | null;
  };
  variant: string | null;
}

export default function MyReviewsPage() {
  const [activeTab, setActiveTab] = useState<"reviews" | "pending">("reviews");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteForm, setShowWriteForm] = useState<PendingItem | null>(null);

  const fetchReviews = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Review[] }>("/reviews/me");
      if (response.success) {
        setReviews(response.data);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const fetchPending = async () => {
    try {
      const response = await api.get<{ success: boolean; data: PendingItem[] }>("/reviews/pending");
      if (response.success) {
        setPendingItems(response.data);
      }
    } catch (err) {
      console.error("Error fetching pending:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchReviews(), fetchPending()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm("Bạn có chắc muốn xóa đánh giá này?")) return;

    try {
      await api.delete(`/reviews/${reviewId}`);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err) {
      console.error("Error deleting review:", err);
      alert("Lỗi khi xóa đánh giá");
    }
  };

  const handleReviewSuccess = () => {
    setShowWriteForm(null);
    fetchReviews();
    fetchPending();
  };

  const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
    PENDING: { label: "Chờ duyệt", icon: Clock, color: "text-yellow-500" },
    APPROVED: { label: "Đã duyệt", icon: CheckCircle, color: "text-green-500" },
    REJECTED: { label: "Bị từ chối", icon: XCircle, color: "text-red-500" },
    HIDDEN: { label: "Đã ẩn", icon: EyeOff, color: "text-gray-500" },
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-serif font-light mb-8 text-gray-900 dark:text-white">
        Đánh giá của tôi
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab("reviews")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === "reviews"
              ? "border-black dark:border-white text-black dark:text-white"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Đã đánh giá ({reviews.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === "pending"
              ? "border-black dark:border-white text-black dark:text-white"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Chờ đánh giá ({pendingItems.length})
        </button>
      </div>

      {/* My Reviews */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Bạn chưa có đánh giá nào</p>
            </div>
          ) : (
            reviews.map((review) => {
              const status = statusConfig[review.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <div
                  key={review.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <Link
                      href={`/san-pham/${review.product.slug}`}
                      className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0"
                    >
                      <Image
                        src={review.product.images[0]?.url || "https://via.placeholder.com/80"}
                        alt={review.product.name}
                        fill
                        className="object-cover"
                      />
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/san-pham/${review.product.slug}`}
                            className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1"
                          >
                            {review.product.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(review.createdAt)}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs ${status.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {review.title && (
                        <p className="font-medium text-gray-900 dark:text-white mt-2">
                          {review.title}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {review.content}
                      </p>

                      {/* Review Images */}
                      {review.images.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {review.images.slice(0, 4).map((img, idx) => (
                            <div
                              key={idx}
                              className="relative w-12 h-12 rounded overflow-hidden bg-gray-100 dark:bg-gray-700"
                            >
                              <Image src={img.url} alt="" fill className="object-cover" />
                            </div>
                          ))}
                          {review.images.length > 4 && (
                            <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                              +{review.images.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pending Reviews */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Bạn đã đánh giá tất cả sản phẩm đã mua!
              </p>
            </div>
          ) : (
            pendingItems.map((item, index) => (
              <div
                key={`${item.orderId}-${item.product.id}-${index}`}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link
                    href={`/san-pham/${item.product.slug}`}
                    className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 shrink-0"
                  >
                    <Image
                      src={item.product.image || "https://via.placeholder.com/80"}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/san-pham/${item.product.slug}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-1"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Phân loại: {item.variant}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Đơn hàng #{item.orderNumber} • {formatDate(item.orderDate)}
                    </p>
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => setShowWriteForm(item)}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-sm rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition shrink-0 self-center"
                  >
                    Viết đánh giá
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Write Review Modal */}
      {showWriteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
            <WriteReviewForm
              productId={showWriteForm.product.id}
              productName={showWriteForm.product.name}
              productImage={showWriteForm.product.image || undefined}
              variantName={showWriteForm.variant || undefined}
              onSuccess={handleReviewSuccess}
              onClose={() => setShowWriteForm(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

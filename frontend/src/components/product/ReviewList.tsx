"use client";

import { useState, useEffect, useCallback } from "react";
import { Star, Image as ImageIcon, CheckCircle, Loader2 } from "lucide-react";
import ReviewCard from "./ReviewCard";
import ReviewStats from "./ReviewStats";

interface ReviewImage {
  id: number;
  url: string;
}

interface Review {
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
}

interface ReviewStats {
  average: number;
  total: number;
  distribution: Record<string, number>;
  fitFeedback: Record<string, number>;
  verifiedCount: number;
  withImagesCount: number;
}

interface ReviewListProps {
  productSlug: string;
}

export default function ReviewList({ productSlug }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hasImages, setHasImages] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${baseUrl}/reviews/product/${productSlug}/stats`);
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error("Error fetching review stats:", err);
      }
    };
    fetchStats();
  }, [baseUrl, productSlug]);

  // Fetch reviews
  const fetchReviews = useCallback(async (pageNum: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "10",
        sortBy,
      });

      if (selectedRating) {
        params.append("rating", selectedRating.toString());
      }
      if (hasImages) {
        params.append("hasImages", "true");
      }
      if (verifiedOnly) {
        params.append("verified", "true");
      }

      const res = await fetch(`${baseUrl}/reviews/product/${productSlug}?${params}`);
      const data = await res.json();

      if (data.success) {
        if (reset) {
          setReviews(data.data);
        } else {
          setReviews(prev => [...prev, ...data.data]);
        }
        setTotal(data.pagination.total);
        setHasMore(pageNum < data.pagination.pages);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [baseUrl, productSlug, selectedRating, hasImages, verifiedOnly, sortBy]);

  // Initial fetch and when filters change
  useEffect(() => {
    setPage(1);
    fetchReviews(1, true);
  }, [fetchReviews]);

  // Load more
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReviews(nextPage, false);
  };

  // Vote helpful
  const handleHelpful = async (reviewId: number) => {
    try {
      const visitorId = localStorage.getItem("visitorId") || `visitor_${Date.now()}`;
      if (!localStorage.getItem("visitorId")) {
        localStorage.setItem("visitorId", visitorId);
      }

      await fetch(`${baseUrl}/reviews/${reviewId}/helpful`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
    } catch (err) {
      console.error("Error voting helpful:", err);
    }
  };

  // Filter buttons
  const filterButtons = [
    { label: "Tất cả", value: null, count: total },
    { label: "5 ⭐", value: 5, count: stats?.distribution["5"] || 0 },
    { label: "4 ⭐", value: 4, count: stats?.distribution["4"] || 0 },
    { label: "3 ⭐", value: 3, count: stats?.distribution["3"] || 0 },
    { label: "2 ⭐", value: 2, count: stats?.distribution["2"] || 0 },
    { label: "1 ⭐", value: 1, count: stats?.distribution["1"] || 0 },
  ];

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && stats.total > 0 && <ReviewStats stats={stats} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Rating filters */}
        {filterButtons.map((btn) => (
          <button
            key={btn.value || "all"}
            onClick={() => setSelectedRating(btn.value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              selectedRating === btn.value
                ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
          >
            {btn.label} ({btn.count})
          </button>
        ))}

        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2 hidden sm:block" />

        {/* Has images */}
        <button
          onClick={() => setHasImages(!hasImages)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition ${
            hasImages
              ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Có hình ({stats?.withImagesCount || 0})
        </button>

        {/* Verified only */}
        <button
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition ${
            verifiedOnly
              ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Đã mua ({stats?.verifiedCount || 0})
        </button>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="ml-auto px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        >
          <option value="newest">Mới nhất</option>
          <option value="helpful">Hữu ích nhất</option>
          <option value="rating_high">Điểm cao nhất</option>
          <option value="rating_low">Điểm thấp nhất</option>
        </select>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onHelpful={handleHelpful}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Star className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {selectedRating || hasImages || verifiedOnly
              ? "Không có đánh giá phù hợp với bộ lọc"
              : "Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!"}
          </p>
        </div>
      )}

      {/* Load More */}
      {hasMore && reviews.length > 0 && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:border-gray-400 dark:hover:border-gray-500 transition disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải...
              </>
            ) : (
              "Xem thêm đánh giá"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

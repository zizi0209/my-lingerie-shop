'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Star,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  EyeOff,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import DashboardLayoutWrapper from '@/components/dashboard/DashboardLayoutWrapper';
import { api } from '@/lib/api';

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
  status: string;
  images: ReviewImage[];
  helpfulCount: number;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  product: {
    id: number;
    name: string;
    slug: string;
  };
}

interface StatusCounts {
  all: number;
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  HIDDEN: number;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  PENDING: { label: 'Chờ duyệt', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  APPROVED: { label: 'Đã duyệt', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
  REJECTED: { label: 'Từ chối', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
  HIDDEN: { label: 'Đã ẩn', icon: EyeOff, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800' },
};

const fitTypeLabels: Record<string, string> = {
  SMALL: 'Chật hơn mô tả',
  TRUE_TO_SIZE: 'Chuẩn form',
  LARGE: 'Rộng hơn mô tả',
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ all: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, HIDDEN: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (ratingFilter) params.append('rating', ratingFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const response = await api.get<{
        success: boolean;
        data: Review[];
        counts: StatusCounts;
        pagination: { page: number; limit: number; total: number; pages: number };
      }>(`/admin/reviews?${params}`);

      if (response.success) {
        setReviews(response.data);
        setCounts(response.counts);
        setTotal(response.pagination.total);
        setTotalPages(response.pagination.pages);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, ratingFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, ratingFilter, searchQuery, sortBy]);

  const handleUpdateStatus = async (reviewId: number, status: string) => {
    try {
      await api.put(`/admin/reviews/${reviewId}/status`, { status });
      fetchReviews();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Lỗi khi cập nhật trạng thái!');
    }
  };

  const handleReply = async () => {
    if (!selectedReview || !replyContent.trim()) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/reviews/${selectedReview.id}/reply`, { reply: replyContent.trim() });
      setShowReplyModal(false);
      setReplyContent('');
      setSelectedReview(null);
      fetchReviews();
    } catch (err) {
      console.error('Error replying:', err);
      alert('Lỗi khi trả lời đánh giá!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReply = async (reviewId: number) => {
    if (!confirm('Xóa phản hồi này?')) return;
    try {
      await api.delete(`/admin/reviews/${reviewId}/reply`);
      fetchReviews();
    } catch (err) {
      console.error('Error deleting reply:', err);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Xóa đánh giá này? Thao tác không thể hoàn tác!')) return;
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      fetchReviews();
    } catch (err) {
      console.error('Error deleting review:', err);
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Cập nhật ${selectedIds.length} đánh giá thành "${statusConfig[status]?.label}"?`)) return;
    try {
      await api.post('/admin/reviews/bulk-status', { ids: selectedIds, status });
      setSelectedIds([]);
      fetchReviews();
    } catch (err) {
      console.error('Error bulk update:', err);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reviews.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reviews.map(r => r.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayoutWrapper>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quản lý đánh giá</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Duyệt, trả lời và quản lý đánh giá sản phẩm từ khách hàng
            </p>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
          {[
            { key: 'all', label: 'Tất cả', count: counts.all },
            { key: 'PENDING', label: 'Chờ duyệt', count: counts.PENDING },
            { key: 'APPROVED', label: 'Đã duyệt', count: counts.APPROVED },
            { key: 'REJECTED', label: 'Từ chối', count: counts.REJECTED },
            { key: 'HIDDEN', label: 'Đã ẩn', count: counts.HIDDEN },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                statusFilter === tab.key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung, tiêu đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          >
            <option value="">Tất cả sao</option>
            <option value="5">5 sao</option>
            <option value="4">4 sao</option>
            <option value="3">3 sao</option>
            <option value="2">2 sao</option>
            <option value="1">1 sao</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="rating_high">Điểm cao nhất</option>
            <option value="rating_low">Điểm thấp nhất</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Đã chọn {selectedIds.length} đánh giá
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatus('APPROVED')}
                className="px-3 py-1.5 text-xs bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Duyệt
              </button>
              <button
                onClick={() => handleBulkStatus('REJECTED')}
                className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Từ chối
              </button>
              <button
                onClick={() => handleBulkStatus('HIDDEN')}
                className="px-3 py-1.5 text-xs bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Ẩn
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-400 dark:hover:bg-slate-500"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}

        {/* Reviews Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20">
            <Star className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Không có đánh giá nào</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="p-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === reviews.length && reviews.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                      />
                    </th>
                    <th className="p-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Đánh giá
                    </th>
                    <th className="p-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Sản phẩm
                    </th>
                    <th className="p-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="p-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Ngày tạo
                    </th>
                    <th className="p-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {reviews.map((review) => {
                    const status = statusConfig[review.status] || statusConfig.PENDING;
                    const StatusIcon = status.icon;

                    return (
                      <tr key={review.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(review.id)}
                            onChange={() => toggleSelect(review.id)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                          />
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            {/* User & Rating */}
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                {review.user.avatar ? (
                                  <Image src={review.user.avatar} alt="" width={32} height={32} className="object-cover" />
                                ) : (
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    {(review.user.name || review.user.email).charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {review.user.name || review.user.email}
                                </p>
                                <div className="flex items-center gap-2">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <Star
                                        key={s}
                                        className={`w-3 h-3 ${s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                                      />
                                    ))}
                                  </div>
                                  {review.isVerified && (
                                    <span className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                      <CheckCircle className="w-3 h-3" /> Đã mua
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            {review.title && (
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{review.title}</p>
                            )}
                            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{review.content}</p>

                            {/* Meta */}
                            <div className="flex flex-wrap gap-2">
                              {review.variantName && (
                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                                  {review.variantName}
                                </span>
                              )}
                              {review.fitType && (
                                <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                  {fitTypeLabels[review.fitType]}
                                </span>
                              )}
                              {review.images.length > 0 && (
                                <span className="text-[10px] px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" /> {review.images.length} ảnh
                                </span>
                              )}
                            </div>

                            {/* Shop Reply */}
                            {review.reply && (
                              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded border-l-2 border-primary-500">
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Phản hồi của Shop:</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{review.reply}</p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Link
                            href={`/san-pham/${review.product.slug}`}
                            target="_blank"
                            className="text-sm text-slate-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1"
                          >
                            {review.product.name}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${status.bg} ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {formatDate(review.createdAt)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Quick Status Actions */}
                            {review.status !== 'APPROVED' && (
                              <button
                                onClick={() => handleUpdateStatus(review.id, 'APPROVED')}
                                title="Duyệt"
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {review.status !== 'REJECTED' && (
                              <button
                                onClick={() => handleUpdateStatus(review.id, 'REJECTED')}
                                title="Từ chối"
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            {review.status !== 'HIDDEN' && (
                              <button
                                onClick={() => handleUpdateStatus(review.id, 'HIDDEN')}
                                title="Ẩn"
                                className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}

                            {/* Reply */}
                            <button
                              onClick={() => {
                                setSelectedReview(review);
                                setReplyContent(review.reply || '');
                                setShowReplyModal(true);
                              }}
                              title="Trả lời"
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>

                            {/* Delete Reply */}
                            {review.reply && (
                              <button
                                onClick={() => handleDeleteReply(review.id)}
                                title="Xóa phản hồi"
                                className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Review */}
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              title="Xóa đánh giá"
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Hiển thị {(page - 1) * 20 + 1} - {Math.min(page * 20, total)} / {total} đánh giá
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reply Modal */}
        {showReplyModal && selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl shadow-xl">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedReview.reply ? 'Sửa phản hồi' : 'Trả lời đánh giá'}
                </h3>
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setSelectedReview(null);
                    setReplyContent('');
                  }}
                  className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Review Preview */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= selectedReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-slate-500">{selectedReview.user.name || selectedReview.user.email}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{selectedReview.content}</p>
                </div>

                {/* Reply Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Phản hồi của Shop
                  </label>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={4}
                    placeholder="Nhập nội dung phản hồi..."
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setSelectedReview(null);
                    setReplyContent('');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReply}
                  disabled={!replyContent.trim() || submitting}
                  className="px-4 py-2 text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedReview.reply ? 'Cập nhật' : 'Gửi phản hồi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayoutWrapper>
  );
}

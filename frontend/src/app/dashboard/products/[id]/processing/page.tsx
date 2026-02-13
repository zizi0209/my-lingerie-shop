"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, RefreshCcw, AlertCircle, CheckCircle2, Box } from "lucide-react";
import { ThemeProvider } from "@/components/dashboard/components/ThemeContext";
import DashboardLayoutWrapper from "@/components/dashboard/DashboardLayoutWrapper";
import {
  productApi,
  type ProcessingStatusData,
  type ProcessingStatusImage,
  type TripoSrStatusResponse,
} from "@/lib/productApi";

interface ProcessingPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  partial: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
};

export default function ProductProcessingPage({ params }: ProcessingPageProps) {
  const resolvedParams = use(params);
  const productId = Number(resolvedParams.id);
  const [status, setStatus] = useState<ProcessingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tripoStatus, setTripoStatus] = useState<TripoSrStatusResponse | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await productApi.processing.getStatus(productId);
      if (response.success) {
        setStatus(response.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không thể tải trạng thái xử lý";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const fetchTripoStatus = useCallback(async () => {
    try {
      const response = await productApi.processing.getTripoSrStatus();
      setTripoStatus(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : "TripoSR chưa sẵn sàng";
      setTripoStatus({
        success: false,
        available: false,
        lastCheckedAt: null,
        lastError: message,
        lastLatencyMs: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchTripoStatus();
    const interval = setInterval(fetchStatus, 3000);
    const tripoInterval = setInterval(fetchTripoStatus, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(tripoInterval);
    };
  }, [fetchStatus, fetchTripoStatus]);

  const total = status?.summary.total ?? 0;
  const completed = status?.summary.completed ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const hasFailed = (status?.summary.failed ?? 0) > 0;
  const hasPartial = (status?.summary.partial ?? 0) > 0;

  const handleProcessAll = async () => {
    setActionLoading(true);
    try {
      await productApi.processing.processAll(productId);
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    setActionLoading(true);
    try {
      await productApi.processing.retryFailed(productId);
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessImage = async (imageId: number) => {
    setActionLoading(true);
    try {
      await productApi.processing.processImage(imageId);
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry3D = async (imageId: number) => {
    setActionLoading(true);
    try {
      await productApi.processing.retry3D(imageId);
      await fetchStatus();
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadge = useMemo(() => {
    if (!status) return null;
    if (status.summary.processing > 0) {
      return "Đang xử lý";
    }
    if (status.summary.failed > 0) {
      return "Có lỗi";
    }
    if (status.summary.partial > 0) {
      return "Thiếu 3D";
    }
    if (status.summary.completed === status.summary.total && status.summary.total > 0) {
      return "Hoàn tất";
    }
    return "Chờ xử lý";
  }, [status]);

  const renderImageStatus = (image: ProcessingStatusImage) => {
    const statusLabel = image.processingStatus || "pending";
    const badgeClass = STATUS_COLORS[statusLabel] || STATUS_COLORS.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${badgeClass}`}>
        {statusLabel}
      </span>
    );
  };

  return (
    <ThemeProvider>
      <DashboardLayoutWrapper>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Box className="w-6 h-6 text-rose-500" />
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                  Trạng thái xử lý 3D
                </h1>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sản phẩm #{productId} · {statusBadge}
              </p>
            </div>
            <Link
              href="/dashboard/products"
              className="text-sm font-bold text-rose-500 hover:text-rose-600"
            >
              Quay lại danh sách
            </Link>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="text-rose-500" size={18} />
              <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">{error}</p>
            </div>
          )}

          {tripoStatus && !tripoStatus.available && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="text-blue-500" size={18} />
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                TripoSR 3D service chưa sẵn sàng - chỉ xử lý xóa nền.
              </p>
              {tripoStatus.lastError && (
                <span className="text-xs text-blue-600/80 dark:text-blue-200/80">
                  ({tripoStatus.lastError})
                </span>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                <span>Tiến độ</span>
                <span>{completed}/{total} ảnh · {progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Pending: {status?.summary.pending ?? 0}
                </span>
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                  Processing: {status?.summary.processing ?? 0}
                </span>
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Completed: {status?.summary.completed ?? 0}
                </span>
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  Partial: {status?.summary.partial ?? 0}
                </span>
                <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                  Failed: {status?.summary.failed ?? 0}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleProcessAll}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Xử lý ảnh đang chờ
              </button>
              {hasFailed && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-60"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                  Retry ảnh lỗi
                </button>
              )}
              {hasPartial && (
                <div className="text-xs text-blue-600 dark:text-blue-300 font-medium">
                  Ảnh "Partial" đã xóa nền nhưng chưa có 3D.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={18} />
              <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">Danh sách ảnh</h2>
            </div>

            {loading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải...
              </div>
            ) : status?.images.length ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {status.images.map((image) => (
                  <div key={image.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <img src={image.url} alt={`Ảnh ${image.id}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Ảnh #{image.id}</span>
                        {renderImageStatus(image)}
                        {image.processingStatus === "partial" && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-300 font-bold">
                            noBg ✓ | 3D ✗
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        {image.noBgUrl && (
                          <a className="text-emerald-600 hover:underline" href={image.noBgUrl} target="_blank" rel="noreferrer">
                            noBgUrl
                          </a>
                        )}
                        {image.model3dUrl && (
                          <a className="text-rose-600 hover:underline" href={image.model3dUrl} target="_blank" rel="noreferrer">
                            model3dUrl
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      {image.processingStatus === "partial" && (
                        <button
                          type="button"
                          onClick={() => handleRetry3D(image.id)}
                          disabled={actionLoading}
                          className="mb-2 px-3 py-2 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 disabled:opacity-60"
                        >
                          Retry 3D
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleProcessImage(image.id)}
                        disabled={actionLoading}
                        className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-60"
                      >
                        Xử lý lại
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500">Chưa có ảnh nào.</div>
            )}
          </div>
        </div>
      </DashboardLayoutWrapper>
    </ThemeProvider>
  );
}

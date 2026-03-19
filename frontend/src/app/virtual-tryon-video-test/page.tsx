'use client';

import { useCallback, useState } from 'react';
import { ResultView } from '@/components/virtual-tryon';
import { generateVideoFromExistingImage } from '@/services/virtual-tryon-api';
import type { TryOnResult } from '@/types/virtual-tryon';

const VIDEO_DURATIONS = [4, 6, 8, 10];

export default function VirtualTryOnVideoTestPage() {
  const [resultImageGcsUri, setResultImageGcsUri] = useState('');
  const [videoDuration, setVideoDuration] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TryOnResult | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!resultImageGcsUri.trim()) {
      setError('Vui lòng nhập resultImageGcsUri để test video.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await generateVideoFromExistingImage({
        resultImageGcsUri: resultImageGcsUri.trim(),
        videoDurationSeconds: videoDuration,
        productId: 'video-test',
        productName: 'Video test',
      });

      if (response.result) {
        setResult(response.result);
      }

      if (!response.success) {
        setError(response.error || 'Không thể tạo video thử đồ.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [resultImageGcsUri, videoDuration]);

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const handleDownloadImage = useCallback(() => {
    if (!result?.resultImage) return;
    const link = document.createElement('a');
    link.href = result.resultImage;
    link.download = 'tryon-video-test.jpg';
    link.click();
  }, [result]);

  const handleDownloadVideo = useCallback(() => {
    if (!result?.resultVideo) return;
    const link = document.createElement('a');
    link.href = result.resultVideo;
    link.download = 'tryon-video-test.mp4';
    link.click();
  }, [result]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">Test nhanh video từ resultImageGcsUri</h1>
        <p className="text-sm text-gray-600">
          Dùng một ảnh try-on đã render trước để tạo video, tránh tốn token tạo ảnh lại.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">resultImageGcsUri</label>
          <input
            type="text"
            value={resultImageGcsUri}
            onChange={(event) => setResultImageGcsUri(event.target.value)}
            placeholder="gs://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Video duration (giây)</label>
          <div className="flex flex-wrap gap-2">
            {VIDEO_DURATIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => setVideoDuration(duration)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  videoDuration === duration
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                }`}
              >
                {duration}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
          >
            {loading ? 'Đang tạo video...' : 'Tạo video test'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {error}
          </div>
        )}
      </div>

      {result && (
        <ResultView
          result={result}
          onTryAgain={handleReset}
          onDownload={handleDownloadImage}
          onDownloadVideo={handleDownloadVideo}
        />
      )}
    </div>
  );
}

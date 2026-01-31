"use client";

import { Star } from "lucide-react";

interface ReviewStatsProps {
  stats: {
    average: number;
    total: number;
    distribution: Record<string, number>;
    fitFeedback: Record<string, number>;
    verifiedCount: number;
    withImagesCount: number;
  };
}

export default function ReviewStats({ stats }: ReviewStatsProps) {
  const _maxCount = Math.max(...Object.values(stats.distribution), 1);
  
  const fitTotal = Object.values(stats.fitFeedback).reduce((a, b) => a + b, 0);
  const fitPercentages = {
    SMALL: fitTotal > 0 ? Math.round((stats.fitFeedback.SMALL / fitTotal) * 100) : 0,
    TRUE_TO_SIZE: fitTotal > 0 ? Math.round((stats.fitFeedback.TRUE_TO_SIZE / fitTotal) * 100) : 0,
    LARGE: fitTotal > 0 ? Math.round((stats.fitFeedback.LARGE / fitTotal) * 100) : 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      {/* Left: Overall Rating */}
      <div className="flex flex-col items-center md:items-start">
        <div className="text-5xl font-light text-gray-900 dark:text-white mb-2">
          {stats.average.toFixed(1)}
        </div>
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= Math.round(stats.average)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {stats.total} đánh giá
          {stats.verifiedCount > 0 && (
            <span className="ml-2 text-green-600 dark:text-green-400">
              • {stats.verifiedCount} đã mua hàng
            </span>
          )}
        </p>

        {/* Rating Distribution */}
        <div className="w-full mt-4 space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.distribution[String(rating)] || 0;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center gap-2 text-sm">
                <span className="w-3 text-gray-600 dark:text-gray-400">{rating}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right text-gray-500 dark:text-gray-400">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Fit Feedback */}
      {fitTotal > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Độ vừa vặn
          </h4>
          
          {/* Fit Scale */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Chật</span>
              <span>Chuẩn form</span>
              <span>Rộng</span>
            </div>
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
              {/* Marker position based on weighted average */}
              {(() => {
                const weightedPos = 
                  (fitPercentages.TRUE_TO_SIZE * 50 + 
                   fitPercentages.LARGE * 100) / 100;
                return (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-black dark:bg-white rounded-full border-2 border-white dark:border-gray-800 shadow-md transition-all"
                    style={{ left: `calc(${weightedPos}% - 8px)` }}
                  />
                );
              })()}
            </div>
          </div>

          {/* Fit Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Chật hơn mô tả</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {fitPercentages.SMALL}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Chuẩn form</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {fitPercentages.TRUE_TO_SIZE}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Rộng hơn mô tả</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {fitPercentages.LARGE}%
              </span>
            </div>
          </div>

          {fitPercentages.TRUE_TO_SIZE >= 50 && (
            <p className="mt-4 text-sm text-green-600 dark:text-green-400">
              ✓ {fitPercentages.TRUE_TO_SIZE}% khách hàng nói chuẩn form
            </p>
          )}
        </div>
      )}
    </div>
  );
}

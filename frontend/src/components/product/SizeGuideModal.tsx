"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Ruler, HelpCircle, Lightbulb } from "lucide-react";
import { SIZE_CHARTS, getCategoryChartKey, SizeChartData, SizeInfo } from "@/constants/sizeCharts";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  categorySlug?: string;
}

type TabType = "chart" | "measure" | "tips";

export default function SizeGuideModal({ isOpen, onClose, categorySlug }: SizeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [chartData, setChartData] = useState<SizeChartData | null>(null);

  useEffect(() => {
    if (categorySlug) {
      const key = getCategoryChartKey(categorySlug);
      setChartData(SIZE_CHARTS[key] || SIZE_CHARTS.default);
    } else {
      setChartData(SIZE_CHARTS.default);
    }
  }, [categorySlug]);

  // Close on ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !chartData) return null;

  const getSizeValue = (size: SizeInfo, header: string): string => {
    const headerMap: Record<string, keyof SizeInfo> = {
      "Size": "size",
      "Vòng ngực trên": "bust",
      "Vòng ngực dưới": "underBust",
      "Vòng ngực": "bust",
      "Cup": "cup",
      "Vòng eo": "waist",
      "Vòng mông": "hips",
      "Chiều cao": "height",
      "Cân nặng": "weight",
    };
    const key = headerMap[header];
    return key ? (size[key] as string) || "-" : "-";
  };

  const tabs = [
    { key: "chart" as TabType, label: "Bảng size", icon: Ruler },
    { key: "measure" as TabType, label: "Cách đo", icon: HelpCircle },
    { key: "tips" as TabType, label: "Mẹo chọn size", icon: Lightbulb },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2
              id="size-guide-title"
              className="text-xl font-semibold text-gray-900 dark:text-white"
            >
              Hướng dẫn chọn size
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {chartData.categoryName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "text-black dark:text-white border-b-2 border-black dark:border-white bg-white dark:bg-gray-900"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Size Chart Tab */}
          {activeTab === "chart" && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      {chartData.headers.map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {chartData.sizes.map((size, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                      >
                        {chartData.headers.map((header) => (
                          <td
                            key={header}
                            className={`px-4 py-3 whitespace-nowrap ${
                              header === "Size"
                                ? "font-semibold text-gray-900 dark:text-white"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            {getSizeValue(size, header)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Lưu ý:</strong> Bảng size chỉ mang tính tham khảo. Số đo thực tế có thể
                  chênh lệch 1-2cm tùy từng sản phẩm.
                </p>
              </div>
            </div>
          )}

          {/* Measurement Guide Tab */}
          {activeTab === "measure" && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                  <Ruler className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sử dụng thước dây mềm để đo
                </p>
              </div>

              <div className="space-y-4">
                {chartData.measurements.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {step.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Mẹo:</strong> Đo vào buổi sáng hoặc trưa để có kết quả chính xác nhất.
                  Tránh đo sau khi ăn no hoặc tập thể dục.
                </p>
              </div>
            </div>
          )}

          {/* Tips Tab */}
          {activeTab === "tips" && (
            <div className="space-y-4">
              {chartData.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                    💡
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{tip}</p>
                </div>
              ))}

              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                  Chính sách đổi size
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Nếu bạn chọn sai size, vui lòng liên hệ với chúng tôi trong vòng 7 ngày kể từ
                  ngày nhận hàng để được hỗ trợ đổi size miễn phí (sản phẩm chưa qua sử dụng,
                  còn nguyên tem mác).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

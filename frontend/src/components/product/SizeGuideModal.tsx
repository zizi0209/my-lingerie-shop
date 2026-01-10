"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Ruler, HelpCircle, Lightbulb, Globe, Loader2 } from "lucide-react";
import {
  ProductType,
  SizeChartData,
  SizeEntry,
  InternationalSizes,
  fetchSizeChartByType,
  fetchSizeChartByProduct,
  getInternationalSizes,
} from "@/lib/sizeTemplateApi";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  productType?: ProductType;
  productId?: number;
  selectedSize?: string;
  // Deprecated - kept for backward compatibility
  categorySlug?: string;
}

type TabType = "chart" | "measure" | "tips" | "international";

// Map category slug to product type (backward compatibility)
const mapCategoryToProductType = (slug?: string): ProductType => {
  if (!slug) return "SLEEPWEAR";
  const lowerSlug = slug.toLowerCase();
  if (lowerSlug.includes("ao-lot") || lowerSlug.includes("bra") || lowerSlug.includes("ao-nguc")) {
    return "BRA";
  }
  if (lowerSlug.includes("quan-lot") || lowerSlug.includes("panty")) {
    return "PANTY";
  }
  if (lowerSlug.includes("set") || lowerSlug.includes("bo-do-lot")) {
    return "SET";
  }
  if (lowerSlug.includes("dinh-hinh") || lowerSlug.includes("gen") || lowerSlug.includes("shapewear")) {
    return "SHAPEWEAR";
  }
  if (lowerSlug.includes("phu-kien") || lowerSlug.includes("accessory")) {
    return "ACCESSORY";
  }
  return "SLEEPWEAR";
};

export default function SizeGuideModal({
  isOpen,
  onClose,
  productType,
  productId,
  selectedSize,
  categorySlug,
}: SizeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("chart");
  const [chartData, setChartData] = useState<SizeChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentProductType, setCurrentProductType] = useState<ProductType | null>(null);
  const [internationalSizes, setInternationalSizes] = useState<InternationalSizes | null>(null);

  // Fetch size chart data
  useEffect(() => {
    if (!isOpen) return;

    const loadSizeChart = async () => {
      setLoading(true);
      try {
        let data: SizeChartData | null = null;
        let type: ProductType | null = null;

        // Priority 1: Fetch by productId (handles custom size chart)
        if (productId) {
          const result = await fetchSizeChartByProduct(productId);
          data = result.data;
          type = result.productType;
        }
        // Priority 2: Fetch by productType
        else if (productType) {
          type = productType;
          if (productType !== "ACCESSORY") {
            data = await fetchSizeChartByType(productType);
          }
        }
        // Priority 3: Map from categorySlug (backward compatibility)
        else if (categorySlug) {
          type = mapCategoryToProductType(categorySlug);
          if (type !== "ACCESSORY") {
            data = await fetchSizeChartByType(type);
          }
        }

        setChartData(data);
        setCurrentProductType(type);
        
        // Load international sizes
        if (type) {
          const intlSizes = data?.internationalSizes || getInternationalSizes(type);
          setInternationalSizes(intlSizes);
        }
      } catch (error) {
        console.error("Error loading size chart:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSizeChart();
  }, [isOpen, productType, productId, categorySlug]);

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

  // Don't render for ACCESSORY
  if (!isOpen || currentProductType === "ACCESSORY") return null;

  const getSizeValue = (size: SizeEntry, header: string): string => {
    const headerMap: Record<string, keyof SizeEntry> = {
      "Size": "size",
      "Size Set": "size",
      "Vòng ngực trên": "bust",
      "Vòng ngực dưới": "underBust",
      "Vòng ngực": "bust",
      "Cup": "cup",
      "Vòng eo": "waist",
      "Vòng mông": "hips",
      "Chiều cao": "height",
      "Cân nặng": "weight",
      "Vòng bụng dưới": "belly",
      "Size Áo (Bra)": "braSize",
      "Size Quần (Panty)": "pantySize",
    };
    const key = headerMap[header];
    return key ? (size[key] as string) || "-" : "-";
  };

  const tabs = [
    { key: "chart" as TabType, label: "Bảng size", icon: Ruler },
    { key: "measure" as TabType, label: "Cách đo", icon: HelpCircle },
    { key: "tips" as TabType, label: "Mẹo", icon: Lightbulb },
    ...(internationalSizes && currentProductType === "BRA"
      ? [{ key: "international" as TabType, label: "Quốc tế", icon: Globe }]
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-title"
    >
      {/* Drawer on mobile, Modal on desktop */}
      <div
        className="relative w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] bg-white dark:bg-gray-900 
                   rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden
                   animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

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
              {chartData?.name || "Nội Y"}
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* Content */}
        {!loading && chartData && (
          <>
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

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] sm:max-h-[calc(90vh-180px)]">
              {/* Size Chart Tab */}
              {activeTab === "chart" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          {chartData.headers.map((header) => (
                            <th
                              key={header}
                              className={`px-3 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap ${
                                header === "Size" || header === "Size Set" ? "sticky left-0 bg-gray-100 dark:bg-gray-800" : ""
                              }`}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {chartData.sizes.map((size, idx) => {
                          const isSelected = selectedSize && size.size === selectedSize;
                          return (
                            <tr
                              key={idx}
                              className={`transition ${
                                isSelected
                                  ? "bg-black/5 dark:bg-white/10"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              }`}
                            >
                              {chartData.headers.map((header) => {
                                const isFirstCol = header === "Size" || header === "Size Set";
                                return (
                                  <td
                                    key={header}
                                    className={`px-3 py-3 whitespace-nowrap ${
                                      isFirstCol
                                        ? `sticky left-0 font-semibold ${
                                            isSelected
                                              ? "text-black dark:text-white bg-black/5 dark:bg-white/10"
                                              : "text-gray-900 dark:text-white bg-white dark:bg-gray-900"
                                          }`
                                        : "text-gray-600 dark:text-gray-400"
                                    } ${isSelected && isFirstCol ? "ring-2 ring-black dark:ring-white ring-inset" : ""}`}
                                  >
                                    {getSizeValue(size, header)}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {chartData.note && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Lưu ý:</strong> {chartData.note}
                      </p>
                    </div>
                  )}

                  {!chartData.note && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Lưu ý:</strong> Bảng size chỉ mang tính tham khảo. Số đo thực tế có thể
                        chênh lệch 1-2cm tùy từng sản phẩm.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Measurement Guide Tab */}
              {activeTab === "measure" && (
                <div className="space-y-6">
                  {chartData.measurementImage && (
                    <div className="text-center mb-6">
                      <img
                        src={chartData.measurementImage}
                        alt="Hướng dẫn cách đo"
                        className="max-w-full h-auto mx-auto rounded-lg"
                      />
                    </div>
                  )}

                  {!chartData.measurementImage && (
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                        <Ruler className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sử dụng thước dây mềm để đo
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {chartData.measurements.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                      >
                        <div className="shrink-0 w-8 h-8 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold">
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
                      <div className="shrink-0 w-6 h-6 flex items-center justify-center bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
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

              {/* International Sizes Tab */}
              {activeTab === "international" && internationalSizes && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Bảng quy đổi size quốc tế cho áo lót. Size VN là size shop đang sử dụng.
                  </p>

                  <div className="overflow-x-auto -mx-2 px-2">
                    <table className="w-full text-sm min-w-[400px]">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-800">
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap sticky left-0 bg-gray-100 dark:bg-gray-800">
                            VN (Chúng tôi)
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            US
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            UK
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            EU
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {internationalSizes.VN &&
                          Object.keys(internationalSizes.VN).map((vnSize) => {
                            const isSelected = selectedSize === vnSize;
                            return (
                              <tr
                                key={vnSize}
                                className={`transition ${
                                  isSelected
                                    ? "bg-black/5 dark:bg-white/10"
                                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                }`}
                              >
                                <td
                                  className={`px-4 py-3 whitespace-nowrap sticky left-0 font-semibold ${
                                    isSelected
                                      ? "text-black dark:text-white bg-black/5 dark:bg-white/10 ring-2 ring-black dark:ring-white ring-inset"
                                      : "text-gray-900 dark:text-white bg-white dark:bg-gray-900"
                                  }`}
                                >
                                  {vnSize}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                  {internationalSizes.US?.[vnSize] || "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                  {internationalSizes.UK?.[vnSize] || "-"}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                  {internationalSizes.EU?.[vnSize] || "-"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Lưu ý:</strong> Bảng quy đổi mang tính tham khảo. Size có thể khác nhau
                      tùy từng thương hiệu.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* No data */}
        {!loading && !chartData && (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <Ruler className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Không có bảng size cho sản phẩm này
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

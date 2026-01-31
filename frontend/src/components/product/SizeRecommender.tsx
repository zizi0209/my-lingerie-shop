"use client";

import React, { useState, useEffect } from "react";
import { Calculator, Sparkles, Save, Loader2, CheckCircle } from "lucide-react";
import { ProductType, SizeEntry } from "@/lib/sizeTemplateApi";

interface SizeRecommenderProps {
  productType: ProductType;
  sizes: SizeEntry[];
  onSizeRecommended?: (size: string) => void;
}

interface UserMeasurements {
  bust?: number;
  underBust?: number;
  waist?: number;
  hips?: number;
  height?: number;
  weight?: number;
}

interface RecommendResult {
  size: string;
  confidence: number; // 0-100
  message: string;
}

// Parse range string like "78-80 cm" to { min: 78, max: 80 }
const parseRange = (rangeStr?: string): { min: number; max: number } | null => {
  if (!rangeStr) return null;
  const match = rangeStr.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (match) {
    return { min: parseFloat(match[1]), max: parseFloat(match[2]) };
  }
  // Single value like "A" or just number
  const single = rangeStr.match(/(\d+(?:\.\d+)?)/);
  if (single) {
    const val = parseFloat(single[1]);
    return { min: val, max: val };
  }
  return null;
};

// Calculate cup size from bust and underbust difference
const calculateCup = (bustDiff: number): string => {
  if (bustDiff < 11) return "A";
  if (bustDiff < 13.5) return "B";
  if (bustDiff < 16) return "C";
  if (bustDiff < 18.5) return "D";
  return "DD";
};

// Calculate band size from underbust
const calculateBand = (underBust: number): number => {
  if (underBust < 68) return 65;
  if (underBust < 73) return 70;
  if (underBust < 78) return 75;
  if (underBust < 83) return 80;
  if (underBust < 88) return 85;
  return 90;
};

// Recommend BRA size
const recommendBraSize = (
  measurements: UserMeasurements,
  sizes: SizeEntry[]
): RecommendResult | null => {
  const { bust, underBust } = measurements;
  if (!bust || !underBust) return null;

  const bustDiff = bust - underBust;
  const cup = calculateCup(bustDiff);
  const band = calculateBand(underBust);
  const recommendedSize = `${band}${cup}`;

  // Find exact match
  const exactMatch = sizes.find((s) => s.size === recommendedSize);
  if (exactMatch) {
    return {
      size: recommendedSize,
      confidence: 95,
      message: `Dựa trên số đo của bạn, size ${recommendedSize} sẽ phù hợp nhất!`,
    };
  }

  // Find closest match
  const sameBand = sizes.filter((s) => s.size.startsWith(String(band)));
  if (sameBand.length > 0) {
    return {
      size: sameBand[0].size,
      confidence: 80,
      message: `Size ${sameBand[0].size} có thể phù hợp. Gợi ý: thử thêm size liền kề.`,
    };
  }

  // Fallback to middle size
  const middleIdx = Math.floor(sizes.length / 2);
  return {
    size: sizes[middleIdx]?.size || "",
    confidence: 50,
    message: "Số đo của bạn nằm ngoài bảng size. Vui lòng liên hệ shop để tư vấn.",
  };
};

// Recommend PANTY/ALPHA size (S, M, L, XL)
const recommendAlphaSize = (
  measurements: UserMeasurements,
  sizes: SizeEntry[],
  primaryMeasure: "hips" | "waist" | "bust"
): RecommendResult | null => {
  const value = measurements[primaryMeasure];
  if (!value) return null;

  for (const sizeEntry of sizes) {
    const range = parseRange(
      primaryMeasure === "hips"
        ? sizeEntry.hips
        : primaryMeasure === "waist"
        ? sizeEntry.waist
        : sizeEntry.bust
    );
    if (range && value >= range.min && value <= range.max) {
      return {
        size: sizeEntry.size,
        confidence: 90,
        message: `Dựa trên ${primaryMeasure === "hips" ? "vòng mông" : primaryMeasure === "waist" ? "vòng eo" : "vòng ngực"} của bạn, size ${sizeEntry.size} sẽ phù hợp!`,
      };
    }
  }

  // Find closest
  let closestSize = sizes[0]?.size || "";
  let minDiff = Infinity;
  for (const sizeEntry of sizes) {
    const range = parseRange(
      primaryMeasure === "hips"
        ? sizeEntry.hips
        : primaryMeasure === "waist"
        ? sizeEntry.waist
        : sizeEntry.bust
    );
    if (range) {
      const mid = (range.min + range.max) / 2;
      const diff = Math.abs(value - mid);
      if (diff < minDiff) {
        minDiff = diff;
        closestSize = sizeEntry.size;
      }
    }
  }

  return {
    size: closestSize,
    confidence: 70,
    message: `Size ${closestSize} có thể phù hợp nhất với số đo của bạn.`,
  };
};

// Recommend SLEEPWEAR size (uses height/weight)
const recommendSleepwearSize = (
  measurements: UserMeasurements,
  sizes: SizeEntry[]
): RecommendResult | null => {
  const { height, weight, bust } = measurements;

  // Try bust first
  if (bust) {
    for (const sizeEntry of sizes) {
      const range = parseRange(sizeEntry.bust);
      if (range && bust >= range.min && bust <= range.max) {
        return {
          size: sizeEntry.size,
          confidence: 85,
          message: `Dựa trên vòng ngực, size ${sizeEntry.size} sẽ phù hợp!`,
        };
      }
    }
  }

  // Try height + weight
  if (height && weight) {
    for (const sizeEntry of sizes) {
      const heightRange = parseRange(sizeEntry.height);
      const weightRange = parseRange(sizeEntry.weight);
      if (heightRange && weightRange) {
        const heightMatch = height >= heightRange.min && height <= heightRange.max;
        const weightMatch = weight >= weightRange.min && weight <= weightRange.max;
        if (heightMatch && weightMatch) {
          return {
            size: sizeEntry.size,
            confidence: 90,
            message: `Dựa trên chiều cao và cân nặng, size ${sizeEntry.size} rất phù hợp!`,
          };
        }
        if (heightMatch || weightMatch) {
          return {
            size: sizeEntry.size,
            confidence: 75,
            message: `Size ${sizeEntry.size} có thể phù hợp. Nên thử thêm size liền kề.`,
          };
        }
      }
    }
  }

  return null;
};

export default function SizeRecommender({
  productType,
  sizes,
  onSizeRecommended,
}: SizeRecommenderProps) {
  const [measurements, setMeasurements] = useState<UserMeasurements>({});
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingProfile, _setLoadingProfile] = useState(false);

  // Load saved measurements from localStorage (temporary until backend migration)
  useEffect(() => {
    const loadSavedMeasurements = () => {
      try {
        const saved = localStorage.getItem("userMeasurements");
        if (saved) {
          setMeasurements(JSON.parse(saved));
        }
      } catch {
        // Ignore
      }
    };
    loadSavedMeasurements();
  }, []);

  const handleInputChange = (field: keyof UserMeasurements, value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    setMeasurements((prev) => ({ ...prev, [field]: numValue }));
    setResult(null);
    setSaved(false);
  };

  const handleCalculate = () => {
    let recommendation: RecommendResult | null = null;

    switch (productType) {
      case "BRA":
        recommendation = recommendBraSize(measurements, sizes);
        break;
      case "PANTY":
        recommendation = recommendAlphaSize(measurements, sizes, "hips");
        break;
      case "SET":
        // SET uses bust primarily
        recommendation = recommendAlphaSize(measurements, sizes, "bust");
        break;
      case "SLEEPWEAR":
        recommendation = recommendSleepwearSize(measurements, sizes);
        break;
      case "SHAPEWEAR":
        recommendation = recommendAlphaSize(measurements, sizes, "waist");
        break;
      default:
        recommendation = recommendAlphaSize(measurements, sizes, "bust");
    }

    setResult(recommendation);
    if (recommendation && onSizeRecommended) {
      onSizeRecommended(recommendation.size);
    }
  };

  const handleSaveMeasurements = () => {
    setSaving(true);
    try {
      localStorage.setItem("userMeasurements", JSON.stringify(measurements));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving measurements:", error);
    } finally {
      setSaving(false);
    }
  };

  // Render input fields based on product type
  const renderInputs = () => {
    switch (productType) {
      case "BRA":
        return (
          <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng ngực trên (cm)
              </label>
              <input
                type="number"
                value={measurements.bust || ""}
                onChange={(e) => handleInputChange("bust", e.target.value)}
                placeholder="VD: 85"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng ngực dưới (cm)
              </label>
              <input
                type="number"
                value={measurements.underBust || ""}
                onChange={(e) => handleInputChange("underBust", e.target.value)}
                placeholder="VD: 73"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </>
        );
      case "PANTY":
        return (
          <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng mông (cm)
              </label>
              <input
                type="number"
                value={measurements.hips || ""}
                onChange={(e) => handleInputChange("hips", e.target.value)}
                placeholder="VD: 92"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng eo (cm) - tùy chọn
              </label>
              <input
                type="number"
                value={measurements.waist || ""}
                onChange={(e) => handleInputChange("waist", e.target.value)}
                placeholder="VD: 68"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </>
        );
      case "SLEEPWEAR":
        return (
          <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Chiều cao (cm)
              </label>
              <input
                type="number"
                value={measurements.height || ""}
                onChange={(e) => handleInputChange("height", e.target.value)}
                placeholder="VD: 160"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Cân nặng (kg)
              </label>
              <input
                type="number"
                value={measurements.weight || ""}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="VD: 52"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng ngực (cm) - tùy chọn
              </label>
              <input
                type="number"
                value={measurements.bust || ""}
                onChange={(e) => handleInputChange("bust", e.target.value)}
                placeholder="VD: 85"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </>
        );
      case "SHAPEWEAR":
        return (
          <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng eo (cm)
              </label>
              <input
                type="number"
                value={measurements.waist || ""}
                onChange={(e) => handleInputChange("waist", e.target.value)}
                placeholder="VD: 68"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng mông (cm)
              </label>
              <input
                type="number"
                value={measurements.hips || ""}
                onChange={(e) => handleInputChange("hips", e.target.value)}
                placeholder="VD: 92"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </>
        );
      case "SET":
      default:
        return (
          <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng ngực (cm)
              </label>
              <input
                type="number"
                value={measurements.bust || ""}
                onChange={(e) => handleInputChange("bust", e.target.value)}
                placeholder="VD: 85"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vòng mông (cm)
              </label>
              <input
                type="number"
                value={measurements.hips || ""}
                onChange={(e) => handleInputChange("hips", e.target.value)}
                placeholder="VD: 92"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
              />
            </div>
          </>
        );
    }
  };

  const hasRequiredInputs = () => {
    switch (productType) {
      case "BRA":
        return measurements.bust && measurements.underBust;
      case "PANTY":
        return measurements.hips;
      case "SLEEPWEAR":
        return (measurements.height && measurements.weight) || measurements.bust;
      case "SHAPEWEAR":
        return measurements.waist;
      case "SET":
      default:
        return measurements.bust || measurements.hips;
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
          <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
            Gợi ý size cho bạn
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nhập số đo để được gợi ý size phù hợp
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">{renderInputs()}</div>

      <div className="flex gap-2">
        <button
          onClick={handleCalculate}
          disabled={!hasRequiredInputs()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                   bg-black dark:bg-white text-white dark:text-black text-sm font-medium
                   rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          Gợi ý size
        </button>

        {Object.keys(measurements).length > 0 && (
          <button
            onClick={handleSaveMeasurements}
            disabled={saving || saved}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 
                     border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                     text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition
                     disabled:opacity-50"
            title="Lưu số đo"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {result.size}
            </span>
            <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full">
              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                {result.confidence}% phù hợp
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{result.message}</p>
        </div>
      )}


    </div>
  );
}

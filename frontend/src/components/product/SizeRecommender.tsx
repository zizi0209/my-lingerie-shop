"use client";

import React, { useState, useEffect, useId } from "react";
import { Calculator, Sparkles, Save, Loader2, CheckCircle, AlertCircle, Info, RefreshCw } from "lucide-react";
import { ProductType, SizeEntry } from "@/lib/sizeTemplateApi";

// ============================================
// TYPES
// ============================================

interface SizeRecommenderProps {
  productType: ProductType;
  sizes: SizeEntry[];
  onSizeRecommended?: (size: string) => void;
  productId?: number;
}

interface UserMeasurements {
  bust?: number;
  underBust?: number;
  waist?: number;
  hips?: number;
  height?: number;
  weight?: number;
}

// Body shape types for more accurate recommendations
export type BodyShape = "hourglass" | "pear" | "apple" | "rectangle" | "inverted_triangle";

// Fit preference - how the customer likes their clothes to fit
export type FitPreference = "snug" | "regular" | "relaxed";

interface UserPreferences {
  bodyShape?: BodyShape;
  fitPreference: FitPreference;
}

interface RecommendResult {
  size: string;
  confidence: number; // 0-100
  message: string;
  alternativeSize?: string;
  alternativeMessage?: string;
  adjustmentReason?: string;
}

interface ValidationError {
  field: keyof UserMeasurements;
  message: string;
}

// ============================================
// CONSTANTS
// ============================================

// Measurement validation ranges (realistic human body measurements)
export const MEASUREMENT_RANGES: Record<keyof UserMeasurements, { min: number; max: number; unit: string; label: string }> = {
  bust: { min: 60, max: 150, unit: "cm", label: "Vòng ngực" },
  underBust: { min: 55, max: 130, unit: "cm", label: "Vòng ngực dưới" },
  waist: { min: 45, max: 140, unit: "cm", label: "Vòng eo" },
  hips: { min: 70, max: 160, unit: "cm", label: "Vòng mông" },
  height: { min: 140, max: 200, unit: "cm", label: "Chiều cao" },
  weight: { min: 30, max: 150, unit: "kg", label: "Cân nặng" },
};

// Body shape options with descriptions
export const BODY_SHAPES: { value: BodyShape; label: string; description: string }[] = [
  { value: "hourglass", label: "Đồng hồ cát", description: "Ngực và hông cân đối, eo thon" },
  { value: "pear", label: "Quả lê", description: "Hông rộng hơn ngực" },
  { value: "apple", label: "Quả táo", description: "Ngực và eo rộng, hông hẹp hơn" },
  { value: "rectangle", label: "Chữ nhật", description: "Ngực, eo, hông gần bằng nhau" },
  { value: "inverted_triangle", label: "Tam giác ngược", description: "Vai và ngực rộng hơn hông" },
];

// Fit preference options
export const FIT_PREFERENCES: { value: FitPreference; label: string; description: string }[] = [
  { value: "snug", label: "Ôm sát", description: "Thích đồ bó, nâng đỡ tốt" },
  { value: "regular", label: "Vừa vặn", description: "Thoải mái, không quá chật hay rộng" },
  { value: "relaxed", label: "Thoải mái", description: "Thích đồ rộng, thoáng mát" },
];

// Validate a single measurement value
const validateMeasurement = (
  field: keyof UserMeasurements,
  value: number | undefined
): ValidationError | null => {
  if (value === undefined) return null;
  
  const range = MEASUREMENT_RANGES[field];
  if (!range) return null;

  if (value <= 0) {
    return {
      field,
      message: `${range.label} phải là số dương`,
    };
  }

  if (value < range.min || value > range.max) {
    return {
      field,
      message: `${range.label} nên trong khoảng ${range.min}-${range.max} ${range.unit}`,
    };
  }

  return null;
};

// Extended cup calculation with more sizes (AA to K)
export const CUP_RANGES = [
  { maxDiff: 10, cup: "AA" },
  { maxDiff: 12, cup: "A" },
  { maxDiff: 14, cup: "B" },
  { maxDiff: 16, cup: "C" },
  { maxDiff: 18, cup: "D" },
  { maxDiff: 20, cup: "DD" },
  { maxDiff: 22, cup: "E" },
  { maxDiff: 24, cup: "F" },
  { maxDiff: 26, cup: "G" },
  { maxDiff: 28, cup: "H" },
  { maxDiff: 30, cup: "I" },
  { maxDiff: 32, cup: "J" },
  { maxDiff: Infinity, cup: "K" },
];

// Extended band size calculation
export const BAND_RANGES = [
  { maxUnderBust: 63, band: 60 },
  { maxUnderBust: 68, band: 65 },
  { maxUnderBust: 73, band: 70 },
  { maxUnderBust: 78, band: 75 },
  { maxUnderBust: 83, band: 80 },
  { maxUnderBust: 88, band: 85 },
  { maxUnderBust: 93, band: 90 },
  { maxUnderBust: 98, band: 95 },
  { maxUnderBust: 103, band: 100 },
  { maxUnderBust: 108, band: 105 },
  { maxUnderBust: Infinity, band: 110 },
];

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
export const calculateCup = (bustDiff: number): string => {
  const cupEntry = CUP_RANGES.find((entry) => bustDiff < entry.maxDiff);
  return cupEntry?.cup || "K";
};

// Calculate band size from underbust
export const calculateBand = (underBust: number): number => {
  const bandEntry = BAND_RANGES.find((entry) => underBust < entry.maxUnderBust);
  return bandEntry?.band || 110;
};

// Get next cup size (sister size up - larger band, smaller cup)
const getNextCupDown = (cup: string): string | null => {
  const cupOrder = ["AA", "A", "B", "C", "D", "DD", "E", "F", "G", "H", "I", "J", "K"];
  const idx = cupOrder.indexOf(cup);
  return idx > 0 ? cupOrder[idx - 1] : null;
};

// Get previous cup size (sister size down - smaller band, larger cup)
const getNextCupUp = (cup: string): string | null => {
  const cupOrder = ["AA", "A", "B", "C", "D", "DD", "E", "F", "G", "H", "I", "J", "K"];
  const idx = cupOrder.indexOf(cup);
  return idx < cupOrder.length - 1 ? cupOrder[idx + 1] : null;
};

// Calculate sister sizes for a bra size
export const calculateSisterSizes = (
  band: number,
  cup: string
): { sisterDown: string | null; sisterUp: string | null } => {
  const cupUp = getNextCupUp(cup);
  const cupDown = getNextCupDown(cup);
  
  return {
    sisterDown: cupUp && band > 60 ? `${band - 5}${cupUp}` : null,
    sisterUp: cupDown && band < 110 ? `${band + 5}${cupDown}` : null,
  };
};

// Apply fit preference adjustment
const applyFitPreferenceAdjustment = (
  size: string,
  preference: FitPreference,
  productType: ProductType
): { adjustedSize: string; reason: string } | null => {
  // For bra sizes (e.g., "75C")
  const braMatch = size.match(/^(\d+)([A-K]+)$/);
  if (braMatch && productType === "BRA") {
    const band = parseInt(braMatch[1]);
    const cup = braMatch[2];
    
    if (preference === "snug" && band > 60) {
      return {
        adjustedSize: `${band - 5}${cup}`,
        reason: "Giảm 1 size dây lưng để ôm sát hơn",
      };
    }
    if (preference === "relaxed" && band < 110) {
      return {
        adjustedSize: `${band + 5}${cup}`,
        reason: "Tăng 1 size dây lưng để thoải mái hơn",
      };
    }
  }
  
  // For alpha sizes (S, M, L, XL)
  const alphaOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const alphaIdx = alphaOrder.indexOf(size.toUpperCase());
  if (alphaIdx >= 0) {
    if (preference === "snug" && alphaIdx > 0) {
      return {
        adjustedSize: alphaOrder[alphaIdx - 1],
        reason: "Giảm 1 size để ôm sát hơn",
      };
    }
    if (preference === "relaxed" && alphaIdx < alphaOrder.length - 1) {
      return {
        adjustedSize: alphaOrder[alphaIdx + 1],
        reason: "Tăng 1 size để thoải mái hơn",
      };
    }
  }
  
  return null;
};

// Apply body shape adjustment for specific product types
const applyBodyShapeAdjustment = (
  measurements: UserMeasurements,
  bodyShape: BodyShape,
  productType: ProductType
): { adjustment: string; note: string } | null => {
  switch (bodyShape) {
    case "pear":
      // Pear shape: wider hips - may need to size up for panties/sleepwear
      if (productType === "PANTY" || productType === "SLEEPWEAR") {
        return {
          adjustment: "size_up",
          note: "Dáng quả lê: nên chọn size theo vòng hông",
        };
      }
      break;
    case "apple":
      // Apple shape: wider waist - may need to size up for shapewear
      if (productType === "SHAPEWEAR") {
        return {
          adjustment: "size_up",
          note: "Dáng quả táo: nên chọn size thoải mái cho vòng eo",
        };
      }
      break;
    case "hourglass":
      // Hourglass: balanced - standard sizing works well
      return {
        adjustment: "none",
        note: "Dáng đồng hồ cát: bảng size chuẩn phù hợp với bạn",
      };
    case "inverted_triangle":
      // Inverted triangle: wider shoulders/bust
      if (productType === "BRA" || productType === "SET") {
        return {
          adjustment: "focus_bust",
          note: "Dáng tam giác ngược: ưu tiên chọn theo vòng ngực",
        };
      }
      break;
    case "rectangle":
      // Rectangle: similar measurements - standard sizing
      return {
        adjustment: "none",
        note: "Dáng chữ nhật: bảng size chuẩn phù hợp với bạn",
      };
  }
  return null;
};

// ============================================
// RECOMMENDATION FUNCTIONS
// ============================================

// Recommend BRA size
const recommendBraSize = (
  measurements: UserMeasurements,
  sizes: SizeEntry[],
  preferences?: UserPreferences
): RecommendResult | null => {
  const { bust, underBust } = measurements;
  if (!bust || !underBust) return null;

  const bustDiff = bust - underBust;
  let cup = calculateCup(bustDiff);
  let band = calculateBand(underBust);
  const recommendedSize = `${band}${cup}`;

  // Calculate sister sizes
  const sisterSizes = calculateSisterSizes(band, cup);

  // Find exact match
  const exactMatch = sizes.find((s) => s.size === recommendedSize);
  if (exactMatch) {
    let result: RecommendResult = {
      size: recommendedSize,
      confidence: 95,
      message: `Dựa trên số đo của bạn, size ${recommendedSize} sẽ phù hợp nhất!`,
    };
    
    // Apply fit preference
    if (preferences?.fitPreference && preferences.fitPreference !== "regular") {
      const fitAdjustment = applyFitPreferenceAdjustment(
        recommendedSize,
        preferences.fitPreference,
        "BRA"
      );
      if (fitAdjustment) {
        result.alternativeSize = fitAdjustment.adjustedSize;
        result.alternativeMessage = fitAdjustment.reason;
      }
    }
    
    // Add body shape note
    if (preferences?.bodyShape) {
      const shapeNote = applyBodyShapeAdjustment(measurements, preferences.bodyShape, "BRA");
      if (shapeNote) {
        result.adjustmentReason = shapeNote.note;
      }
    }
    
    return result;
  }

  // Size not found - try sister sizes
  if (sisterSizes.sisterDown) {
    const sisterDownMatch = sizes.find((s) => s.size === sisterSizes.sisterDown);
    if (sisterDownMatch) {
      return {
        size: sisterSizes.sisterDown,
        confidence: 85,
        message: `Size ${recommendedSize} không có. Thử size chị em ${sisterSizes.sisterDown} (dây lưng chặt hơn, cup lớn hơn).`,
        alternativeSize: sisterSizes.sisterUp || undefined,
        alternativeMessage: sisterSizes.sisterUp ? `Hoặc thử ${sisterSizes.sisterUp} (dây lưng rộng hơn)` : undefined,
      };
    }
  }
  
  if (sisterSizes.sisterUp) {
    const sisterUpMatch = sizes.find((s) => s.size === sisterSizes.sisterUp);
    if (sisterUpMatch) {
      return {
        size: sisterSizes.sisterUp,
        confidence: 85,
        message: `Size ${recommendedSize} không có. Thử size chị em ${sisterSizes.sisterUp} (dây lưng rộng hơn, cup nhỏ hơn).`,
      };
    }
  }

  // Find closest match by band
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
  primaryMeasure: "hips" | "waist" | "bust",
  productType: ProductType,
  preferences?: UserPreferences
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
      let result: RecommendResult = {
        size: sizeEntry.size,
        confidence: 90,
        message: `Dựa trên ${primaryMeasure === "hips" ? "vòng mông" : primaryMeasure === "waist" ? "vòng eo" : "vòng ngực"} của bạn, size ${sizeEntry.size} sẽ phù hợp!`,
      };
      
      // Apply fit preference
      if (preferences?.fitPreference && preferences.fitPreference !== "regular") {
        const fitAdjustment = applyFitPreferenceAdjustment(
          sizeEntry.size,
          preferences.fitPreference,
          productType
        );
        if (fitAdjustment) {
          result.alternativeSize = fitAdjustment.adjustedSize;
          result.alternativeMessage = fitAdjustment.reason;
        }
      }
      
      // Add body shape note
      if (preferences?.bodyShape) {
        const shapeNote = applyBodyShapeAdjustment(measurements, preferences.bodyShape, productType);
        if (shapeNote) {
          result.adjustmentReason = shapeNote.note;
        }
      }
      
      return result;
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
const recommendSleepwearSize = (measurements: UserMeasurements, sizes: SizeEntry[], preferences?: UserPreferences): RecommendResult | null => {
  const { height, weight, bust } = measurements;

  // Try bust first
  if (bust) {
    for (const sizeEntry of sizes) {
      const range = parseRange(sizeEntry.bust);
      if (range && bust >= range.min && bust <= range.max) {
        let result: RecommendResult = {
          size: sizeEntry.size,
          confidence: 85,
          message: `Dựa trên vòng ngực, size ${sizeEntry.size} sẽ phù hợp!`,
        };
        
        if (preferences?.fitPreference && preferences.fitPreference !== "regular") {
          const fitAdjustment = applyFitPreferenceAdjustment(sizeEntry.size, preferences.fitPreference, "SLEEPWEAR");
          if (fitAdjustment) {
            result.alternativeSize = fitAdjustment.adjustedSize;
            result.alternativeMessage = fitAdjustment.reason;
          }
        }
        
        return result;
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
          let result: RecommendResult = {
            size: sizeEntry.size,
            confidence: 90,
            message: `Dựa trên chiều cao và cân nặng, size ${sizeEntry.size} rất phù hợp!`,
          };
          
          if (preferences?.fitPreference && preferences.fitPreference !== "regular") {
            const fitAdjustment = applyFitPreferenceAdjustment(sizeEntry.size, preferences.fitPreference, "SLEEPWEAR");
            if (fitAdjustment) {
              result.alternativeSize = fitAdjustment.adjustedSize;
              result.alternativeMessage = fitAdjustment.reason;
            }
          }
          
          return result;
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function SizeRecommender({
  productType,
  sizes,
  onSizeRecommended,
  productId,
}: SizeRecommenderProps) {
  const [measurements, setMeasurements] = useState<UserMeasurements>({});
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [loadingProfile, _setLoadingProfile] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    fitPreference: "regular",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate unique IDs for accessibility
  const formId = useId();

  // Load saved measurements from localStorage (temporary until backend migration)
  useEffect(() => {
    const loadSavedMeasurements = () => {
      try {
        const saved = localStorage.getItem("userMeasurements");
        if (saved) {
          setMeasurements(JSON.parse(saved));
        }
        const savedPrefs = localStorage.getItem("userSizePreferences");
        if (savedPrefs) {
          setPreferences(JSON.parse(savedPrefs));
        }
      } catch {
        // Ignore
      }
    };
    loadSavedMeasurements();
  }, []);

  const handleInputChange = (field: keyof UserMeasurements, value: string) => {
    // Allow empty value to clear the field
    if (!value || value === "") {
      setMeasurements((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      setValidationErrors((prev) => prev.filter((e) => e.field !== field));
      setResult(null);
      setSaved(false);
      return;
    }

    const numValue = parseFloat(value);
    
    // Block negative and zero values immediately
    if (isNaN(numValue) || numValue <= 0) {
      return;
    }

    setMeasurements((prev) => ({ ...prev, [field]: numValue }));
    
    // Validate and update errors
    const error = validateMeasurement(field, numValue);
    setValidationErrors((prev) => {
      const filtered = prev.filter((e) => e.field !== field);
      return error ? [...filtered, error] : filtered;
    });
    
    setResult(null);
    setSaved(false);
  };

  const handleCalculate = () => {
    let recommendation: RecommendResult | null = null;

    switch (productType) {
      case "BRA":
        recommendation = recommendBraSize(measurements, sizes, preferences);
        break;
      case "PANTY":
        recommendation = recommendAlphaSize(measurements, sizes, "hips", productType, preferences);
        break;
      case "SET":
        // SET uses bust primarily
        recommendation = recommendAlphaSize(measurements, sizes, "bust", productType, preferences);
        break;
      case "SLEEPWEAR":
        recommendation = recommendSleepwearSize(measurements, sizes, preferences);
        break;
      case "SHAPEWEAR":
        recommendation = recommendAlphaSize(measurements, sizes, "waist", productType, preferences);
        break;
      default:
        recommendation = recommendAlphaSize(measurements, sizes, "bust", productType, preferences);
    }

    setResult(recommendation);
    if (recommendation && onSizeRecommended) {
      onSizeRecommended(recommendation.size);
    }
  };

  // Check if there are any validation errors
  const hasValidationErrors = () => {
    return validationErrors.some((e) => e.message.includes("phải là số dương"));
  };

  // Get error message for a specific field
  const getFieldError = (field: keyof UserMeasurements): string | undefined => {
    return validationErrors.find((e) => e.field === field)?.message;
  };

  const handleSaveMeasurements = () => {
    setSaving(true);
    try {
      localStorage.setItem("userMeasurements", JSON.stringify(measurements));
      localStorage.setItem("userSizePreferences", JSON.stringify(preferences));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving measurements:", error);
    } finally {
      setSaving(false);
    }
  };

  // Handle preference changes
  const handlePreferenceChange = (key: keyof UserPreferences, value: BodyShape | FitPreference) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  };

  // Render a single input field with validation
  const renderMeasurementInput = (
    field: keyof UserMeasurements,
    label: string,
    placeholder: string,
    optional: boolean = false
  ) => {
    const error = getFieldError(field);
    const range = MEASUREMENT_RANGES[field];
    const hasWarning = error && !error.includes("phải là số dương");
    const hasError = error && error.includes("phải là số dương");
    const inputId = `${formId}-${field}`;
    const errorId = `${formId}-${field}-error`;
    const descId = `${formId}-${field}-desc`;

    return (
      <div>
        <div className="flex items-center gap-1 mb-1">
          <label 
            htmlFor={inputId}
            className="block text-xs text-gray-500 dark:text-gray-400"
          >
            {label} {optional && <span className="text-gray-400">- tùy chọn</span>}
          </label>
          {range && (
            <div className="group relative" role="tooltip">
              <Info 
                className="w-3 h-3 text-gray-400 cursor-help" 
                aria-label={`Thông tin về ${label}`}
              />
              <div 
                id={descId}
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none"
              >
                Khoảng hợp lệ: {range.min}-{range.max} {range.unit}
              </div>
            </div>
          )}
        </div>
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          min="1"
          step="0.1"
          value={measurements[field] ?? ""}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          aria-invalid={hasError || hasWarning ? "true" : undefined}
          aria-describedby={error ? errorId : range ? descId : undefined}
          aria-required={!optional}
          className={`w-full px-3 py-2 text-sm border rounded-lg 
                   bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                   focus:ring-2 focus:border-transparent transition-colors
                   ${hasError 
                     ? "border-red-500 focus:ring-red-500" 
                     : hasWarning 
                       ? "border-yellow-500 focus:ring-yellow-500" 
                       : "border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white"
                   }`}
        />
        {error && (
          <div 
            id={errorId}
            role="alert"
            className={`flex items-center gap-1 mt-1 text-xs ${hasError ? "text-red-500" : "text-yellow-600 dark:text-yellow-500"}`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  };

  // Render input fields based on product type
  const renderInputs = () => {
    switch (productType) {
      case "BRA":
        return (
          <>
            {renderMeasurementInput("bust", "Vòng ngực trên (cm)", "VD: 85")}
            {renderMeasurementInput("underBust", "Vòng ngực dưới (cm)", "VD: 73")}
          </>
        );
      case "PANTY":
        return (
          <>
            {renderMeasurementInput("hips", "Vòng mông (cm)", "VD: 92")}
            {renderMeasurementInput("waist", "Vòng eo (cm)", "VD: 68", true)}
          </>
        );
      case "SLEEPWEAR":
        return (
          <>
            {renderMeasurementInput("height", "Chiều cao (cm)", "VD: 160")}
            {renderMeasurementInput("weight", "Cân nặng (kg)", "VD: 52")}
            {renderMeasurementInput("bust", "Vòng ngực (cm)", "VD: 85", true)}
          </>
        );
      case "SHAPEWEAR":
        return (
          <>
            {renderMeasurementInput("waist", "Vòng eo (cm)", "VD: 68")}
            {renderMeasurementInput("hips", "Vòng mông (cm)", "VD: 92")}
          </>
        );
      case "SET":
      default:
        return (
          <>
            {renderMeasurementInput("bust", "Vòng ngực (cm)", "VD: 85")}
            {renderMeasurementInput("hips", "Vòng mông (cm)", "VD: 92")}
          </>
        );
    }
  };

  const hasRequiredInputs = () => {
    // Check for validation errors first
    if (hasValidationErrors()) return false;
    
    switch (productType) {
      case "BRA":
        return measurements.bust && measurements.bust > 0 && 
               measurements.underBust && measurements.underBust > 0;
      case "PANTY":
        return measurements.hips && measurements.hips > 0;
      case "SLEEPWEAR":
        return ((measurements.height && measurements.height > 0) && 
                (measurements.weight && measurements.weight > 0)) || 
               (measurements.bust && measurements.bust > 0);
      case "SHAPEWEAR":
        return measurements.waist && measurements.waist > 0;
      case "SET":
      default:
        return (measurements.bust && measurements.bust > 0) || 
               (measurements.hips && measurements.hips > 0);
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
    <div 
      className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800"
      role="region"
      aria-labelledby={`${formId}-title`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 dark:bg-purple-800/50 rounded-lg">
          <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h4 
            id={`${formId}-title`}
            className="font-medium text-gray-900 dark:text-white text-sm"
          >
            Gợi ý size cho bạn
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nhập số đo để được gợi ý size phù hợp
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">{renderInputs()}</div>

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-4 transition"
      >
        <RefreshCw className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        {showAdvanced ? "Ẩn tùy chọn nâng cao" : "Tùy chọn nâng cao (dáng người, kiểu ôm)"}
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-purple-200 dark:border-purple-700">
          {/* Fit Preference */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bạn thích đồ ôm như thế nào?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {FIT_PREFERENCES.map((fit) => (
                <button
                  key={fit.value}
                  type="button"
                  onClick={() => handlePreferenceChange("fitPreference", fit.value)}
                  className={`p-2 text-xs rounded-lg border transition-all ${
                    preferences.fitPreference === fit.value
                      ? "bg-purple-100 dark:bg-purple-900/50 border-purple-500 text-purple-700 dark:text-purple-300"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300"
                  }`}
                  title={fit.description}
                >
                  {fit.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body Shape */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Dáng người của bạn (tùy chọn)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BODY_SHAPES.map((shape) => (
                <button
                  key={shape.value}
                  type="button"
                  onClick={() => handlePreferenceChange("bodyShape", shape.value)}
                  className={`p-2 text-xs rounded-lg border transition-all text-left ${
                    preferences.bodyShape === shape.value
                      ? "bg-purple-100 dark:bg-purple-900/50 border-purple-500 text-purple-700 dark:text-purple-300"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-purple-300"
                  }`}
                  title={shape.description}
                >
                  <span className="font-medium">{shape.label}</span>
                  <span className="block text-[10px] opacity-75 mt-0.5">{shape.description}</span>
                </button>
              ))}
            </div>
            {preferences.bodyShape && (
              <button
                type="button"
                onClick={() => setPreferences((prev) => ({ ...prev, bodyShape: undefined }))}
                className="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Xóa lựa chọn
              </button>
            )}
          </div>
        </div>
      )}

      {/* Validation warnings summary */}
      {validationErrors.length > 0 && !hasValidationErrors() && (
        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div 
            role="alert"
            className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 text-xs"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Một số số đo nằm ngoài khoảng thông thường. Kết quả có thể không chính xác.</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCalculate}
          disabled={!hasRequiredInputs()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                   bg-black dark:bg-white text-white dark:text-black text-sm font-medium
                   rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition
                   disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby={result ? `${formId}-result` : undefined}
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
        <div 
          id={`${formId}-result`}
          role="status"
          aria-live="polite"
          className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {result.size}
            </span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
              result.confidence >= 85 
                ? "bg-green-100 dark:bg-green-900/30" 
                : result.confidence >= 70 
                  ? "bg-yellow-100 dark:bg-yellow-900/30"
                  : "bg-orange-100 dark:bg-orange-900/30"
            }`}>
              <span className={`text-xs font-medium ${
                result.confidence >= 85 
                  ? "text-green-700 dark:text-green-400" 
                  : result.confidence >= 70 
                    ? "text-yellow-700 dark:text-yellow-400"
                    : "text-orange-700 dark:text-orange-400"
              }`}>
                {result.confidence}% tin cậy
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{result.message}</p>

          {/* Alternative size suggestion */}
          {result.alternativeSize && (
            <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <span className="font-medium">💡 Gợi ý: </span>
                Size <span className="font-bold">{result.alternativeSize}</span>
                {result.alternativeMessage && ` - ${result.alternativeMessage}`}
              </p>
            </div>
          )}

          {/* Body shape adjustment note */}
          {result.adjustmentReason && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <Info className="w-3 h-3 inline mr-1" />
                {result.adjustmentReason}
              </p>
            </div>
          )}

          {/* Confidence progress bar */}
          <div className="mt-3">
            <span className="sr-only">Độ tin cậy: {result.confidence}%</span>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                role="progressbar"
                aria-valuenow={result.confidence}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Độ tin cậy ${result.confidence}%`}
                className={`h-full rounded-full transition-all duration-500 ${
                  result.confidence >= 85 
                    ? "bg-green-500" 
                    : result.confidence >= 70 
                      ? "bg-yellow-500"
                      : "bg-orange-500"
                }`}
                style={{ width: `${result.confidence}%` }}
              />
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

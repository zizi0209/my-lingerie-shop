"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Truck, X, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { userVoucherApi } from "@/lib/couponApi";

interface AvailableVoucher {
  id: number;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue?: number | null;
  eligible: boolean;
  amountNeeded: number;
}

interface VoucherSelectorProps {
  shippingFee: number;
  onDiscountChange?: (amount: number) => void;
  onShippingDiscountChange?: (amount: number) => void;
}

export default function VoucherSelector({ 
  shippingFee, 
  onDiscountChange,
  onShippingDiscountChange 
}: VoucherSelectorProps) {
  const { 
    cart, 
    subtotal,
    applyDiscountCoupon, 
    applyShippingCoupon,
    removeDiscountCoupon,
    removeShippingCoupon 
  } = useCart();
  
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"discount" | "shipping">("discount");
  const [discountVouchers, setDiscountVouchers] = useState<AvailableVoucher[]>([]);
  const [shippingVouchers, setShippingVouchers] = useState<AvailableVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState("");

  // Calculate discount amount
  const calculateDiscountAmount = useCallback((voucher: AvailableVoucher, amount: number): number => {
    if (voucher.discountType === "PERCENTAGE") {
      const discount = (amount * voucher.discountValue) / 100;
      return voucher.maxDiscount ? Math.min(discount, voucher.maxDiscount) : discount;
    }
    return Math.min(voucher.discountValue, amount);
  }, []);

  // Current applied vouchers from cart
  const appliedDiscountCoupon = cart?.discountCoupon;
  const appliedShippingCoupon = cart?.shippingCoupon;

  // Calculate current discount amounts
  const discountAmount = appliedDiscountCoupon 
    ? calculateDiscountAmount({
        ...appliedDiscountCoupon,
        eligible: true,
        amountNeeded: 0,
      }, subtotal)
    : 0;

  const shippingDiscountAmount = appliedShippingCoupon
    ? Math.min(
        appliedShippingCoupon.discountType === "FREE_SHIPPING" 
          ? shippingFee 
          : appliedShippingCoupon.discountValue,
        shippingFee
      )
    : 0;

  // Notify parent about changes
  useEffect(() => {
    onDiscountChange?.(discountAmount);
  }, [discountAmount, onDiscountChange]);

  useEffect(() => {
    onShippingDiscountChange?.(shippingDiscountAmount);
  }, [shippingDiscountAmount, onShippingDiscountChange]);

  // Fetch available vouchers
  const fetchVouchers = useCallback(async () => {
    if (!cart?.id) return;
    
    setLoading(true);
    try {
      const response = await userVoucherApi.getAvailableVouchers(cart.id);
      if (response.success) {
        setDiscountVouchers(response.data.discountVouchers);
        setShippingVouchers(response.data.shippingVouchers);
      }
    } catch (err) {
      console.error("Failed to fetch vouchers:", err);
    } finally {
      setLoading(false);
    }
  }, [cart?.id]);

  useEffect(() => {
    if (showModal) {
      fetchVouchers();
    }
  }, [showModal, fetchVouchers]);

  // Apply voucher
  const handleApply = async (code: string, type: "discount" | "shipping") => {
    setApplying(true);
    setError(null);
    
    try {
      const result = type === "discount" 
        ? await applyDiscountCoupon(code)
        : await applyShippingCoupon(code);
      
      if (result.success) {
        setInputCode("");
        setShowModal(false);
      } else {
        setError(result.error || "Không thể áp dụng mã");
      }
    } finally {
      setApplying(false);
    }
  };

  // Remove voucher
  const handleRemove = async (type: "discount" | "shipping") => {
    if (type === "discount") {
      await removeDiscountCoupon();
    } else {
      await removeShippingCoupon();
    }
  };

  // Format voucher description
  const formatVoucherDesc = (v: AvailableVoucher) => {
    if (v.discountType === "PERCENTAGE") {
      return `Giảm ${v.discountValue}%${v.maxDiscount ? ` (tối đa ${v.maxDiscount.toLocaleString("vi-VN")}đ)` : ""}`;
    }
    if (v.discountType === "FREE_SHIPPING") {
      return "Miễn phí vận chuyển";
    }
    return `Giảm ${v.discountValue.toLocaleString("vi-VN")}đ`;
  };

  return (
    <div className="space-y-3">
      {/* Shop Voucher Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Tag className="w-4 h-4 text-rose-500" />
            Shop Voucher
          </div>
          {appliedDiscountCoupon ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                -{discountAmount.toLocaleString("vi-VN")}đ
              </span>
              <button
                onClick={() => handleRemove("discount")}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setActiveTab("discount"); setShowModal(true); }}
              className="text-sm text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              Chọn mã <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {appliedDiscountCoupon && (
          <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
            <code className="font-mono text-rose-600 dark:text-rose-400">{appliedDiscountCoupon.code}</code>
            <span className="mx-2">-</span>
            {appliedDiscountCoupon.name}
          </div>
        )}
      </div>

      {/* Shipping Voucher Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Truck className="w-4 h-4 text-blue-500" />
            Shipping Voucher
          </div>
          {appliedShippingCoupon ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                -{shippingDiscountAmount.toLocaleString("vi-VN")}đ
              </span>
              <button
                onClick={() => handleRemove("shipping")}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setActiveTab("shipping"); setShowModal(true); }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Chọn mã <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {appliedShippingCoupon && (
          <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
            <code className="font-mono text-blue-600 dark:text-blue-400">{appliedShippingCoupon.code}</code>
            <span className="mx-2">-</span>
            {appliedShippingCoupon.name}
          </div>
        )}
      </div>

      {/* Voucher Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Chọn Voucher
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Code */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã voucher..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono"
                />
                <button
                  onClick={() => handleApply(inputCode, activeTab)}
                  disabled={!inputCode.trim() || applying}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áp dụng"}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab("discount")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeTab === "discount"
                    ? "text-rose-600 dark:text-rose-400 border-b-2 border-rose-600 dark:border-rose-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Tag className="w-4 h-4 inline-block mr-1" />
                Shop ({discountVouchers.length})
              </button>
              <button
                onClick={() => setActiveTab("shipping")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                  activeTab === "shipping"
                    ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Truck className="w-4 h-4 inline-block mr-1" />
                Ship ({shippingVouchers.length})
              </button>
            </div>

            {/* Voucher List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(activeTab === "discount" ? discountVouchers : shippingVouchers).map((v) => {
                    const isApplied = activeTab === "discount"
                      ? appliedDiscountCoupon?.code === v.code
                      : appliedShippingCoupon?.code === v.code;
                    
                    return (
                      <button
                        key={v.id}
                        onClick={() => v.eligible && !isApplied && handleApply(v.code, activeTab)}
                        disabled={!v.eligible || isApplied || applying}
                        className={`w-full text-left p-3 rounded-lg border transition ${
                          isApplied
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : v.eligible
                            ? "border-gray-200 dark:border-gray-600 hover:border-rose-400 dark:hover:border-rose-500"
                            : "border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className={`font-medium text-sm ${
                              isApplied ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-white"
                            }`}>
                              {v.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatVoucherDesc(v)}
                            </p>
                            {v.minOrderValue && v.minOrderValue > 0 && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Đơn tối thiểu: {v.minOrderValue.toLocaleString("vi-VN")}đ
                              </p>
                            )}
                            {!v.eligible && v.amountNeeded > 0 && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Mua thêm {v.amountNeeded.toLocaleString("vi-VN")}đ để sử dụng
                              </p>
                            )}
                          </div>
                          <code className={`shrink-0 px-2 py-1 rounded text-xs font-mono ${
                            isApplied
                              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          }`}>
                            {v.code}
                          </code>
                        </div>
                        {isApplied && (
                          <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            ✓ Đã áp dụng
                          </div>
                        )}
                      </button>
                    );
                  })}
                  
                  {(activeTab === "discount" ? discountVouchers : shippingVouchers).length === 0 && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                      Không có mã khả dụng
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

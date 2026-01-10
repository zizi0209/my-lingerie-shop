"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ShoppingBag, Loader2, Trash2, Edit2, Check } from "lucide-react";
import { useCart, CartItem } from "@/context/CartContext";
import { userVoucherApi } from "@/lib/couponApi";

interface ProductVariant {
  id: number;
  size: string;
  colorName: string;
  colorCode: string | null;
  stock: number;
  price: number | null;
  salePrice: number | null;
}

interface AppliedVoucher {
  code: string;
  name: string;
  discountAmount: number;
}

export default function CartPage() {
  const { cart, loading, error, itemCount, subtotal, updateQuantity, updateVariant, removeItem, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [productVariants, setProductVariants] = useState<Record<number, ProductVariant[]>>({});
  const [loadingVariants, setLoadingVariants] = useState<Set<number>>(new Set());

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const fetchVariants = useCallback(async (productId: number) => {
    if (productVariants[productId]) return;
    
    setLoadingVariants(prev => new Set(prev).add(productId));
    try {
      const res = await fetch(`${baseUrl}/products/${productId}/variants`);
      const data = await res.json();
      if (data.success) {
        setProductVariants(prev => ({ ...prev, [productId]: data.data }));
      }
    } catch (err) {
      console.error("Fetch variants error:", err);
    } finally {
      setLoadingVariants(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  }, [baseUrl, productVariants]);

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdatingItems(prev => new Set(prev).add(itemId));
    await updateQuantity(itemId, newQuantity);
    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleRemoveItem = async (itemId: number) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));
    await removeItem(itemId);
    setUpdatingItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const discount = appliedVoucher?.discountAmount || 0;
  const shipping = subtotal >= 1000000 ? 0 : 30000;
  const total = subtotal - discount + shipping;

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return;
    
    setVoucherLoading(true);
    setVoucherError(null);
    
    try {
      const response = await userVoucherApi.validateVoucher(promoCode.trim().toUpperCase(), subtotal);
      if (response.success) {
        setAppliedVoucher({
          code: response.data.coupon.code,
          name: response.data.coupon.name,
          discountAmount: response.data.discountAmount,
        });
        setPromoCode("");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mã giảm giá không hợp lệ";
      setVoucherError(message);
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <Link href="/san-pham" className="text-black dark:text-white underline">
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4 md:mb-6 transition-colors">
            <ShoppingBag className="w-8 h-8 md:w-10 md:h-10 text-gray-400 dark:text-gray-500" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-light mb-3 md:mb-4 text-gray-900 dark:text-white">
            Giỏ hàng trống
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-6 md:mb-8">
            Hãy khám phá bộ sưu tập của chúng tôi và thêm những sản phẩm yêu thích
          </p>
          <Link
            href="/san-pham"
            className="inline-flex items-center justify-center bg-black dark:bg-white text-white dark:text-black px-6 py-3 md:px-8 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition min-h-[44px]"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-light text-gray-900 dark:text-white">
          Giỏ hàng ({itemCount} sản phẩm)
        </h1>
        {cart.items.length > 0 && (
          <button
            onClick={clearCart}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition"
          >
            <Trash2 className="w-4 h-4" />
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
            const originalPrice = item.variant?.price || item.product.price;
            const hasDiscount = price < originalPrice;
            const isUpdating = updatingItems.has(item.id);
            const stock = item.variant?.stock || 99;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg border border-gray-200 dark:border-gray-700 transition-opacity ${
                  isUpdating ? "opacity-60" : ""
                }`}
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <Link
                    href={`/san-pham/${item.product.slug}`}
                    className="relative w-20 h-28 md:w-24 md:h-32 bg-gray-50 dark:bg-gray-700 rounded overflow-hidden shrink-0"
                  >
                    <Image
                      src={item.product.images[0]?.url || "https://via.placeholder.com/200x300"}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 mb-2">
                      <Link href={`/san-pham/${item.product.slug}`}>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-300 transition line-clamp-2">
                          {item.product.name}
                        </h3>
                      </Link>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isUpdating}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition p-1 shrink-0 disabled:opacity-50"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {item.variant && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {editingItem === item.id ? (
                          <VariantSelector
                            item={item}
                            variants={productVariants[item.productId] || []}
                            loading={loadingVariants.has(item.productId)}
                            onSelect={async (variantId) => {
                              setUpdatingItems(prev => new Set(prev).add(item.id));
                              await updateVariant(item.id, variantId);
                              setUpdatingItems(prev => {
                                const next = new Set(prev);
                                next.delete(item.id);
                                return next;
                              });
                              setEditingItem(null);
                            }}
                            onCancel={() => setEditingItem(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="space-y-0.5">
                              {item.variant.size && <p>Kích cỡ: {item.variant.size}</p>}
                              {item.variant.colorName && <p>Màu sắc: {item.variant.colorName}</p>}
                            </div>
                            <button
                              onClick={() => {
                                setEditingItem(item.id);
                                fetchVariants(item.productId);
                              }}
                              className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition"
                              title="Đổi phân loại"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isUpdating}
                          className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                        <span className="px-3 md:px-4 py-2 min-w-[2.5rem] text-center text-sm md:text-base text-gray-900 dark:text-white">
                          {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= stock || isUpdating}
                          className="p-2 md:p-3 hover:bg-gray-100 dark:hover:bg-gray-600 transition text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3 md:w-4 md:h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        {hasDiscount && (
                          <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 line-through">
                            {(originalPrice * item.quantity).toLocaleString("vi-VN")}₫
                          </p>
                        )}
                        <p className="text-base md:text-lg font-light text-gray-900 dark:text-white">
                          {(price * item.quantity).toLocaleString("vi-VN")}₫
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Continue Shopping */}
          <Link
            href="/san-pham"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition"
          >
            <span className="rotate-180">→</span>
            Tiếp tục mua sắm
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg sticky top-8 transition-colors">
            <h2 className="text-lg font-medium mb-6 text-gray-900 dark:text-white">Tóm tắt đơn hàng</h2>

            {/* Promo Code */}
            <div className="mb-6">
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Mã giảm giá</label>
              {appliedVoucher ? (
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">{appliedVoucher.code}</p>
                    <p className="text-sm text-green-600 dark:text-green-500">{appliedVoucher.name}</p>
                  </div>
                  <button
                    onClick={removeVoucher}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value);
                        setVoucherError(null);
                      }}
                      placeholder="Nhập mã giảm giá"
                      disabled={voucherLoading}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
                    />
                    <button
                      onClick={applyPromoCode}
                      disabled={voucherLoading || !promoCode}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:border-black dark:hover:border-white transition disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {voucherLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Áp dụng"}
                    </button>
                  </div>
                  {voucherError && (
                    <p className="text-sm text-red-500 mt-2">{voucherError}</p>
                  )}
                </>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString("vi-VN")}₫</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Giảm giá</span>
                  <span>-{discount.toLocaleString("vi-VN")}₫</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Phí vận chuyển</span>
                <span>{shipping === 0 ? "Miễn phí" : `${shipping.toLocaleString("vi-VN")}₫`}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Miễn phí vận chuyển cho đơn hàng từ 1.000.000₫
                </p>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between text-lg font-medium mb-8 text-gray-900 dark:text-white">
              <span>Tổng cộng</span>
              <span>{total.toLocaleString("vi-VN")}₫</span>
            </div>

            {/* Checkout Button */}
            <Link
              href="/check-out"
              className="block w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition text-center font-medium"
            >
              Tiến hành thanh toán
            </Link>

            {/* Security Note */}
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-4 flex items-center justify-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              Thanh toán an toàn và bảo mật
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Variant Selector Component
function VariantSelector({
  item,
  variants,
  loading,
  onSelect,
  onCancel,
}: {
  item: CartItem;
  variants: ProductVariant[];
  loading: boolean;
  onSelect: (variantId: number) => void;
  onCancel: () => void;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(item.variantId);

  // Get unique sizes and colors
  const sizes = [...new Set(variants.map(v => v.size))];
  const colors = [...new Set(variants.map(v => v.colorName))];
  
  const currentVariant = variants.find(v => v.id === selectedVariantId);
  const selectedSize = currentVariant?.size || item.variant?.size;
  const selectedColor = currentVariant?.colorName || item.variant?.colorName;

  const handleSizeChange = (size: string) => {
    const variant = variants.find(v => v.size === size && v.colorName === selectedColor);
    if (variant) setSelectedVariantId(variant.id);
  };

  const handleColorChange = (color: string) => {
    const variant = variants.find(v => v.colorName === color && v.size === selectedSize);
    if (variant) setSelectedVariantId(variant.id);
  };

  const getVariantStock = (size: string, color: string) => {
    const variant = variants.find(v => v.size === size && v.colorName === color);
    return variant?.stock || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Đang tải...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      {/* Size Selector */}
      {sizes.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Kích cỡ:</p>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map(size => {
              const stock = getVariantStock(size, selectedColor || "");
              const isSelected = size === selectedSize;
              const isDisabled = stock === 0;

              return (
                <button
                  key={size}
                  onClick={() => handleSizeChange(size)}
                  disabled={isDisabled}
                  className={`px-2.5 py-1 text-xs border rounded transition ${
                    isSelected
                      ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                      : isDisabled
                        ? "border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "border-gray-300 dark:border-gray-500 hover:border-black dark:hover:border-white"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Selector */}
      {colors.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Màu sắc:</p>
          <div className="flex flex-wrap gap-1.5">
            {colors.map(color => {
              const stock = getVariantStock(selectedSize || "", color);
              const isSelected = color === selectedColor;
              const isDisabled = stock === 0;
              const variant = variants.find(v => v.colorName === color);

              return (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  disabled={isDisabled}
                  className={`px-2.5 py-1 text-xs border rounded transition flex items-center gap-1.5 ${
                    isSelected
                      ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                      : isDisabled
                        ? "border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "border-gray-300 dark:border-gray-500 hover:border-black dark:hover:border-white"
                  }`}
                >
                  {variant?.colorCode && (
                    <span
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: variant.colorCode }}
                    />
                  )}
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => selectedVariantId && onSelect(selectedVariantId)}
          disabled={!selectedVariantId || selectedVariantId === item.variantId}
          className="px-3 py-1.5 text-xs bg-black dark:bg-white text-white dark:text-black rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          Xác nhận
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-500 rounded hover:border-gray-400 dark:hover:border-gray-400 transition"
        >
          Hủy
        </button>
      </div>
    </div>
  );
}

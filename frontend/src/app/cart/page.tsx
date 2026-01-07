"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ShoppingBag, Loader2, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { cart, loading, error, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

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

  const discount = isPromoApplied ? subtotal * 0.1 : 0;
  const shipping = subtotal >= 1000000 ? 0 : 30000;
  const total = subtotal - discount + shipping;

  const applyPromoCode = () => {
    if (promoCode.toLowerCase() === "lingerie10") {
      setIsPromoApplied(true);
    } else {
      alert("Mã giảm giá không hợp lệ");
    }
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
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5 mb-3">
                        {item.variant.size && <p>Kích cỡ: {item.variant.size}</p>}
                        {item.variant.colorName && <p>Màu sắc: {item.variant.colorName}</p>}
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Nhập mã giảm giá"
                  disabled={isPromoApplied}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700"
                />
                <button
                  onClick={applyPromoCode}
                  disabled={isPromoApplied || !promoCode}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:border-black dark:hover:border-white transition disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  Áp dụng
                </button>
              </div>
              {isPromoApplied && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2">Mã giảm giá đã được áp dụng!</p>
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

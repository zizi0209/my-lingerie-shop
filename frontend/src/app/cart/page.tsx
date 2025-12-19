"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";

// Mock cart data
const initialCartItems = [
  {
    id: "1",
    name: "Áo lót ren đen quyến rũ",
    price: 890000,
    originalPrice: 1290000,
    image: "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop",
    size: "75B",
    color: "Đen",
    quantity: 1,
    stock: 15
  },
  {
    id: "2",
    name: "Quần lót ren matching",
    price: 450000,
    image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop",
    size: "M",
    color: "Đen",
    quantity: 2,
    stock: 20
  },
];

export default function CartPage() {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [promoCode, setPromoCode] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    const item = cartItems.find(item => item.id === id);
    if (!item || newQuantity > item.stock) return;

    setCartItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = isPromoApplied ? subtotal * 0.1 : 0; // 10% discount for demo
  const shipping = subtotal >= 1000000 ? 0 : 30000;
  const total = subtotal - discount + shipping;

  const applyPromoCode = () => {
    if (promoCode.toLowerCase() === "lingerie10") {
      setIsPromoApplied(true);
    } else {
      alert("Mã giảm giá không hợp lệ");
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
            <ShoppingBag className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-serif font-light mb-4">Giỏ hàng trống</h1>
          <p className="text-gray-600 mb-8">
            Hãy khám phá bộ sưu tập của chúng tôi và thêm những sản phẩm yêu thích
          </p>
          <Link
            href="/san-pham"
            className="inline-block bg-black text-white px-8 py-3 rounded-lg hover:bg-gray-900 transition"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-serif font-light mb-8">Giỏ hàng ({cartItems.length} sản phẩm)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex gap-4">
                {/* Product Image */}
                <div className="relative w-24 h-32 bg-gray-50 rounded overflow-hidden shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <Link href={`/san-pham/${item.id}`}>
                      <h3 className="font-medium text-gray-900 hover:text-rose-600 transition">
                        {item.name}
                      </h3>
                    </Link>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-black transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>Kích cỡ: {item.size}</p>
                    <p>Màu sắc: {item.color}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Selector */}
                    <div className="flex items-center border border-gray-300 rounded">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-gray-100 transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 min-w-15 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-gray-100 transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      {item.originalPrice && (
                        <p className="text-sm text-gray-400 line-through">
                          {(item.originalPrice * item.quantity).toLocaleString('vi-VN')}₫
                        </p>
                      )}
                      <p className="text-lg font-light">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Continue Shopping */}
          <Link
            href="/san-pham"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition"
          >
            <span className="rotate-180">→</span>
            Tiếp tục mua sắm
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-6 rounded-lg sticky top-8">
            <h2 className="text-lg font-medium mb-6">Tóm tắt đơn hàng</h2>

            {/* Promo Code */}
            <div className="mb-6">
              <label className="text-sm text-gray-600 mb-2 block">Mã giảm giá</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Nhập mã giảm giá"
                  disabled={isPromoApplied}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black bg-white disabled:bg-gray-100"
                />
                <button
                  onClick={applyPromoCode}
                  disabled={isPromoApplied || !promoCode}
                  className="px-4 py-2 border border-gray-300 rounded hover:border-black transition disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                >
                  Áp dụng
                </button>
              </div>
              {isPromoApplied && (
                <p className="text-sm text-green-600 mt-2">Mã giảm giá đã được áp dụng!</p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Giảm giá</span>
                  <span>-{discount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')}₫`}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-gray-500">
                  Miễn phí vận chuyển cho đơn hàng từ 1.000.000₫
                </p>
              )}
            </div>

            {/* Total */}
            <div className="flex justify-between text-lg font-light mb-8">
              <span>Tổng cộng</span>
              <span>{total.toLocaleString('vi-VN')}₫</span>
            </div>

            {/* Checkout Button */}
            <Link
              href="/check-out"
              className="ck-button block w-full bg-black text-white py-4 rounded-lg hover:bg-gray-900 transition text-center"
            >
              Tiến hành thanh toán
            </Link>

            {/* Security Note */}
            <p className="text-xs text-gray-500 text-center mt-4">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
              Thanh toán an toàn và bảo mật
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
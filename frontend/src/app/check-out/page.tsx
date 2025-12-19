"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X, Truck, Shield, CreditCard, ShoppingBag } from "lucide-react";

// Mock data - sẽ lấy từ cart sau
const cartItems = [
  {
    id: "1",
    name: "Áo lót ren đen quyến rũ",
    price: 890000,
    originalPrice: 1290000,
    image: "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop",
    size: "75B",
    color: "Đen",
    quantity: 1
  },
  {
    id: "2",
    name: "Quần lót ren matching",
    price: 450000,
    image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop",
    size: "M",
    color: "Đen",
    quantity: 2
  }
];

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [formData, setFormData] = useState({
    // Thông tin cá nhân
    firstName: "",
    lastName: "",
    email: "",
    phone: "",

    // Địa chỉ giao hàng
    address: "",
    city: "",
    district: "",
    ward: "",
    postalCode: "",

    // Ghi chú
    notes: "",

    // Lưu thông tin
    saveInfo: false
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = 0; // Có thể thêm logic discount code
  const shipping = shippingMethod === "express" ? 50000 : (subtotal >= 1000000 ? 0 : 30000);
  const total = subtotal - discount + shipping;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle submit logic here
    console.log("Checkout data:", { ...formData, paymentMethod, shippingMethod, cartItems });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-gray-500">
        <Link href="/" className="hover:text-black">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/cart" className="hover:text-black">Giỏ hàng</Link>
        <span className="mx-2">/</span>
        <span className="text-black">Thanh toán</span>
      </nav>

      <h1 className="text-3xl font-serif font-light mb-8">Thanh toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Thông tin cá nhân */}
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Thông tin cá nhân
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Họ *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Tên *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Điện thoại *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </section>

            {/* 2. Địa chỉ giao hàng */}
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Địa chỉ giao hàng
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Địa chỉ *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    placeholder="Số nhà, tên đường"
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Tỉnh/Thành phố *</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black bg-white"
                    >
                      <option value="">Chọn tỉnh/thành phố</option>
                      <option value="hanoi">Hà Nội</option>
                      <option value="hcmc">TP. Hồ Chí Minh</option>
                      <option value="danang">Đà Nẵng</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quận/Huyện *</label>
                    <select
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black bg-white"
                    >
                      <option value="">Chọn quận/huyện</option>
                      <option value="1">Quận 1</option>
                      <option value="2">Quận 2</option>
                      <option value="3">Quận 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phường/Xã *</label>
                    <select
                      name="ward"
                      value={formData.ward}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black bg-white"
                    >
                      <option value="">Chọn phường/xã</option>
                      <option value="1">Phường 1</option>
                      <option value="2">Phường 2</option>
                      <option value="3">Phường 3</option>
                    </select>
                  </div>
                </div>

                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium mb-2">Mã bưu chính</label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                  />
                </div>
              </div>
            </section>

            {/* 3. Phương thức vận chuyển */}
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-medium mb-6">Phương thức vận chuyển</h2>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 border border-gray-200 rounded cursor-pointer hover:border-black transition">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="standard"
                      checked={shippingMethod === "standard"}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Giao hàng tiêu chuẩn</p>
                      <p className="text-sm text-gray-500">Nhận hàng trong 3-5 ngày làm việc</p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')}₫`}
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 border border-gray-200 rounded cursor-pointer hover:border-black transition">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="express"
                      checked={shippingMethod === "express"}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium">Giao hàng nhanh</p>
                      <p className="text-sm text-gray-500">Nhận hàng trong 1-2 ngày làm việc</p>
                    </div>
                  </div>
                  <span className="font-medium">50.000₫</span>
                </label>
              </div>
            </section>

            {/* 4. Phương thức thanh toán */}
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Phương thức thanh toán
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded cursor-pointer hover:border-black transition">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">Thanh toán khi nhận hàng (COD)</p>
                    <p className="text-sm text-gray-500">Thanh toán bằng tiền mặt khi nhận hàng</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded cursor-pointer hover:border-black transition">
                  <input
                    type="radio"
                    name="payment"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">Chuyển khoản ngân hàng</p>
                    <p className="text-sm text-gray-500">Chuyển khoản qua internet banking</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded cursor-pointer hover:border-black transition">
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === "card"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4"
                  />
                  <div>
                    <p className="font-medium">Thẻ tín dụng/Ghi nợ</p>
                    <p className="text-sm text-gray-500">Visa, Mastercard, JCB</p>
                  </div>
                </label>
              </div>
            </section>

            {/* 5. Ghi chú */}
            <section className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-medium mb-4">Ghi chú đơn hàng</h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Ghi chú về đơn hàng (ví dụ: thời gian giao hàng mong muốn)"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black resize-none"
              />
            </section>

            {/* Checkbox lưu thông tin */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="saveInfo"
                checked={formData.saveInfo}
                onChange={handleInputChange}
                className="w-4 h-4"
              />
              <span className="text-sm">Lưu thông tin cho lần mua hàng tiếp theo</span>
            </label>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 p-6 rounded-lg sticky top-8">
            <h2 className="text-lg font-medium mb-6">Tóm tắt đơn hàng</h2>

            {/* Cart Items */}
            <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-16 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500">
                      Size: {item.size} | Màu: {item.color}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">x{item.quantity}</span>
                      <span className="text-sm font-medium">
                        {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Giảm giá</span>
                  <span>-{discount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')}₫`}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-lg font-light">
                  <span>Tổng cộng</span>
                  <span>{total.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-green-50 rounded-lg">
              <Shield className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700">
                Thông tin của bạn được bảo mật an toàn
              </p>
            </div>

            {/* Place Order Button */}
            <button
              type="submit"
              onClick={handleSubmit}
              className="ck-button w-full bg-black text-white py-4 rounded-lg hover:bg-gray-900 transition font-medium"
            >
              Đặt hàng
            </button>

            {/* Terms Note */}
            <p className="text-xs text-gray-500 text-center mt-4">
              Bằng cách đặt hàng, bạn đồng ý với{' '}
              <Link href="/dieu-khoan" className="underline hover:text-black">
                điều khoản và điều kiện
              </Link>{' '}
              của chúng tôi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
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
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    ward: "",
    postalCode: "",
    notes: "",
    saveInfo: false
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = 0;
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
    console.log("Checkout data:", { ...formData, paymentMethod, shippingMethod, cartItems });
  };

  const inputClassName = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClassName = "block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300";
  const sectionClassName = "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700";
  const radioLabelClassName = "flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:border-black dark:hover:border-white transition bg-white dark:bg-gray-800";

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-black dark:hover:text-white">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/cart" className="hover:text-black dark:hover:text-white">Giỏ hàng</Link>
        <span className="mx-2">/</span>
        <span className="text-black dark:text-white">Thanh toán</span>
      </nav>

      <h1 className="text-3xl font-serif font-light mb-8 text-black dark:text-white">Thanh toán</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Thông tin cá nhân */}
            <section className={sectionClassName}>
              <h2 className="text-xl font-medium mb-6 flex items-center gap-2 text-black dark:text-white">
                <ShoppingBag className="w-5 h-5" />
                Thông tin cá nhân
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClassName}>Họ *</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className={inputClassName} />
                </div>
                <div>
                  <label className={labelClassName}>Tên *</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className={inputClassName} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelClassName}>Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className={inputClassName} />
                </div>
                <div>
                  <label className={labelClassName}>Điện thoại *</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className={inputClassName} />
                </div>
              </div>
            </section>

            {/* Địa chỉ giao hàng */}
            <section className={sectionClassName}>
              <h2 className="text-xl font-medium mb-6 flex items-center gap-2 text-black dark:text-white">
                <Truck className="w-5 h-5" />
                Địa chỉ giao hàng
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClassName}>Địa chỉ *</label>
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} required placeholder="Số nhà, tên đường" className={inputClassName} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClassName}>Tỉnh/Thành phố *</label>
                    <select name="city" value={formData.city} onChange={handleInputChange} required className={inputClassName}>
                      <option value="">Chọn tỉnh/thành phố</option>
                      <option value="hanoi">Hà Nội</option>
                      <option value="hcmc">TP. Hồ Chí Minh</option>
                      <option value="danang">Đà Nẵng</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>Quận/Huyện *</label>
                    <select name="district" value={formData.district} onChange={handleInputChange} required className={inputClassName}>
                      <option value="">Chọn quận/huyện</option>
                      <option value="1">Quận 1</option>
                      <option value="2">Quận 2</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>Phường/Xã *</label>
                    <select name="ward" value={formData.ward} onChange={handleInputChange} required className={inputClassName}>
                      <option value="">Chọn phường/xã</option>
                      <option value="1">Phường 1</option>
                      <option value="2">Phường 2</option>
                    </select>
                  </div>
                </div>
                <div className="w-full md:w-1/3">
                  <label className={labelClassName}>Mã bưu chính</label>
                  <input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className={inputClassName} />
                </div>
              </div>
            </section>

            {/* Phương thức vận chuyển */}
            <section className={sectionClassName}>
              <h2 className="text-xl font-medium mb-6 text-black dark:text-white">Phương thức vận chuyển</h2>
              <div className="space-y-3">
                <label className={radioLabelClassName}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" value="standard" checked={shippingMethod === "standard"} onChange={(e) => setShippingMethod(e.target.value)} className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-black dark:text-white">Giao hàng tiêu chuẩn</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nhận hàng trong 3-5 ngày làm việc</p>
                    </div>
                  </div>
                  <span className="font-medium text-black dark:text-white">{shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')}₫`}</span>
                </label>
                <label className={radioLabelClassName}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" value="express" checked={shippingMethod === "express"} onChange={(e) => setShippingMethod(e.target.value)} className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-black dark:text-white">Giao hàng nhanh</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nhận hàng trong 1-2 ngày làm việc</p>
                    </div>
                  </div>
                  <span className="font-medium text-black dark:text-white">50.000₫</span>
                </label>
              </div>
            </section>

            {/* Phương thức thanh toán */}
            <section className={sectionClassName}>
              <h2 className="text-xl font-medium mb-6 flex items-center gap-2 text-black dark:text-white">
                <CreditCard className="w-5 h-5" />
                Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                {['cod', 'transfer', 'card'].map((method) => (
                  <label key={method} className={radioLabelClassName}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4" />
                      <div>
                        <p className="font-medium text-black dark:text-white">
                          {method === 'cod' && 'Thanh toán khi nhận hàng (COD)'}
                          {method === 'transfer' && 'Chuyển khoản ngân hàng'}
                          {method === 'card' && 'Thẻ tín dụng/Ghi nợ'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {method === 'cod' && 'Thanh toán bằng tiền mặt khi nhận hàng'}
                          {method === 'transfer' && 'Chuyển khoản qua internet banking'}
                          {method === 'card' && 'Visa, Mastercard, JCB'}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Ghi chú */}
            <section className={sectionClassName}>
              <h2 className="text-xl font-medium mb-4 text-black dark:text-white">Ghi chú đơn hàng</h2>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} placeholder="Ghi chú về đơn hàng" className={`${inputClassName} resize-none`} />
            </section>

            <label className="flex items-center gap-3">
              <input type="checkbox" name="saveInfo" checked={formData.saveInfo} onChange={handleInputChange} className="w-4 h-4" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Lưu thông tin cho lần mua hàng tiếp theo</span>
            </label>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 sticky top-8">
            <h2 className="text-lg font-medium mb-6 text-black dark:text-white">Tóm tắt đơn hàng</h2>
            <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shrink-0">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate text-black dark:text-white">{item.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Size: {item.size} | Màu: {item.color}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">x{item.quantity}</span>
                      <span className="text-sm font-medium text-black dark:text-white">{(item.price * item.quantity).toLocaleString('vi-VN')}₫</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Phí vận chuyển</span>
                <span>{shipping === 0 ? 'Miễn phí' : `${shipping.toLocaleString('vi-VN')}₫`}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-lg font-light text-black dark:text-white">
                  <span>Tổng cộng</span>
                  <span>{total.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
              <p className="text-xs text-green-700 dark:text-green-300">Thông tin của bạn được bảo mật an toàn</p>
            </div>
            <button type="submit" onClick={handleSubmit} className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition font-medium">
              Đặt hàng
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Bằng cách đặt hàng, bạn đồng ý với{' '}
              <Link href="/dieu-khoan" className="underline hover:text-black dark:hover:text-white">điều khoản và điều kiện</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

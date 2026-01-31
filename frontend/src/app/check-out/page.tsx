"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Truck, Shield, CreditCard, ShoppingBag, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { userVoucherApi } from "@/lib/couponApi";
import VoucherSelector from "@/components/checkout/VoucherSelector";

export default function CheckoutPage() {
  const { cart, loading: cartLoading, subtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [shippingMethod, setShippingMethod] = useState("standard");
  
  // Voucher stacking states
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingDiscountAmount, setShippingDiscountAmount] = useState(0);
  
  // Points preview
  const [pointsPreview, setPointsPreview] = useState<{
    pointsToEarn: number;
    tier: string | null;
    isBirthdayMonth: boolean;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    ward: "",
    notes: "",
  });

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  // Pre-fill user info if logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      }));
    }
  }, [isAuthenticated, user]);

  const shippingFee = shippingMethod === "express" ? 50000 : (subtotal >= 1000000 ? 0 : 30000);
  const finalShipping = Math.max(0, shippingFee - shippingDiscountAmount);
  const total = subtotal - discountAmount + finalShipping;

  // Fetch points preview
  const fetchPointsPreview = useCallback(async () => {
    if (total <= 0) return;
    try {
      const response = await userVoucherApi.calculatePoints(total);
      if (response.success) {
        setPointsPreview(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch points preview:", err);
    }
  }, [total]);

  useEffect(() => {
    fetchPointsPreview();
  }, [fetchPointsPreview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError("Vui lòng nhập họ tên");
      return false;
    }
    if (!formData.phone.trim()) {
      setError("Vui lòng nhập số điện thoại");
      return false;
    }
    if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ""))) {
      setError("Số điện thoại không hợp lệ");
      return false;
    }
    if (!formData.address.trim()) {
      setError("Vui lòng nhập địa chỉ");
      return false;
    }
    if (!formData.city) {
      setError("Vui lòng chọn tỉnh/thành phố");
      return false;
    }
    if (!formData.district) {
      setError("Vui lòng chọn quận/huyện");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cart || cart.items.length === 0) {
      setError("Giỏ hàng trống");
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Build full address
      const fullAddress = `${formData.address}, ${formData.ward ? formData.ward + ", " : ""}${formData.district}, ${formData.city}`;
      
      // Build guest info for non-logged-in users
      const guestInfo = !isAuthenticated ? {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      } : null;

      // Prepare order items
      const items = cart.items.map(item => {
        const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: price,
          variant: item.variant ? `${item.variant.colorName} - ${item.variant.size}` : null,
        };
      });

      const orderData = {
        userId: isAuthenticated && user ? user.id : null,
        guestInfo,
        shippingAddress: fullAddress,
        shippingCity: formData.city,
        shippingPhone: formData.phone,
        shippingMethod: shippingMethod === "express" ? "EXPRESS" : "STANDARD",
        paymentMethod: paymentMethod.toUpperCase(),
        totalAmount: total,
        shippingFee: finalShipping,
        discount: discountAmount,
        notes: formData.notes || null,
        items,
        // Voucher stacking info
        discountCouponCode: cart.discountCoupon?.code || null,
        discountCouponAmount: discountAmount,
        shippingCouponCode: cart.shippingCoupon?.code || null,
        shippingCouponAmount: shippingDiscountAmount,
      };

      const res = await fetch(`${baseUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tạo đơn hàng");
      }

      // Clear cart after successful order
      await clearCart();
      
      setOrderNumber(data.data.orderNumber);
      setOrderSuccess(true);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (orderSuccess) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-light mb-4 text-gray-900 dark:text-white">
            Đặt hàng thành công!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Cảm ơn bạn đã đặt hàng. Mã đơn hàng của bạn là:
          </p>
          <p className="text-xl font-medium text-primary-600 dark:text-primary-400 mb-6">
            {orderNumber}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Chúng tôi sẽ liên hệ với bạn qua số điện thoại để xác nhận đơn hàng.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/order?code=${orderNumber}`}
              className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition"
            >
              Theo dõi đơn hàng
            </Link>
            <Link
              href="/san-pham"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-black dark:hover:border-white transition text-gray-900 dark:text-white"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading cart
  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Empty cart
  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center max-w-md mx-auto">
          <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-light mb-4 text-gray-900 dark:text-white">
            Giỏ hàng trống
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán
          </p>
          <Link
            href="/san-pham"
            className="inline-flex px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  const inputClassName = "w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-700 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClassName = "block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300";
  const sectionClassName = "bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700";

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-8 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/" className="hover:text-black dark:hover:text-white transition">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link href="/cart" className="hover:text-black dark:hover:text-white transition">Giỏ hàng</Link>
        <span className="mx-2">/</span>
        <span className="text-black dark:text-white">Thanh toán</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-serif font-light mb-8 text-black dark:text-white">Thanh toán</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} id="checkout-form" className="space-y-6">
            {/* Thông tin cá nhân */}
            <section className={sectionClassName}>
              <h2 className="text-lg font-medium mb-6 flex items-center gap-2 text-black dark:text-white">
                <ShoppingBag className="w-5 h-5" />
                Thông tin người nhận
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClassName}>Họ và tên *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Nhập họ và tên"
                    className={inputClassName}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClassName}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@example.com"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Số điện thoại *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="0xxxxxxxxx"
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Địa chỉ giao hàng */}
            <section className={sectionClassName}>
              <h2 className="text-lg font-medium mb-6 flex items-center gap-2 text-black dark:text-white">
                <Truck className="w-5 h-5" />
                Địa chỉ giao hàng
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={labelClassName}>Địa chỉ chi tiết *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Số nhà, tên đường, tòa nhà..."
                    className={inputClassName}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClassName}>Tỉnh/Thành phố *</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={inputClassName}
                    >
                      <option value="">Chọn tỉnh/thành</option>
                      <option value="Hà Nội">Hà Nội</option>
                      <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                      <option value="Đà Nẵng">Đà Nẵng</option>
                      <option value="Hải Phòng">Hải Phòng</option>
                      <option value="Cần Thơ">Cần Thơ</option>
                      <option value="An Giang">An Giang</option>
                      <option value="Bà Rịa - Vũng Tàu">Bà Rịa - Vũng Tàu</option>
                      <option value="Bắc Giang">Bắc Giang</option>
                      <option value="Bắc Kạn">Bắc Kạn</option>
                      <option value="Bạc Liêu">Bạc Liêu</option>
                      <option value="Bắc Ninh">Bắc Ninh</option>
                      <option value="Bến Tre">Bến Tre</option>
                      <option value="Bình Định">Bình Định</option>
                      <option value="Bình Dương">Bình Dương</option>
                      <option value="Bình Phước">Bình Phước</option>
                      <option value="Bình Thuận">Bình Thuận</option>
                      <option value="Cà Mau">Cà Mau</option>
                      <option value="Cao Bằng">Cao Bằng</option>
                      <option value="Đắk Lắk">Đắk Lắk</option>
                      <option value="Đắk Nông">Đắk Nông</option>
                      <option value="Điện Biên">Điện Biên</option>
                      <option value="Đồng Nai">Đồng Nai</option>
                      <option value="Đồng Tháp">Đồng Tháp</option>
                      <option value="Gia Lai">Gia Lai</option>
                      <option value="Hà Giang">Hà Giang</option>
                      <option value="Hà Nam">Hà Nam</option>
                      <option value="Hà Tĩnh">Hà Tĩnh</option>
                      <option value="Hải Dương">Hải Dương</option>
                      <option value="Hậu Giang">Hậu Giang</option>
                      <option value="Hòa Bình">Hòa Bình</option>
                      <option value="Hưng Yên">Hưng Yên</option>
                      <option value="Khánh Hòa">Khánh Hòa</option>
                      <option value="Kiên Giang">Kiên Giang</option>
                      <option value="Kon Tum">Kon Tum</option>
                      <option value="Lai Châu">Lai Châu</option>
                      <option value="Lâm Đồng">Lâm Đồng</option>
                      <option value="Lạng Sơn">Lạng Sơn</option>
                      <option value="Lào Cai">Lào Cai</option>
                      <option value="Long An">Long An</option>
                      <option value="Nam Định">Nam Định</option>
                      <option value="Nghệ An">Nghệ An</option>
                      <option value="Ninh Bình">Ninh Bình</option>
                      <option value="Ninh Thuận">Ninh Thuận</option>
                      <option value="Phú Thọ">Phú Thọ</option>
                      <option value="Phú Yên">Phú Yên</option>
                      <option value="Quảng Bình">Quảng Bình</option>
                      <option value="Quảng Nam">Quảng Nam</option>
                      <option value="Quảng Ngãi">Quảng Ngãi</option>
                      <option value="Quảng Ninh">Quảng Ninh</option>
                      <option value="Quảng Trị">Quảng Trị</option>
                      <option value="Sóc Trăng">Sóc Trăng</option>
                      <option value="Sơn La">Sơn La</option>
                      <option value="Tây Ninh">Tây Ninh</option>
                      <option value="Thái Bình">Thái Bình</option>
                      <option value="Thái Nguyên">Thái Nguyên</option>
                      <option value="Thanh Hóa">Thanh Hóa</option>
                      <option value="Thừa Thiên Huế">Thừa Thiên Huế</option>
                      <option value="Tiền Giang">Tiền Giang</option>
                      <option value="Trà Vinh">Trà Vinh</option>
                      <option value="Tuyên Quang">Tuyên Quang</option>
                      <option value="Vĩnh Long">Vĩnh Long</option>
                      <option value="Vĩnh Phúc">Vĩnh Phúc</option>
                      <option value="Yên Bái">Yên Bái</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClassName}>Quận/Huyện *</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      placeholder="Nhập quận/huyện"
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className={labelClassName}>Phường/Xã</label>
                    <input
                      type="text"
                      name="ward"
                      value={formData.ward}
                      onChange={handleInputChange}
                      placeholder="Nhập phường/xã"
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Phương thức vận chuyển */}
            <section className={sectionClassName}>
              <h2 className="text-lg font-medium mb-4 text-black dark:text-white">Phương thức vận chuyển</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-black dark:hover:border-white transition bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="standard"
                      checked={shippingMethod === "standard"}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="w-4 h-4 accent-black dark:accent-white"
                    />
                    <div>
                      <p className="font-medium text-black dark:text-white">Giao hàng tiêu chuẩn</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">3-5 ngày làm việc</p>
                    </div>
                  </div>
                  <span className="font-medium text-black dark:text-white">
                    {subtotal >= 1000000 ? "Miễn phí" : "30.000₫"}
                  </span>
                </label>
                <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-black dark:hover:border-white transition bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="express"
                      checked={shippingMethod === "express"}
                      onChange={(e) => setShippingMethod(e.target.value)}
                      className="w-4 h-4 accent-black dark:accent-white"
                    />
                    <div>
                      <p className="font-medium text-black dark:text-white">Giao hàng nhanh</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">1-2 ngày làm việc</p>
                    </div>
                  </div>
                  <span className="font-medium text-black dark:text-white">50.000₫</span>
                </label>
              </div>
            </section>

            {/* Phương thức thanh toán */}
            <section className={sectionClassName}>
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-black dark:text-white">
                <CreditCard className="w-5 h-5" />
                Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-black dark:hover:border-white transition bg-white dark:bg-gray-800">
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 accent-black dark:accent-white mr-3"
                  />
                  <div>
                    <p className="font-medium text-black dark:text-white">Thanh toán khi nhận hàng (COD)</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Thanh toán bằng tiền mặt khi nhận hàng</p>
                  </div>
                </label>
                <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-black dark:hover:border-white transition bg-white dark:bg-gray-800">
                  <input
                    type="radio"
                    name="payment"
                    value="transfer"
                    checked={paymentMethod === "transfer"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 accent-black dark:accent-white mr-3"
                  />
                  <div>
                    <p className="font-medium text-black dark:text-white">Chuyển khoản ngân hàng</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Chuyển khoản qua Internet Banking</p>
                  </div>
                </label>
              </div>
            </section>

            {/* Ghi chú */}
            <section className={sectionClassName}>
              <h2 className="text-lg font-medium mb-4 text-black dark:text-white">Ghi chú</h2>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Ghi chú về đơn hàng, ví dụ: thời gian nhận hàng..."
                className={`${inputClassName} resize-none`}
              />
            </section>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 sticky top-8">
            <h2 className="text-lg font-medium mb-6 text-black dark:text-white">
              Đơn hàng ({cart.items.length} sản phẩm)
            </h2>
            
            {/* Cart Items */}
            <div className="space-y-4 mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
              {cart.items.map((item) => {
                const price = item.variant?.salePrice || item.variant?.price || item.product.salePrice || item.product.price;
                return (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-16 h-20 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden shrink-0">
                      <Image
                        src={item.product.images[0]?.url || "https://via.placeholder.com/100x120"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-black dark:bg-white text-white dark:text-black text-xs flex items-center justify-center rounded-full">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium line-clamp-2 text-black dark:text-white">
                        {item.product.name}
                      </h4>
                      {item.variant && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.variant.colorName} - {item.variant.size}
                        </p>
                      )}
                      <p className="text-sm font-medium mt-1 text-black dark:text-white">
                        {(price * item.quantity).toLocaleString("vi-VN")}₫
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Voucher Section - Voucher Stacking */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <VoucherSelector
                shippingFee={shippingFee}
                onDiscountChange={setDiscountAmount}
                onShippingDiscountChange={setShippingDiscountAmount}
              />
            </div>

            {/* Price Summary */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString("vi-VN")}₫</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Giảm giá</span>
                  <span>-{discountAmount.toLocaleString("vi-VN")}₫</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Phí vận chuyển</span>
                <span>
                  {shippingFee === 0 ? "Miễn phí" : `${shippingFee.toLocaleString("vi-VN")}₫`}
                </span>
              </div>
              {shippingDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Giảm phí ship</span>
                  <span>-{shippingDiscountAmount.toLocaleString("vi-VN")}₫</span>
                </div>
              )}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-lg font-medium text-black dark:text-white">
                  <span>Tổng cộng</span>
                  <span>{total.toLocaleString("vi-VN")}₫</span>
                </div>
              </div>
            </div>

            {/* Points Preview */}
            {pointsPreview && pointsPreview.pointsToEarn > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                  <span className="text-sm font-medium">
                    +{pointsPreview.pointsToEarn} diem tich luy
                  </span>
                  {pointsPreview.isBirthdayMonth && (
                    <span className="text-xs bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 rounded">x2 sinh nhat</span>
                  )}
                </div>
                {!isAuthenticated && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    <Link href="/login-register" className="underline">Dang nhap</Link> de tich diem
                  </p>
                )}
              </div>
            )}

            {/* Security Note */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Shield className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-300">
                Thong tin cua ban duoc bao mat an toan
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition font-medium flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                `Đặt hàng - ${total.toLocaleString("vi-VN")}₫`
              )}
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              Bằng cách đặt hàng, bạn đồng ý với{" "}
              <Link href="/dieu-khoan" className="underline hover:text-black dark:hover:text-white transition">
                điều khoản dịch vụ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

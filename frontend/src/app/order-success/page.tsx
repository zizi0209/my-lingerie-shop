"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, Package, ArrowLeft, Home, ShoppingBag, Star } from "lucide-react";

export default function OrderSuccessPage() {
  const [orderData, setOrderData] = useState<any>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Lấy thông tin đơn hàng từ localStorage (hoặc state management)
    const savedOrder = localStorage.getItem('lastOrder');
    if (savedOrder) {
      setOrderData(JSON.parse(savedOrder));
    }

    // Đảo ngược thời gian đếm ngược
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleContinueShopping = () => {
    localStorage.removeItem('lastOrder');
  };

  // Mock order data nếu không có
  const mockOrder = {
    orderNumber: "LNG" + Date.now().toString().slice(-8),
    customerName: "Nguyễn Văn A",
    email: "email@example.com",
    phone: "09xxxxxxxx",
    items: [
      {
        name: "Áo lót ren đen quyến rũ",
        quantity: 1,
        price: 890000,
        image: "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop"
      },
      {
        name: "Quần lót ren matching",
        quantity: 2,
        price: 450000,
        image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop"
      }
    ],
    subtotal: 1790000,
    shipping: 0,
    total: 1790000,
    paymentMethod: "COD",
    shippingAddress: {
      address: "123 Nguyễn Huệ",
      city: "TP. Hồ Chí Minh",
      district: "Quận 1",
      ward: "Phường Bến Nghé"
    }
  };

  const order = orderData || mockOrder;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Icon & Message */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6 animate-pulse">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-light mb-4">
            Đặt hàng thành công!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Cảm ơn bạn đã tin tưởng và mua sắm tại Lingerie Shop
          </p>
          <p className="text-gray-500">
            Mã đơn hàng của bạn: <span className="font-medium text-black">#{order.orderNumber}</span>
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b">
            <Package className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-medium">Thông tin đơn hàng</h2>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-medium mb-3">Thông tin khách hàng</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="font-medium">Họ tên:</span> {order.customerName}</p>
                <p><span className="font-medium">Email:</span> {order.email}</p>
                <p><span className="font-medium">Điện thoại:</span> {order.phone}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Địa chỉ giao hàng</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.ward}, {order.shippingAddress.district}</p>
                <p>{order.shippingAddress.city}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-8">
            <h3 className="font-medium mb-4">Sản phẩm đã đặt</h3>
            <div className="space-y-4">
              {order.items.map((item: any, index: number) => (
                <div key={index} className="flex gap-4 items-center">
                  <div className="relative w-16 h-16 bg-gray-50 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">
                    {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Tạm tính</span>
                <span>{order.subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Phí vận chuyển</span>
                <span>{order.shipping === 0 ? 'Miễn phí' : `${order.shipping.toLocaleString('vi-VN')}₫`}</span>
              </div>
              <div className="flex justify-between text-lg font-medium pt-3 border-t">
                <span>Tổng cộng</span>
                <span>{order.total.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Phương thức thanh toán:</span> {order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : order.paymentMethod}
            </p>
            {order.paymentMethod === "COD" && (
              <p className="text-sm text-gray-500 mt-1">
                Vui lòng chuẩn bị số tiền chính xác khi nhận hàng
              </p>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Các bước tiếp theo
          </h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li>1. Chúng tôi sẽ xác nhận đơn hàng trong vòng 2 giờ làm việc</li>
            <li>2. Bạn sẽ nhận được email xác nhận với thông tin chi tiết</li>
            <li>3. Đơn hàng sẽ được giao trong 3-5 ngày làm việc</li>
            <li>4. Bạn sẽ nhận được tin nhắn SMS trước khi giao hàng 1 ngày</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/order"
            onClick={handleContinueShopping}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-gray-300 rounded-lg hover:border-black transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Theo dõi đơn hàng
          </Link>
          <Link
            href="/"
            onClick={handleContinueShopping}
            className="ck-button inline-flex items-center justify-center gap-2 px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition"
          >
            <Home className="w-5 h-5" />
            Về trang chủ
          </Link>
          <Link
            href="/san-pham"
            onClick={handleContinueShopping}
            className="ck-button inline-flex items-center justify-center gap-2 px-8 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition"
          >
            <ShoppingBag className="w-5 h-5" />
            Tiếp tục mua sắm
          </Link>
        </div>

        {/* Review Reminder */}
        <div className="text-center mt-12 p-6 bg-gray-50 rounded-lg">
          <Star className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">Hãy chia sẻ trải nghiệm của bạn!</h3>
          <p className="text-gray-600 text-sm mb-4">
            Đánh giá sản phẩm sau khi nhận hàng để giúp khách hàng khác có lựa chọn tốt hơn
          </p>
          <Link
            href="/san-pham"
            className="text-rose-600 hover:text-rose-700 text-sm underline"
          >
            Xem lại sản phẩm đã mua
          </Link>
        </div>

        {/* Auto-redirect Message */}
        {countdown > 0 && (
          <div className="text-center mt-8 text-sm text-gray-500">
            Tự động chuyển về trang chủ sau {countdown} giây...
          </div>
        )}
      </div>
    </div>
  );
}
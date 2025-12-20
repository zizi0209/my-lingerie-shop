"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Package, Clock, CheckCircle, Truck, Home, Phone, Mail, User } from "lucide-react";

export default function OrderTrackingPage() {
  const [orderCode, setOrderCode] = useState("");
  const [orderData, setOrderData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mock order data - Trong thực tế sẽ fetch từ API
  const mockOrderData = {
    "LNG2024121501": {
      orderNumber: "LNG2024121501",
      status: "delivering",
      statusText: "Đang giao hàng",
      createdAt: "2024-12-15T10:30:00",
      estimatedDelivery: "2024-12-17T09:00-18:00",
      customer: {
        name: "Nguyễn Văn A",
        phone: "09xxxxxxxx",
        email: "email@example.com"
      },
      shippingAddress: {
        address: "123 Nguyễn Huệ",
        ward: "Phường Bến Nghé",
        district: "Quận 1",
        city: "TP. Hồ Chí Minh"
      },
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
      total: 1790000,
      paymentMethod: "COD",
      shippingFee: 0,
      tracking: [
        {
          status: "ordered",
          title: "Đặt hàng thành công",
          description: "Đơn hàng đã được xác nhận",
          time: "2024-12-15 10:30",
          completed: true
        },
        {
          status: "processing",
          title: "Đang chuẩn bị hàng",
          description: "Đơn hàng đang được đóng gói",
          time: "2024-12-15 14:20",
          completed: true
        },
        {
          status: "shipping",
          title: "Đang vận chuyển",
          description: "Đơn hàng đang được giao đến bạn",
          time: "2024-12-16 09:15",
          completed: true
        },
        {
          status: "delivering",
          title: "Đang giao hàng",
          description: "Shipper đang đến địa chỉ của bạn",
          time: "2024-12-17 08:00",
          completed: true
        },
        {
          status: "delivered",
          title: "Giao hàng thành công",
          description: "Bạn đã nhận được đơn hàng",
          time: "Dự kiến: 2024-12-17",
          completed: false
        }
      ]
    }
  };

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim()) {
      setError("Vui lòng nhập mã đơn hàng");
      return;
    }

    setLoading(true);
    setError("");

    // Simulate API call
    setTimeout(() => {
      const data = mockOrderData[orderCode as keyof typeof mockOrderData];
      if (data) {
        setOrderData(data);
        setError("");
      } else {
        setError("Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn hàng.");
        setOrderData(null);
      }
      setLoading(false);
    }, 1000);
  };

  const getStatusIcon = (status: string, completed: boolean) => {
    const iconClass = completed ? "text-green-600" : "text-gray-400";
    const bgClass = completed ? "bg-green-100" : "bg-gray-100";

    switch (status) {
      case "ordered":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
            <CheckCircle className={`w-5 h-5 ${iconClass}`} />
          </div>
        );
      case "processing":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
            <Package className={`w-5 h-5 ${iconClass}`} />
          </div>
        );
      case "shipping":
      case "delivering":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
            <Truck className={`w-5 h-5 ${iconClass}`} />
          </div>
        );
      case "delivered":
        return (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgClass}`}>
            <Home className={`w-5 h-5 ${iconClass}`} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-serif font-light mb-4">Theo dõi đơn hàng</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Nhập mã đơn hàng để kiểm tra tình trạng giao hàng và thông tin chi tiết
        </p>
      </div>

      {/* Search Form */}
      <div className="max-w-2xl mx-auto mb-12">
        <form onSubmit={handleTrackOrder} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Nhập mã đơn hàng (ví dụ: LNG2024121501)"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="ck-button px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang tìm..." : "Theo dõi"}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Order Details */}
      {orderData && (
        <div className="max-w-4xl mx-auto">
          {/* Order Status Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <h2 className="text-2xl font-serif font-light mb-6">Tình trạng đơn hàng</h2>

            {/* Current Status */}
            <div className="mb-8 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-blue-900">{(orderData as Record<string, string>).statusText}</h3>
                  <p className="text-blue-700">
                    Dự kiến giao hàng: {(orderData as Record<string, string>).estimatedDelivery}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-6">
                {(orderData.tracking as Record<string, unknown>[]).map((step: Record<string, unknown>, index: number) => (
                  <div key={index} className="relative flex gap-4">
                    {getStatusIcon((step as Record<string, string>).status, (step as Record<string, boolean>).completed)}
                    <div className="flex-1">
                      <h4 className={`font-medium ${(step as Record<string, boolean>).completed ? "text-gray-900" : "text-gray-400"}`}>
                        {(step as Record<string, string>).title}
                      </h4>
                      <p className={`text-sm ${(step as Record<string, boolean>).completed ? "text-gray-600" : "text-gray-400"}`}>
                        {(step as Record<string, string>).description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{(step as Record<string, string>).time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Customer Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-medium mb-4">Thông tin khách hàng</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{(orderData.customer as Record<string, string>).name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{(orderData.customer as Record<string, string>).phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{(orderData.customer as Record<string, string>).email}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-medium mb-4">Địa chỉ giao hàng</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{(orderData.shippingAddress as Record<string, string>).address}</p>
                <p>{(orderData.shippingAddress as Record<string, string>).ward}, {(orderData.shippingAddress as Record<string, string>).district}</p>
                <p>{(orderData.shippingAddress as Record<string, string>).city}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h3 className="font-medium mb-4">Sản phẩm đã đặt</h3>
            <div className="space-y-4">
              {(orderData.items as Record<string, unknown>[]).map((item: Record<string, unknown>, index: number) => (
                <div key={index} className="flex gap-4 items-center">
                  <div className="relative w-16 h-16 bg-gray-50 rounded overflow-hidden shrink-0">
                    <Image
                      src={(item as Record<string, string>).image}
                      alt={(item as Record<string, string>).name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{(item as Record<string, string>).name}</h4>
                    <p className="text-sm text-gray-500">Số lượng: {(item as Record<string, number>).quantity}</p>
                  </div>
                  <p className="text-sm font-medium">
                    {((item as Record<string, number>).price * (item as Record<string, number>).quantity).toLocaleString('vi-VN')}₫
                  </p>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="border-t mt-6 pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span>{((orderData as Record<string, number>).total - (orderData as Record<string, number>).shippingFee).toLocaleString('vi-VN')}₫</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span>{(orderData as Record<string, number>).shippingFee === 0 ? 'Miễn phí' : `${(orderData as Record<string, number>).shippingFee.toLocaleString('vi-VN')}₫`}</span>
                </div>
                <div className="flex justify-between text-lg font-medium pt-3 border-t">
                  <span>Tổng cộng</span>
                  <span>{(orderData as Record<string, number>).total.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-gray-300 rounded-lg hover:border-black transition"
            >
              <Phone className="w-5 h-5" />
              Liên hệ hỗ trợ
            </Link>
            <Link
              href="/"
              className="ck-button inline-flex items-center justify-center gap-2 px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      )}

      {/* Help Section */}
      {!orderData && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center transition-colors">
            <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Cần giúp đỡ?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Nếu bạn gặp vấn đề khi theo dõi đơn hàng, đừng ngần ngại liên hệ với chúng tôi
            </p>
            <div className="space-y-3 text-gray-700 dark:text-gray-200">
              <p className="flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" />
                <span>Hotline: 1900 1234</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <Mail className="w-5 h-5" />
                <span>Email: support@lingerie-shop.vn</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5" />
                <span>Giờ làm việc: 8:00 - 21:00</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
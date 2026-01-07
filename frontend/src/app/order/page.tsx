"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  Truck,
  Home,
  Phone,
  Mail,
  User,
  Loader2,
  AlertCircle,
  XCircle,
  CreditCard,
} from "lucide-react";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  variant: string | null;
  product: {
    id: number;
    name: string;
    slug: string;
    price: number;
    images: { url: string }[];
  };
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  shippingAddress: string;
  shippingCity: string | null;
  shippingPhone: string | null;
  shippingMethod: string | null;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  shippingFee: number;
  discount: number;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
  user: { name: string | null; email: string | null } | null;
  guestInfo: { name?: string; email?: string; phone?: string } | null;
  items: OrderItem[];
}

const STATUS_MAP: Record<string, { text: string; color: string; bgColor: string }> = {
  PENDING: { text: "Chờ xác nhận", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  CONFIRMED: { text: "Đã xác nhận", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  PROCESSING: { text: "Đang xử lý", color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  SHIPPING: { text: "Đang giao hàng", color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  DELIVERED: { text: "Đã giao hàng", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  COMPLETED: { text: "Hoàn thành", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  CANCELLED: { text: "Đã hủy", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
};

const TRACKING_STEPS = [
  { status: "PENDING", title: "Đặt hàng thành công", icon: CheckCircle },
  { status: "CONFIRMED", title: "Đã xác nhận", icon: Package },
  { status: "PROCESSING", title: "Đang chuẩn bị", icon: Package },
  { status: "SHIPPING", title: "Đang vận chuyển", icon: Truck },
  { status: "DELIVERED", title: "Đã giao hàng", icon: Home },
];

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code") || "";

  const [orderCode, setOrderCode] = useState(codeFromUrl);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const fetchOrder = async (code: string) => {
    if (!code.trim()) {
      setError("Vui lòng nhập mã đơn hàng");
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch(`${baseUrl}/orders/track/${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Không tìm thấy đơn hàng");
        return;
      }

      setOrder(data.data);
    } catch (err) {
      console.error("Fetch order error:", err);
      setError("Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if code is in URL
  useEffect(() => {
    if (codeFromUrl) {
      setOrderCode(codeFromUrl);
      fetchOrder(codeFromUrl);
    }
  }, [codeFromUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(orderCode);
  };

  const getStepStatus = (stepStatus: string): "completed" | "current" | "pending" => {
    if (!order) return "pending";
    
    const statusOrder = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "DELIVERED", "COMPLETED"];
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepStatus);

    if (order.status === "CANCELLED") {
      return stepStatus === "PENDING" ? "completed" : "pending";
    }

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "pending";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCustomerName = () => {
    if (order?.user?.name) return order.user.name;
    if (order?.guestInfo?.name) return order.guestInfo.name;
    return "Khách hàng";
  };

  const getCustomerEmail = () => {
    if (order?.user?.email) return order.user.email;
    if (order?.guestInfo?.email) return order.guestInfo.email;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-serif font-light mb-4 text-gray-900 dark:text-white">
          Theo dõi đơn hàng
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Nhập mã đơn hàng để kiểm tra tình trạng giao hàng
        </p>
      </div>

      {/* Search Form */}
      <div className="max-w-2xl mx-auto mb-10">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Nhập mã đơn hàng (VD: ORD-xxxxx)"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-black dark:focus:border-white bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            <span className="hidden sm:inline">Tìm kiếm</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Order Details */}
      {order && !loading && (
        <div className="max-w-4xl mx-auto">
          {/* Order Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mã đơn hàng</p>
                <p className="text-xl font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${STATUS_MAP[order.status]?.bgColor || "bg-gray-100"}`}>
                {order.status === "CANCELLED" ? (
                  <XCircle className={`w-5 h-5 ${STATUS_MAP[order.status]?.color}`} />
                ) : order.status === "DELIVERED" || order.status === "COMPLETED" ? (
                  <CheckCircle className={`w-5 h-5 ${STATUS_MAP[order.status]?.color}`} />
                ) : (
                  <Truck className={`w-5 h-5 ${STATUS_MAP[order.status]?.color}`} />
                )}
                <span className={`font-medium ${STATUS_MAP[order.status]?.color}`}>
                  {STATUS_MAP[order.status]?.text || order.status}
                </span>
              </div>
            </div>

            {/* Tracking Timeline */}
            {order.status !== "CANCELLED" && (
              <div className="relative">
                <div className="flex justify-between mb-2">
                  {TRACKING_STEPS.map((step, index) => {
                    const stepStatus = getStepStatus(step.status);
                    const Icon = step.icon;
                    return (
                      <div key={step.status} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                            stepStatus === "completed"
                              ? "bg-green-500 text-white"
                              : stepStatus === "current"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-400"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <p
                          className={`text-xs text-center ${
                            stepStatus !== "pending"
                              ? "text-gray-900 dark:text-white font-medium"
                              : "text-gray-400"
                          }`}
                        >
                          {step.title}
                        </p>
                        {/* Progress line */}
                        {index < TRACKING_STEPS.length - 1 && (
                          <div
                            className={`absolute top-5 h-0.5 ${
                              getStepStatus(TRACKING_STEPS[index + 1].status) !== "pending"
                                ? "bg-green-500"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                            style={{
                              left: `calc(${(index + 0.5) * 20}% + 20px)`,
                              width: `calc(20% - 40px)`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.status === "CANCELLED" && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                <p className="text-red-700 dark:text-red-400 font-medium">Đơn hàng đã bị hủy</p>
                {order.cancelledAt && (
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    Hủy lúc: {formatDate(order.cancelledAt)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Order Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Customer Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Thông tin khách hàng
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4 shrink-0" />
                  <span>{getCustomerName()}</span>
                </div>
                {order.shippingPhone && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{order.shippingPhone}</span>
                  </div>
                )}
                {getCustomerEmail() && (
                  <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span>{getCustomerEmail()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-medium mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Địa chỉ giao hàng
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {order.shippingAddress}
              </p>
              {order.trackingNumber && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mã vận đơn:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{order.trackingNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="font-medium mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Sản phẩm đã đặt ({order.items.length})
            </h3>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="relative w-16 h-20 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden shrink-0">
                    <Image
                      src={item.product.images[0]?.url || "https://via.placeholder.com/100x120"}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/san-pham/${item.product.slug}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition line-clamp-2"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{item.variant}</p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400">x{item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                  </p>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="border-t border-gray-200 dark:border-gray-700 mt-6 pt-6 space-y-3 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tạm tính</span>
                <span>{(order.totalAmount - order.shippingFee + order.discount).toLocaleString("vi-VN")}₫</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Giảm giá</span>
                  <span>-{order.discount.toLocaleString("vi-VN")}₫</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Phí vận chuyển</span>
                <span>{order.shippingFee === 0 ? "Miễn phí" : `${order.shippingFee.toLocaleString("vi-VN")}₫`}</span>
              </div>
              <div className="flex justify-between text-lg font-medium pt-3 border-t border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                <span>Tổng cộng</span>
                <span>{order.totalAmount.toLocaleString("vi-VN")}₫</span>
              </div>
            </div>
          </div>

          {/* Payment & Order Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Ngày đặt</p>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Thanh toán</p>
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  {order.paymentMethod === "COD" ? "COD" : order.paymentMethod === "TRANSFER" ? "Chuyển khoản" : order.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Vận chuyển</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {order.shippingMethod === "EXPRESS" ? "Nhanh" : "Tiêu chuẩn"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 mb-1">Trạng thái TT</p>
                <p className={`font-medium ${order.paymentStatus === "PAID" ? "text-green-600" : "text-yellow-600"}`}>
                  {order.paymentStatus === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}
                </p>
              </div>
            </div>
            {order.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ghi chú:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-black dark:hover:border-white transition text-gray-900 dark:text-white"
            >
              <Phone className="w-5 h-5" />
              Liên hệ hỗ trợ
            </Link>
            <Link
              href="/san-pham"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-900 dark:hover:bg-gray-100 transition"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      )}

      {/* Help Section - Show when no order */}
      {!order && !loading && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
            <Package className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium mb-4 text-gray-900 dark:text-white">Cần giúp đỡ?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Nếu bạn gặp vấn đề khi theo dõi đơn hàng, hãy liên hệ với chúng tôi
            </p>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p className="flex items-center justify-center gap-2">
                <Phone className="w-5 h-5 text-gray-400" />
                <span>Hotline: 1900 1234</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <Mail className="w-5 h-5 text-gray-400" />
                <span>Email: support@lingerie-shop.vn</span>
              </p>
              <p className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <span>Giờ làm việc: 8:00 - 21:00</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}

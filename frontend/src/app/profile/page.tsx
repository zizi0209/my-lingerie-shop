"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Settings,
  LogOut,
  Edit,
  Camera,
  ChevronRight,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/api";
import type { User as UserType } from "@/types/auth";

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

interface ProfileResponse {
  success: boolean;
  data: UserType & { orders?: Order[] };
}

type TabType = "overview" | "orders" | "security" | "wishlist" | "addresses";

function ProfileContent() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Sync form with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Load orders when tab changes
  useEffect(() => {
    if (activeTab === "orders" && orders.length === 0) {
      loadOrders();
    }
  }, [activeTab, orders.length]);

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const response = await api.get<ProfileResponse>("/users/profile");
      if (response.success && response.data.orders) {
        setOrders(response.data.orders);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await api.put<{ success: boolean; message?: string }>("/users/profile", {
        name: profileForm.name,
        phone: profileForm.phone,
      });

      if (response.success) {
        setMessage({ type: "success", text: "Cập nhật thông tin thành công!" });
        setIsEditing(false);
        await refreshUser();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Lỗi khi cập nhật!";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: "error", text: "Mật khẩu xác nhận không khớp!" });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage({ type: "error", text: "Mật khẩu mới phải có ít nhất 8 ký tự!" });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await api.put<{ success: boolean; message?: string }>("/users/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      if (response.success) {
        setMessage({ type: "success", text: "Đổi mật khẩu thành công! Đang đăng xuất..." });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        
        // Logout after password change
        setTimeout(async () => {
          await logout();
          router.push("/login-register");
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Lỗi khi đổi mật khẩu!";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      case "processing":
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
      case "shipped":
        return "text-purple-600 bg-purple-100 dark:bg-purple-900/30";
      case "delivered":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "cancelled":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Chờ xử lý",
      processing: "Đang xử lý",
      shipped: "Đang giao",
      delivered: "Đã giao",
      cancelled: "Đã hủy",
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-serif font-light mb-8 text-gray-900 dark:text-white">
            Tài khoản của tôi
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
                {/* User Info */}
                <div className="text-center mb-6">
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      {user?.avatar ? (
                        <Image
                          src={user.avatar}
                          alt="Avatar"
                          fill
                          className="object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-10 h-10 text-primary" />
                      )}
                    </div>
                    <button className="absolute bottom-0 right-0 w-7 h-7 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black shadow-lg">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {user?.name || "Chưa cập nhật tên"}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                </div>

                {/* Navigation */}
                <nav className="space-y-1">
                  {[
                    { id: "overview" as TabType, icon: User, label: "Thông tin cá nhân" },
                    { id: "orders" as TabType, icon: ShoppingBag, label: "Đơn hàng của tôi" },
                    { id: "security" as TabType, icon: Lock, label: "Bảo mật" },
                    { id: "wishlist" as TabType, icon: Heart, label: "Yêu thích" },
                    { id: "addresses" as TabType, icon: MapPin, label: "Sổ địa chỉ" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMessage(null);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-left ${
                        activeTab === item.id
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 mt-6 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Message */}
              {message && (
                <div
                  className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                    message.type === "success"
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}
                >
                  {message.type === "success" && <Check className="w-5 h-5" />}
                  {message.text}
                </div>
              )}

              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Thông tin cá nhân
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-gray-700 dark:text-gray-300"
                    >
                      <Edit className="w-4 h-4" />
                      {isEditing ? "Hủy" : "Chỉnh sửa"}
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Họ và tên
                          </label>
                          <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Nhập họ và tên"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Email
                          </label>
                          <input
                            type="email"
                            value={user?.email || ""}
                            disabled
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                          />
                          <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                            Số điện thoại
                          </label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Nhập số điện thoại"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Họ và tên</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user?.name || "Chưa cập nhật"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                        <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Số điện thoại</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user?.phone || "Chưa cập nhật"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ngày tham gia</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {user?.createdAt ? formatDate(user.createdAt) : "-"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === "orders" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Đơn hàng của tôi
                  </h2>

                  {isLoadingOrders ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                      <ShoppingBag className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Chưa có đơn hàng nào
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Bắt đầu mua sắm để xem đơn hàng của bạn tại đây
                      </p>
                      <Link
                        href="/san-pham"
                        className="inline-flex px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition"
                      >
                        Khám phá sản phẩm
                      </Link>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              Mã đơn: {order.orderNumber}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Ngày đặt: {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusText(order.status)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="font-medium text-gray-900 dark:text-white">
                            Tổng: {order.totalAmount.toLocaleString("vi-VN")}₫
                          </p>
                          <Link
                            href={`/order?code=${order.orderNumber}`}
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            Xem chi tiết
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Đổi mật khẩu
                  </h2>

                  <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Mật khẩu hiện tại
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                          }
                          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Nhập mật khẩu hiện tại"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.current ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                          }
                          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Tối thiểu 8 ký tự"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Xác nhận mật khẩu mới
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                          }
                          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Nhập lại mật khẩu mới"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isChangingPassword ? "Đang xử lý..." : "Đổi mật khẩu"}
                    </button>
                  </form>

                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Lưu ý bảo mật</h3>
                    <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      <li>• Mật khẩu phải có ít nhất 8 ký tự</li>
                      <li>• Nên bao gồm chữ hoa, chữ thường và số</li>
                      <li>• Không sử dụng thông tin cá nhân dễ đoán</li>
                      <li>• Sau khi đổi mật khẩu, bạn sẽ cần đăng nhập lại</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Wishlist Tab */}
              {activeTab === "wishlist" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <Heart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Danh sách yêu thích trống
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Lưu những sản phẩm yêu thích để mua sau
                  </p>
                  <Link
                    href="/san-pham"
                    className="inline-flex px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition"
                  >
                    Khám phá sản phẩm
                  </Link>
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === "addresses" && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <MapPin className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Chưa có địa chỉ nào
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Thêm địa chỉ giao hàng để checkout nhanh hơn
                  </p>
                  <button className="inline-flex px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition">
                    Thêm địa chỉ mới
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

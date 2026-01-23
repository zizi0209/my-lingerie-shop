"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
  Star,
  Bookmark,
  Calendar,
  ThumbsUp,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { api } from "@/lib/api";
import { Trash2 } from "lucide-react";
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

interface BookmarkedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  thumbnail: string | null;
  likeCount: number;
  views: number;
  publishedAt: string | null;
  category: {
    id: number;
    name: string;
    slug: string;
  };
}

type TabType = "overview" | "orders" | "security" | "wishlist" | "addresses" | "saved-posts";

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, refreshUser } = useAuth();
  const { items: wishlistItems, loading: wishlistLoading, removeFromWishlist } = useWishlist();
  
  // Get initial tab from URL or default to "overview"
  const tabFromUrl = searchParams.get("tab") as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl || "overview");
  
  // Sync tab with URL
  useEffect(() => {
    const currentTab = searchParams.get("tab") as TabType | null;
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams, activeTab]);
  
  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setMessage(null);
    router.push(`/profile?tab=${tab}`, { scroll: false });
  };
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

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Points state
  const [pointsInfo, setPointsInfo] = useState<{
    pointBalance: number;
    memberTier: string;
    totalSpent: number;
  } | null>(null);

  // Saved posts state
  const [savedPosts, setSavedPosts] = useState<BookmarkedPost[]>([]);
  const [isLoadingSavedPosts, setIsLoadingSavedPosts] = useState(false);

  // Sync form with user data
  useEffect(() => {
    if (user) {
      // Always sync form with latest user data
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Reset form when exiting edit mode
  useEffect(() => {
    if (!isEditing && user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
      });
    }
  }, [isEditing, user]);

  // Load orders when tab changes
  useEffect(() => {
    if (activeTab === "orders" && orders.length === 0) {
      loadOrders();
    }
  }, [activeTab, orders.length]);

  // Load saved posts when tab changes
  useEffect(() => {
    if (activeTab === "saved-posts" && savedPosts.length === 0) {
      loadSavedPosts();
    }
  }, [activeTab, savedPosts.length]);

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

  const loadSavedPosts = async () => {
    setIsLoadingSavedPosts(true);
    try {
      const response = await api.get<{ success: boolean; data: BookmarkedPost[] }>("/posts/me/bookmarks");
      if (response.success) {
        setSavedPosts(response.data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingSavedPosts(false);
    }
  };

  const handleRemoveBookmark = async (postId: number) => {
    try {
      await api.post(`/posts/${postId}/bookmark`);
      setSavedPosts(prev => prev.filter(p => p.id !== postId));
    } catch {
      // Silent fail
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

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Chỉ chấp nhận file ảnh!' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Kích thước file tối đa 5MB!' });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.uploadFile<{ success: boolean; data: UserType; message?: string }>(
        '/users/upload-avatar',
        formData
      );

      if (response.success) {
        setMessage({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
        await refreshUser();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi upload ảnh!';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsUploadingAvatar(false);
      // Reset input
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
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
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center overflow-hidden">
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
                    <button
                      onClick={handleAvatarClick}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 w-7 h-7 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black shadow-lg hover:scale-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Thay đổi ảnh đại diện"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
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
                    { id: "addresses" as TabType, icon: MapPin, label: "Sổ địa chỉ" },
                    { id: "wishlist" as TabType, icon: Heart, label: "Sản phẩm yêu thích" },
                    { id: "saved-posts" as TabType, icon: Bookmark, label: "Bài viết đã lưu" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
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
                  
                  {/* Link to Reviews page */}
                  <Link
                    href="/tai-khoan/danh-gia"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Star className="w-5 h-5" />
                    <span className="text-sm font-medium">Đánh giá của tôi</span>
                  </Link>
                  
                  {/* Link to Vouchers page */}
                  <Link
                    href="/profile/vouchers"
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <span className="text-sm font-medium">Ví voucher & Điểm</span>
                  </Link>
                  
                  {/* Security tab */}
                  <button
                    onClick={() => handleTabChange("security")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition text-left ${
                      activeTab === "security"
                        ? "bg-black dark:bg-white text-white dark:text-black"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Lock className="w-5 h-5" />
                    <span className="text-sm font-medium">Bảo mật</span>
                  </button>
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
                    orders.map((order) => {
                      const canReview = order.status.toLowerCase() === "delivered" || order.status.toLowerCase() === "completed";
                      return (
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
                            <div className="flex items-center gap-3">
                              {canReview && (
                                <Link
                                  href="/tai-khoan/danh-gia"
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition"
                                >
                                  <Star className="w-4 h-4" />
                                  Đánh giá
                                </Link>
                              )}
                              <Link
                                href={`/order?code=${order.orderNumber}`}
                                className="flex items-center gap-1.5 text-primary hover:underline"
                              >
                                Xem chi tiết
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                          placeholder="Nhập mật khẩu hiện tại"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label={showPasswords.current ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                          placeholder="Tối thiểu 8 ký tự"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label={showPasswords.new ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                          className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                          placeholder="Nhập lại mật khẩu mới"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          aria-label={showPasswords.confirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Sản phẩm yêu thích ({wishlistItems.length})
                  </h2>

                  {wishlistLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : wishlistItems.length === 0 ? (
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
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {wishlistItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group"
                        >
                          <Link
                            href={`/san-pham/${item.product.slug}`}
                            className="block relative aspect-[3/4] bg-gray-100 dark:bg-gray-700"
                          >
                            {item.product.image ? (
                              <Image
                                src={item.product.image}
                                alt={item.product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                            {item.product.salePrice && (
                              <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
                                -{Math.round((1 - item.product.salePrice / item.product.price) * 100)}%
                              </span>
                            )}
                          </Link>
                          <div className="p-4">
                            <Link
                              href={`/san-pham/${item.product.slug}`}
                              className="font-medium text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 line-clamp-2 mb-2 block"
                            >
                              {item.product.name}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                              {item.product.category.name}
                            </p>
                            <div className="flex items-center justify-between">
                              <div>
                                {item.product.salePrice ? (
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-red-500">
                                      {item.product.salePrice.toLocaleString("vi-VN")}₫
                                    </span>
                                    <span className="text-sm text-gray-400 line-through">
                                      {item.product.price.toLocaleString("vi-VN")}₫
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {item.product.price.toLocaleString("vi-VN")}₫
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => removeFromWishlist(item.productId)}
                                className="p-2 text-gray-400 hover:text-red-500 transition"
                                title="Xóa khỏi yêu thích"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* Saved Posts Tab */}
              {activeTab === "saved-posts" && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Bài viết đã lưu ({savedPosts.length})
                  </h2>

                  {isLoadingSavedPosts ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : savedPosts.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                      <Bookmark className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Chưa lưu bài viết nào
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Lưu các bài viết hay để đọc lại sau
                      </p>
                      <Link
                        href="/bai-viet"
                        className="inline-flex px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:opacity-90 transition"
                      >
                        Khám phá bài viết
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {savedPosts.map((post) => (
                        <article
                          key={post.id}
                          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden group"
                        >
                          <Link
                            href={`/bai-viet/${post.slug}`}
                            className="block relative aspect-[16/9] bg-gray-100 dark:bg-gray-700 overflow-hidden"
                          >
                            {post.thumbnail ? (
                              <Image
                                src={post.thumbnail}
                                alt={post.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Bookmark className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                              </div>
                            )}
                            <span className="absolute top-3 left-3 px-3 py-1 bg-black/70 text-white text-xs rounded-full">
                              {post.category.name}
                            </span>
                          </Link>
                          <div className="p-5">
                            <Link
                              href={`/bai-viet/${post.slug}`}
                              className="block font-semibold text-gray-900 dark:text-white hover:text-primary transition line-clamp-2 mb-2"
                            >
                              {post.title}
                            </Link>
                            {post.excerpt && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
                                {post.excerpt}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4" />
                                  {post.likeCount}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  {post.views}
                                </span>
                                {post.publishedAt && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(post.publishedAt)}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemoveBookmark(post.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition"
                                title="Bỏ lưu bài viết"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
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

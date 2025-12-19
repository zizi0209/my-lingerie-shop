"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { User, ShoppingBag, Heart, MapPin, CreditCard, LogOut, Edit, Camera, ChevronRight, Package, Clock, CheckCircle } from "lucide-react";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);

  // Mock user data
  const [userData, setUserData] = useState({
    name: "Nguyễn Văn A",
    email: "email@example.com",
    phone: "09xxxxxxxx",
    birthday: "1990-01-01",
    gender: "female",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b332c1ca?q=80&w=400&auto=format&fit=crop"
  });

  // Mock orders data
  const orders = [
    {
      id: "LNG2024121501",
      date: "15/12/2024",
      status: "delivering",
      statusText: "Đang giao hàng",
      total: 1790000,
      items: [
        {
          name: "Áo lót ren đen",
          quantity: 1,
          image: "https://images.unsplash.com/photo-1596486489709-7756e076722b?q=80&w=2070&auto=format&fit=crop"
        }
      ]
    },
    {
      id: "LNG2024121002",
      date: "10/12/2024",
      status: "delivered",
      statusText: "Đã giao hàng",
      total: 890000,
      items: [
        {
          name: "Đồ ngủ lụa",
          quantity: 1,
          image: "https://images.unsplash.com/photo-1583410264827-9de75a320417?q=80&w=2070&auto=format&fit=crop"
        }
      ]
    },
    {
      id: "LNG2024120503",
      date: "05/12/2024",
      status: "completed",
      statusText: "Hoàn thành",
      total: 2340000,
      items: [
        {
          name: "Bộ nội y ren trắng",
          quantity: 2,
          image: "https://images.unsplash.com/photo-1523381294911-8d3cead13475?q=80&w=2070&auto=format&fit=crop"
        }
      ]
    }
  ];

  // Mock addresses
  const addresses = [
    {
      id: 1,
      name: "Nguyễn Văn A",
      phone: "09xxxxxxxx",
      address: "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
      isDefault: true
    },
    {
      id: 2,
      name: "Nguyễn Văn A",
      phone: "09xxxxxxxx",
      address: "456 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
      isDefault: false
    }
  ];

  // Mock wishlist
  const wishlist = [
    {
      id: 1,
      name: "Áo lót ren đỏ",
      price: 990000,
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop",
      inStock: true
    },
    {
      id: 2,
      name: "Quần lót ren hoa",
      price: 450000,
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop",
      inStock: true
    },
    {
      id: 3,
      name: "Đồ ngủ satin",
      price: 1290000,
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop",
      inStock: false
    }
  ];

  const handleSaveProfile = () => {
    // Save profile logic here
    setIsEditing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivering":
        return "text-blue-600 bg-blue-100";
      case "delivered":
        return "text-green-600 bg-green-100";
      case "completed":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-serif font-light mb-8">Tài khoản của tôi</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-4">
              {/* User Avatar */}
              <div className="text-center mb-6">
                <div className="relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden">
                  <Image
                    src={userData.avatar}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-black rounded-full flex items-center justify-center text-white">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-medium">{userData.name}</h3>
                <p className="text-sm text-gray-500">{userData.email}</p>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === "overview" ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Thông tin cá nhân</span>
                </button>

                <button
                  onClick={() => setActiveTab("orders")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === "orders" ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Đơn hàng của tôi</span>
                </button>

                <button
                  onClick={() => setActiveTab("wishlist")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === "wishlist" ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
                >
                  <Heart className="w-5 h-5" />
                  <span>Yêu thích</span>
                </button>

                <button
                  onClick={() => setActiveTab("addresses")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === "addresses" ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
                >
                  <MapPin className="w-5 h-5" />
                  <span>Sổ địa chỉ</span>
                </button>

                <button
                  onClick={() => setActiveTab("payment")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === "payment" ? "bg-black text-white" : "hover:bg-gray-100"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Phương thức thanh toán</span>
                </button>
              </nav>

              {/* Logout */}
              <button className="w-full flex items-center justify-center gap-2 mt-6 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                <LogOut className="w-5 h-5" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-light">Thông tin cá nhân</h2>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <Edit className="w-4 h-4" />
                    {isEditing ? "Hủy" : "Chỉnh sửa"}
                  </button>
                </div>

                {isEditing ? (
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Họ và tên</label>
                        <input
                          type="text"
                          value={userData.name}
                          onChange={(e) => setUserData({...userData, name: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <input
                          type="email"
                          value={userData.email}
                          onChange={(e) => setUserData({...userData, email: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Điện thoại</label>
                        <input
                          type="tel"
                          value={userData.phone}
                          onChange={(e) => setUserData({...userData, phone: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Ngày sinh</label>
                        <input
                          type="date"
                          value={userData.birthday}
                          onChange={(e) => setUserData({...userData, birthday: e.target.value})}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Giới tính</label>
                      <select
                        value={userData.gender}
                        onChange={(e) => setUserData({...userData, gender: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black bg-white"
                      >
                        <option value="female">Nữ</option>
                        <option value="male">Nam</option>
                        <option value="other">Khác</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="ck-button px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition"
                    >
                      Lưu thay đổi
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Họ và tên</p>
                        <p className="font-medium">{userData.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Email</p>
                        <p className="font-medium">{userData.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Điện thoại</p>
                        <p className="font-medium">{userData.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Ngày sinh</p>
                        <p className="font-medium">{userData.birthday}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <h2 className="text-2xl font-serif font-light">Đơn hàng của tôi</h2>

                {orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium">Mã đơn hàng: {order.id}</p>
                        <p className="text-sm text-gray-500">Ngày đặt: {order.date}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                        {order.statusText}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex gap-4 items-center">
                          <div className="relative w-16 h-16 bg-gray-50 rounded overflow-hidden">
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="font-medium">
                        Tổng: {order.total.toLocaleString('vi-VN')}₫
                      </p>
                      <Link
                        href={`/order?code=${order.id}`}
                        className="flex items-center gap-2 text-rose-600 hover:text-rose-700 transition"
                      >
                        Xem chi tiết
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Wishlist Tab */}
            {activeTab === "wishlist" && (
              <div>
                <h2 className="text-2xl font-serif font-light mb-6">Sản phẩm yêu thích</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlist.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden group">
                      <div className="relative aspect-[4/5]">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-300"
                        />
                        {!item.inStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-medium">Hết hàng</span>
                          </div>
                        )}
                        <button className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-red-50 group">
                          <Heart className="w-5 h-5 fill-current text-red-600" />
                        </button>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium mb-2">{item.name}</h3>
                        <p className="text-lg font-medium text-rose-600 mb-3">
                          {item.price.toLocaleString('vi-VN')}₫
                        </p>
                        <button
                          disabled={!item.inStock}
                          className={`w-full py-2 rounded-lg transition ${
                            item.inStock
                              ? "bg-black text-white hover:bg-gray-900"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {item.inStock ? "Thêm vào giỏ hàng" : "Hết hàng"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-light">Sổ địa chỉ</h2>
                  <button className="ck-button px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition">
                    Thêm địa chỉ mới
                  </button>
                </div>

                <div className="space-y-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{address.name}</p>
                            {address.isDefault && (
                              <span className="px-2 py-1 bg-rose-100 text-rose-600 text-xs rounded-full">
                                Mặc định
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-1">{address.phone}</p>
                          <p className="text-gray-600">{address.address}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                            Chỉnh sửa
                          </button>
                          {!address.isDefault && (
                            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Tab */}
            {activeTab === "payment" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-serif font-light">Phương thức thanh toán</h2>
                  <button className="ck-button px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition">
                    Thêm thẻ mới
                  </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-12 text-center">
                  <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có phương thức thanh toán nào</h3>
                  <p className="text-gray-600 mb-6">
                    Thêm thẻ tín dụng hoặc thẻ ghi nợ để thanh toán nhanh hơn
                  </p>
                  <button className="ck-button px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition">
                    Thêm thẻ mới
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
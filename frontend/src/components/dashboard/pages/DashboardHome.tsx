import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  ShoppingCart, ChevronUp, Wallet, 
  Package, TrendingUp, Loader2, Users, Clock,
  CheckCircle, XCircle, Truck, AlertCircle, Eye, ArrowRight,
  BarChart3, LineChartIcon, AreaChartIcon, 
  Settings, UserCog, Edit3, Trash2, Star, Bell
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../components/ThemeContext';
import { useLanguage } from '../components/LanguageContext';
import { adminDashboardApi, type DashboardStats, type AuditLog, type LiveFeedItem } from '@/lib/adminApi';
import DateRangePicker, { type DateRange } from '../DateRangePicker';

interface ChartDataPoint {
  name: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  productId: number;
  productName: string;
  price: number;
  totalSold: number;
  orderCount: number;
  totalRevenue?: number;
}

interface OrderStatus {
  status: string;
  count: number;
}

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Chờ xử lý', color: '#f59e0b', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: '#3b82f6', icon: CheckCircle },
  PROCESSING: { label: 'Đang xử lý', color: '#8b5cf6', icon: Package },
  SHIPPED: { label: 'Đang giao', color: '#06b6d4', icon: Truck },
  DELIVERED: { label: 'Đã giao', color: '#10b981', icon: CheckCircle },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444', icon: XCircle },
};

// Config cho các action types
const getActionConfig = (action: string): { 
  label: string; 
  icon: React.ElementType; 
  bgColor: string; 
  textColor: string;
} => {
  const configs: Record<string, { label: string; icon: React.ElementType; bgColor: string; textColor: string }> = {
    // User Management
    UPDATE_USER_ROLE: { label: 'đã thay đổi quyền', icon: UserCog, bgColor: 'bg-purple-100 dark:bg-purple-500/20', textColor: 'text-purple-600 dark:text-purple-400' },
    ACTIVATE_USER: { label: 'đã kích hoạt tài khoản', icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-500/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
    DEACTIVATE_USER: { label: 'đã vô hiệu hóa tài khoản', icon: XCircle, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
    DELETE_USER: { label: 'đã xóa người dùng', icon: Trash2, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
    UNLOCK_USER_ACCOUNT: { label: 'đã mở khóa tài khoản', icon: CheckCircle, bgColor: 'bg-emerald-100 dark:bg-emerald-500/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
    
    // Product Management
    CREATE_PRODUCT: { label: 'đã tạo sản phẩm', icon: Package, bgColor: 'bg-emerald-100 dark:bg-emerald-500/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
    UPDATE_PRODUCT: { label: 'đã cập nhật sản phẩm', icon: Edit3, bgColor: 'bg-blue-100 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' },
    DELETE_PRODUCT: { label: 'đã xóa sản phẩm', icon: Trash2, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
    UPDATE_PRODUCT_PRICE: { label: 'đã thay đổi giá', icon: Wallet, bgColor: 'bg-amber-100 dark:bg-amber-500/20', textColor: 'text-amber-600 dark:text-amber-400' },
    UPDATE_PRODUCT_STOCK: { label: 'đã cập nhật tồn kho', icon: Package, bgColor: 'bg-blue-100 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' },
    
    // Order Management
    UPDATE_ORDER_STATUS: { label: 'đã cập nhật trạng thái đơn hàng', icon: ShoppingCart, bgColor: 'bg-blue-100 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' },
    CANCEL_ORDER: { label: 'đã hủy đơn hàng', icon: XCircle, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
    REFUND_ORDER: { label: 'đã hoàn tiền đơn hàng', icon: Wallet, bgColor: 'bg-amber-100 dark:bg-amber-500/20', textColor: 'text-amber-600 dark:text-amber-400' },
    
    // Category
    CREATE_CATEGORY: { label: 'đã tạo danh mục', icon: Package, bgColor: 'bg-emerald-100 dark:bg-emerald-500/20', textColor: 'text-emerald-600 dark:text-emerald-400' },
    UPDATE_CATEGORY: { label: 'đã cập nhật danh mục', icon: Edit3, bgColor: 'bg-blue-100 dark:bg-blue-500/20', textColor: 'text-blue-600 dark:text-blue-400' },
    DELETE_CATEGORY: { label: 'đã xóa danh mục', icon: Trash2, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
    
    // System Config
    UPDATE_SYSTEM_CONFIG: { label: 'đã thay đổi cấu hình hệ thống', icon: Settings, bgColor: 'bg-slate-100 dark:bg-slate-700', textColor: 'text-slate-600 dark:text-slate-400' },
    DELETE_SYSTEM_CONFIG: { label: 'đã xóa cấu hình', icon: Trash2, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
    
    // Security
    LOGIN_FAILED: { label: 'đăng nhập thất bại nhiều lần', icon: AlertCircle, bgColor: 'bg-red-100 dark:bg-red-500/20', textColor: 'text-red-600 dark:text-red-400' },
    PASSWORD_CHANGE: { label: 'đã thay đổi mật khẩu', icon: Settings, bgColor: 'bg-amber-100 dark:bg-amber-500/20', textColor: 'text-amber-600 dark:text-amber-400' },
    UPDATE_PERMISSIONS: { label: 'đã cập nhật quyền hạn', icon: UserCog, bgColor: 'bg-purple-100 dark:bg-purple-500/20', textColor: 'text-purple-600 dark:text-purple-400' },
  };
  
  return configs[action] || { 
    label: action.toLowerCase().replace(/_/g, ' '), 
    icon: AlertCircle, 
    bgColor: 'bg-slate-100 dark:bg-slate-700', 
    textColor: 'text-slate-600 dark:text-slate-400' 
  };
};

const DashboardHome: React.FC = () => {
  const { isDark } = useTheme();
  useLanguage();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderStatus[]>([]);
  const [recentActivities, setRecentActivities] = useState<AuditLog[]>([]);
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
  
  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: monthStart, endDate: now, preset: 'thisMonth' };
  });
  const [compareEnabled, setCompareEnabled] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Format dates for API
        const startDate = dateRange.startDate.toISOString();
        const endDate = dateRange.endDate.toISOString();
        
        const [statsRes, analyticsRes, activitiesRes, liveFeedRes] = await Promise.all([
          adminDashboardApi.getStats({ startDate, endDate }),
          adminDashboardApi.getAnalytics(undefined, { startDate, endDate }),
          adminDashboardApi.getRecentActivities(10),
          adminDashboardApi.getLiveFeed(10)
        ]);

        if (statsRes.success) {
          setStats(statsRes.data);
        }

        if (analyticsRes.success) {
          // Use the date field from backend (already grouped)
          const chartPoints: ChartDataPoint[] = analyticsRes.data.revenueByDay.map(item => ({
            name: item.date,
            revenue: Math.round(item.totalAmount),
            orders: item.orderCount
          }));

          setChartData(chartPoints);
          setTopProducts(analyticsRes.data.topProducts);
          setOrdersByStatus(analyticsRes.data.ordersByStatus);
        }

        if (activitiesRes.success) {
          setRecentActivities(activitiesRes.data);
        }

        if (liveFeedRes.success) {
          setLiveFeed(liveFeedRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [dateRange]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatShortCurrency = (amount: number): string => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(1)}B`;
    }
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return amount.toString();
  };

  const formatTime = (date: Date): string => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Không thể tải dữ liệu dashboard</p>
      </div>
    );
  }

  const pieData = ordersByStatus.map(item => ({
    name: ORDER_STATUS_CONFIG[item.status]?.label || item.status,
    value: item.count,
    color: ORDER_STATUS_CONFIG[item.status]?.color || '#94a3b8'
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tổng quan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Chào mừng trở lại! Đây là tổng quan hoạt động của bạn.</p>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          compareEnabled={compareEnabled}
          onCompareChange={setCompareEnabled}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Card */}
        <div className="p-5 rounded-2xl shadow-sm relative overflow-hidden bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
              <Wallet size={20} />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={14} className="mr-1" /> +12%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Doanh thu</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{formatShortCurrency(stats.revenue.total)}</h3>
        </div>

        {/* Orders Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl">
              <ShoppingCart size={20} />
            </div>
            <span className="flex items-center text-xs font-medium text-emerald-500">
              <ChevronUp size={14} /> +8%
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Đơn hàng</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.orders.total}</h3>
          {stats.orders.pending > 0 ? (
            <Link 
              href="/dashboard/orders?status=PENDING"
              className="text-xs text-amber-500 hover:text-amber-600 font-medium mt-1 inline-flex items-center gap-1"
            >
              ⚠️ {stats.orders.pending} cần xử lý ngay
            </Link>
          ) : (
            <p className="text-xs text-emerald-500 mt-1">Không có đơn chờ xử lý</p>
          )}
        </div>

        {/* Products Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-xl">
              <Package size={20} />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Sản phẩm</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.products.total}</h3>
          {stats.products.lowStock > 0 ? (
            <Link 
              href="/dashboard/products?filter=lowStock"
              className="text-xs text-red-500 hover:text-red-600 font-medium mt-1 inline-flex items-center gap-1"
            >
              🔴 {stats.products.lowStock} sắp hết hàng
            </Link>
          ) : (
            <p className="text-xs text-slate-400 mt-1">{stats.products.visible} đang hiển thị</p>
          )}
        </div>

        {/* Users Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Khách hàng</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.users.total}</h3>
          {stats.users.newToday > 0 ? (
            <p className="text-xs text-emerald-500 mt-1">+{stats.users.newToday} khách mới hôm nay</p>
          ) : (
            <p className="text-xs text-slate-400 mt-1">{stats.users.active} đang hoạt động</p>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Doanh thu</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Biểu đồ doanh thu theo thời gian</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Chart Type Switcher */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setChartType('area')}
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'area' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                  title="Biểu đồ vùng"
                >
                  <AreaChartIcon size={16} className={chartType === 'area' ? 'text-primary-500' : 'text-slate-500'} />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                  title="Biểu đồ cột"
                >
                  <BarChart3 size={16} className={chartType === 'bar' ? 'text-primary-500' : 'text-slate-500'} />
                </button>
                <button
                  onClick={() => setChartType('line')}
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'line' ? 'bg-white dark:bg-slate-600 shadow-sm' : 'hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                  title="Biểu đồ đường"
                >
                  <LineChartIcon size={16} className={chartType === 'line' ? 'text-primary-500' : 'text-slate-500'} />
                </button>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
                </p>
                <p className="text-xs text-slate-500">Tổng trong kỳ</p>
              </div>
            </div>
          </div>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => formatShortCurrency(v)} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDark ? '#1e293b' : '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2} fill="url(#colorRevenue)" />
                  </AreaChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => formatShortCurrency(v)} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDark ? '#1e293b' : '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                      cursor={{ fill: isDark ? '#334155' : '#f1f5f9' }}
                    />
                    <Bar dataKey="revenue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(v) => formatShortCurrency(v)} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDark ? '#1e293b' : '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#f43f5e" strokeWidth={2} dot={{ fill: '#f43f5e', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <Package size={48} className="mx-auto mb-2 opacity-30" />
                  <p>Chưa có dữ liệu trong khoảng thời gian này</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Trạng thái đơn hàng</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Phân bố theo trạng thái</p>
          
          {pieData.length > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: 'none', 
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                      }}
                      itemStyle={{ color: '#1e293b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {pieData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Đơn hàng gần đây</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">10 đơn hàng mới nhất</p>
            </div>
            <Link href="/dashboard/orders" className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium">
              Xem tất cả <ArrowRight size={16} />
            </Link>
          </div>
          
          {stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Mã đơn</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Khách hàng</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Trạng thái</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.slice(0, 5).map((order) => {
                    const statusConfig = ORDER_STATUS_CONFIG[order.status] || { label: order.status, color: '#94a3b8', icon: AlertCircle };
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={order.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-2">
                          <span className="font-medium text-slate-900 dark:text-white">#{order.orderNumber}</span>
                        </td>
                        <td className="py-3 px-2">
                          <div>
                            <p className="text-sm text-slate-900 dark:text-white">{order.user?.name || 'Khách'}</p>
                            <p className="text-xs text-slate-500">{order.user?.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${statusConfig.color}20`, color: statusConfig.color }}
                          >
                            <StatusIcon size={12} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(order.totalAmount)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <ShoppingCart size={48} className="mx-auto mb-2 opacity-30" />
              <p>Chưa có đơn hàng nào</p>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top sản phẩm</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Bán chạy nhất</p>
            </div>
            <Link href="/dashboard/products" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
              <Eye size={18} />
            </Link>
          </div>
          
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.slice(0, 5).map((product, index) => (
                <div key={product.productId} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                    index === 1 ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                    index === 2 ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' :
                    'bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.productName}</p>
                    <p className="text-xs text-slate-500">{product.totalSold} đã bán</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatShortCurrency(product.totalRevenue || product.price * product.totalSold)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Package size={48} className="mx-auto mb-2 opacity-30" />
              <p>Chưa có dữ liệu</p>
            </div>
          )}
        </div>
      </div>

      {/* Activity & Live Feed Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Activities - System Logs */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hoạt động hệ thống</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Thay đổi từ Admin/Mod</p>
            </div>
            <Link href="/dashboard/audit-logs" className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium">
              Xem tất cả <ArrowRight size={16} />
            </Link>
          </div>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.slice(0, 5).map((activity) => {
                const actionConfig = getActionConfig(activity.action);
                const ActionIcon = actionConfig.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className={`p-2 rounded-lg ${
                      activity.severity === 'CRITICAL' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                      activity.severity === 'WARNING' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' :
                      `${actionConfig.bgColor} ${actionConfig.textColor}`
                    }`}>
                      <ActionIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white">
                        <span className="font-semibold text-primary-600 dark:text-primary-400">
                          {activity.user?.role === 'SUPER_ADMIN' ? 'Super Admin' : activity.user?.role === 'ADMIN' ? 'Admin' : 'Mod'} {activity.user?.name || activity.user?.email?.split('@')[0]}
                        </span>
                        {' '}{actionConfig.label}
                        {activity.resource && (
                          <span className="font-medium text-slate-700 dark:text-slate-300"> {activity.resource}</span>
                        )}
                        {activity.resourceId && (
                          <span className="text-slate-500"> #{activity.resourceId}</span>
                        )}
                      </p>
                      {/* Show old/new value for price changes */}
                      {activity.action.includes('PRICE') && activity.oldValue != null && activity.newValue != null && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Thay đổi: <span className="line-through text-red-500">{formatCurrency(Number(activity.oldValue as number))}</span>
                          {' → '}<span className="text-emerald-600">{formatCurrency(Number(activity.newValue as number))}</span>
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-0.5">{formatTime(activity.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Settings size={48} className="mx-auto mb-2 opacity-30" />
              <p>Chưa có hoạt động nào</p>
            </div>
          )}
        </div>

        {/* Live Feed - Business Events */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Live Feed</h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tin tức kinh doanh</p>
          </div>
          {liveFeed.length > 0 ? (
            <div className="space-y-3">
              {liveFeed.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className={`p-2 rounded-lg ${
                    item.type === 'NEW_ORDER' 
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : item.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                        : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                  }`}>
                    {item.type === 'NEW_ORDER' ? <ShoppingCart size={16} /> : <Star size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatTime(item.createdAt)}</p>
                  </div>
                  {item.type === 'NEW_ORDER' && item.metadata.amount && (
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatShortCurrency(item.metadata.amount)}
                      </p>
                    </div>
                  )}
                  {item.type === 'LOW_RATING_REVIEW' && item.metadata.rating && (
                    <div className="flex items-center gap-0.5">
                      {[...Array(item.metadata.rating)].map((_, i) => (
                        <Star key={i} size={12} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Bell size={48} className="mx-auto mb-2 opacity-30" />
              <p>Chưa có sự kiện nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

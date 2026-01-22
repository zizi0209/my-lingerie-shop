'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line
} from 'recharts';
import {
  Eye, ShoppingCart, CreditCard, TrendingUp, TrendingDown,
  Package, Search, AlertTriangle, RefreshCw, Loader2, 
  Sparkles, Heart, DollarSign, ShoppingBag, Activity,
  ArrowRight, Percent, BarChart3, Users, AlertCircle, Box, Target
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { api } from '@/lib/api';
import DateRangePicker, { type DateRange } from '../DateRangePicker';
import GrowthIndicator from '../GrowthIndicator';
import { dateRangeToPeriod } from '@/lib/dateRangeUtils';

// ============== TYPES ==============
interface OverviewData {
  // Revenue
  grossRevenue: number;
  netRevenue: number;
  revenueChange: number;
  // Orders
  totalOrders: number;
  successOrders: number;
  cancelledOrders: number;
  processingOrders: number;
  // Metrics
  aov: number;
  aovChange: number;
  conversionRate: number;
  sessionToCartRate: number;
  cartToCheckoutRate: number;
  // Traffic
  todayTraffic: number;
  trafficChange: number;
  productViews: number;
  activeUsers: number;
  cartAddsToday: number;
  cartAbandonmentRate: number;
  // For backward compatibility
  todayOrders: number;
  todayRevenue: number;
  averageOrderValue: number;
}

interface FunnelData {
  period: string;
  funnel: {
    views: number;
    addToCart: number;
    viewToCartRate: number;
    checkout: number;
    cartToCheckoutRate: number;
    purchase: number;
    checkoutToPurchaseRate: number;
    overallConversionRate: number;
  };
  insights: string[];
}

interface WishlistData {
  overview: {
    totalAdds: number;
    totalRemoves: number;
    netChange: number;
    currentTotalItems: number;
    conversionRate: number;
  };
  topProducts: Array<{
    productId: number;
    name: string;
    slug?: string;
    price: number;
    image?: string;
    category?: string;
    adds: number;
    removes: number;
    netScore: number;
    retentionRate: number;
  }>;
  insights: string[];
}

interface SearchKeyword {
  keyword: string;
  count: number;
  avgResults: number;
  hasProducts: boolean;
}

interface AbandonedCartData {
  totalAbandoned: number;
  totalAbandonedValue: number;
  carts: Array<{
    id: number;
    itemCount: number;
    totalValue: number;
    lastUpdated: string;
  }>;
}

interface SizeHeatmapData {
  sizes: string[];
  categories: Array<{
    categoryId: string;
    categoryName: string;
    totalSold: number;
    sizes: Record<string, { count: number; revenue: number }>;
  }>;
  maxCount: number;
}

interface ReturnBySizeData {
  sizeData: Array<{
    size: string;
    totalSold: number;
    cancelled: number;
    returned: number;
    cancelRate: number;
    returnRate: number;
    problemRate: number;
  }>;
  problematicSizes: Array<{ size: string; rate: number; suggestion: string }>;
  insights: string[];
}

interface LowStockItem {
  id: number;
  name: string;
  size: string;
  color: string;
  stock: number;
  image?: string;
}

interface RecommendationData {
  overview: {
    totalClicks: number;
    purchasedFromRec: number;
    ctr: number;
    conversionRate: number;
    revenueFromRec: number;
    revenueContribution: number;
    recViews: number;
  };
  algorithmStats: Array<{ algorithm: string; clicks: number; label: string }>;
  sourceStats: Array<{ source: string; views: number; label: string }>;
  insights: string[];
}

interface BoughtTogetherPair {
  coBuyCount: number;
  product1: { id: number; name: string; price: number; image?: string; category?: string } | null;
  product2: { id: number; name: string; price: number; image?: string; category?: string } | null;
  bundleSuggestion: { originalPrice: number; suggestedPrice: number; discount: number };
}

interface TrafficByHour {
  hour: string;
  views: number;
}

// ============== CONSTANTS ==============
const CHART_COLORS = {
  primary: '#f43f5e',
  secondary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
};

const FUNNEL_COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#10b981'];

// ============== MAIN COMPONENT ==============
const Tracking: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'behavior' | 'product' | 'ai'>('overview');
  
  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const last7 = new Date(now);
    last7.setDate(last7.getDate() - 7);
    return { startDate: last7, endDate: now, preset: 'last7days' };
  });
  const [compareEnabled, setCompareEnabled] = useState(false);

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [wishlistData, setWishlistData] = useState<WishlistData | null>(null);
  const [searchKeywords, setSearchKeywords] = useState<SearchKeyword[]>([]);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartData | null>(null);
  const [sizeHeatmap, setSizeHeatmap] = useState<SizeHeatmapData | null>(null);
  const [returnBySize, setReturnBySize] = useState<ReturnBySizeData | null>(null);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recData, setRecData] = useState<RecommendationData | null>(null);
  const [boughtTogether, setBoughtTogether] = useState<BoughtTogetherPair[]>([]);
  const [trafficByHour, setTrafficByHour] = useState<TrafficByHour[]>([]);

  // ============== FETCH DATA ==============
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Convert date range to period using utility function
      const period = dateRangeToPeriod(dateRange);
      
      // Format dates for API
      const startDate = dateRange.startDate.toISOString();
      const endDate = dateRange.endDate.toISOString();
      
      interface ApiResponse<T> {
        success: boolean;
        data: T;
      }

      const results = await Promise.allSettled([
        api.get(`/admin/analytics/overview?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`) as Promise<ApiResponse<OverviewData>>,
        api.get(`/admin/analytics/funnel?period=${period}`) as Promise<ApiResponse<FunnelData>>,
        api.get(`/admin/analytics/wishlist?period=${period}`) as Promise<ApiResponse<WishlistData>>,
        api.get(`/admin/analytics/search-keywords?period=${period}`) as Promise<ApiResponse<{ topKeywords: SearchKeyword[] }>>,
        api.get('/admin/analytics/abandoned-carts?limit=5') as Promise<ApiResponse<AbandonedCartData>>,
        api.get(`/admin/analytics/size-heatmap?period=${period}`) as Promise<ApiResponse<SizeHeatmapData>>,
        api.get('/admin/analytics/return-by-size?period=90days') as Promise<ApiResponse<ReturnBySizeData>>,
        api.get('/admin/analytics/low-stock?limit=10') as Promise<ApiResponse<{ items: LowStockItem[] }>>,
        api.get(`/admin/analytics/recommendation-effectiveness?period=${period}`) as Promise<ApiResponse<RecommendationData>>,
        api.get('/admin/analytics/bought-together?period=90days') as Promise<ApiResponse<{ pairs: BoughtTogetherPair[] }>>,
        api.get(`/admin/analytics/traffic-by-hour?period=${period}`) as Promise<ApiResponse<{ trafficByHour: TrafficByHour[] }>>,
      ]);

      // Process results safely
      if (results[0].status === 'fulfilled' && results[0].value.success) {
        setOverview(results[0].value.data);
      }
      if (results[1].status === 'fulfilled' && results[1].value.success) {
        setFunnel(results[1].value.data);
      }
      if (results[2].status === 'fulfilled' && results[2].value.success) {
        setWishlistData(results[2].value.data);
      }
      if (results[3].status === 'fulfilled' && results[3].value.success) {
        setSearchKeywords(results[3].value.data.topKeywords || []);
      }
      if (results[4].status === 'fulfilled' && results[4].value.success) {
        setAbandonedCarts(results[4].value.data);
      }
      if (results[5].status === 'fulfilled' && results[5].value.success) {
        setSizeHeatmap(results[5].value.data);
      }
      if (results[6].status === 'fulfilled' && results[6].value.success) {
        setReturnBySize(results[6].value.data);
      }
      if (results[7].status === 'fulfilled' && results[7].value.success) {
        setLowStock(results[7].value.data.items || []);
      }
      if (results[8].status === 'fulfilled' && results[8].value.success) {
        setRecData(results[8].value.data);
      }
      if (results[9].status === 'fulfilled' && results[9].value.success) {
        setBoughtTogether(results[9].value.data.pairs || []);
      }
      if (results[10].status === 'fulfilled' && results[10].value.success) {
        setTrafficByHour(results[10].value.data.trafficByHour || []);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // ============== HELPERS ==============
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toLocaleString('vi-VN');
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Prepare funnel data
  const funnelChartData = funnel ? [
    { name: 'Xem SP', value: funnel.funnel.views, fill: FUNNEL_COLORS[0] },
    { name: 'Thêm giỏ', value: funnel.funnel.addToCart, fill: FUNNEL_COLORS[1] },
    { name: 'Checkout', value: funnel.funnel.checkout, fill: FUNNEL_COLORS[2] },
    { name: 'Mua hàng', value: funnel.funnel.purchase, fill: FUNNEL_COLORS[3] },
  ] : [];

  // ============== LOADING STATE ==============
  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // ============== RENDER ==============
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Theo dõi hiệu suất kinh doanh và hành vi khách hàng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            compareEnabled={compareEnabled}
            onCompareChange={setCompareEnabled}
          />
          {overview && (
            <div className="hidden sm:flex items-center text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              {overview.activeUsers} online
            </div>
          )}
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
        {[
          { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
          { id: 'behavior', label: 'Hành vi & Phễu', icon: Activity },
          { id: 'product', label: 'Sản phẩm & Size', icon: Package },
          { id: 'ai', label: 'Hiệu quả AI', icon: Sparkles },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB 1: OVERVIEW ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Card */}
            <KPICard
              icon={DollarSign}
              label="Doanh thu"
              value={formatCurrency(overview?.todayRevenue || overview?.grossRevenue || 0)}
              suffix="đ"
              change={overview?.revenueChange || overview?.trafficChange}
              color="emerald"
              sublabel={overview?.netRevenue ? `Thuần: ${formatCurrency(overview.netRevenue)}đ` : undefined}
            />
            
            {/* Orders Card */}
            <KPICard
              icon={ShoppingBag}
              label="Đơn hàng"
              value={(overview?.todayOrders || overview?.totalOrders || 0).toString()}
              color="blue"
              sublabel={overview?.successOrders !== undefined 
                ? `✓${overview.successOrders} | ✗${overview.cancelledOrders || 0} | ⏳${overview.processingOrders || 0}` 
                : undefined}
            />
            
            {/* AOV Card */}
            <KPICard
              icon={CreditCard}
              label="Giá trị TB/Đơn"
              value={formatCurrency(overview?.averageOrderValue || overview?.aov || 0)}
              suffix="đ"
              change={overview?.aovChange}
              color="purple"
            />
            
            {/* Conversion Card */}
            <KPICard
              icon={Percent}
              label="Tỉ lệ chuyển đổi"
              value={`${overview?.conversionRate || 0}%`}
              color="rose"
              sublabel={overview?.sessionToCartRate !== undefined 
                ? `Xem→Giỏ: ${overview.sessionToCartRate}%` 
                : undefined}
            />
          </div>

          {/* Main Chart - Revenue/Traffic by Hour */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lưu lượng theo giờ</h3>
                <p className="text-sm text-slate-500">Phân bố traffic trong ngày</p>
              </div>
              <Eye className="text-slate-400" size={20} />
            </div>
            
            {trafficByHour.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trafficByHour}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke={CHART_COLORS.primary} 
                    fillOpacity={1} 
                    fill="url(#colorViews)" 
                    strokeWidth={2}
                    name="Lượt xem"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-400">
                <p>Chưa có dữ liệu traffic</p>
              </div>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickStat 
              label="Lượt xem SP" 
              value={formatNumber(overview?.productViews || 0)}
              icon={Eye}
            />
            <QuickStat 
              label="Thêm giỏ hàng" 
              value={formatNumber(overview?.cartAddsToday || 0)}
              icon={ShoppingCart}
            />
            <QuickStat 
              label="Tỉ lệ bỏ giỏ" 
              value={`${overview?.cartAbandonmentRate || 0}%`}
              icon={AlertTriangle}
              warning={(overview?.cartAbandonmentRate || 0) > 70}
            />
            <QuickStat 
              label="Users online" 
              value={formatNumber(overview?.activeUsers || 0)}
              icon={Users}
            />
          </div>
        </div>
      )}

      {/* ===== TAB 2: BEHAVIOR & FUNNEL ===== */}
      {activeTab === 'behavior' && (
        <div className="space-y-6">
          {/* Sales Funnel - Main visualization */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Phễu chuyển đổi</h3>
                <p className="text-sm text-slate-500">Hành trình từ xem → mua hàng</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">{funnel?.funnel.overallConversionRate || 0}%</p>
                <p className="text-xs text-slate-500">Tổng chuyển đổi</p>
              </div>
            </div>

            {/* Funnel Visualization */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {funnelChartData.map((stage, index) => {
                const prevValue = index > 0 ? funnelChartData[index - 1].value : stage.value;
                const dropRate = prevValue > 0 ? Math.round((1 - stage.value / prevValue) * 100) : 0;
                const width = funnelChartData[0].value > 0 
                  ? Math.max(40, (stage.value / funnelChartData[0].value) * 100) 
                  : 100;

                return (
                  <div key={stage.name} className="flex flex-col items-center">
                    <div 
                      className="h-20 sm:h-24 rounded-xl flex flex-col items-center justify-center text-white font-bold transition-all relative"
                      style={{ backgroundColor: stage.fill, width: `${width}%`, minWidth: '50px' }}
                    >
                      <span className="text-lg sm:text-xl">{formatNumber(stage.value)}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2 text-center">
                      {stage.name}
                    </p>
                    {index > 0 && dropRate > 0 && (
                      <p className="text-xs text-red-500 flex items-center gap-0.5 mt-1">
                        <TrendingDown size={10} /> {dropRate}%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Conversion Rates Breakdown */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{funnel?.funnel.viewToCartRate || 0}%</p>
                <p className="text-xs text-slate-500">Xem → Giỏ</p>
              </div>
              <div className="text-center border-x border-slate-200 dark:border-slate-700">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{funnel?.funnel.cartToCheckoutRate || 0}%</p>
                <p className="text-xs text-slate-500">Giỏ → Checkout</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{funnel?.funnel.checkoutToPurchaseRate || 0}%</p>
                <p className="text-xs text-slate-500">Checkout → Mua</p>
              </div>
            </div>

            {/* Insights */}
            {funnel?.insights && funnel.insights.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">💡 Insights</p>
                {funnel.insights.map((insight, i) => (
                  <p key={i} className="text-sm text-amber-600 dark:text-amber-400">{insight}</p>
                ))}
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Wishlist Analytics */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Wishlist Analytics</h3>
                  <p className="text-sm text-slate-500">SP được yêu thích nhiều nhưng chưa mua</p>
                </div>
                <Heart className="text-rose-500" size={20} />
              </div>

              {/* Wishlist Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-center">
                  <p className="text-xl font-bold text-rose-600">{wishlistData?.overview.totalAdds || 0}</p>
                  <p className="text-xs text-slate-500">Thêm yêu thích</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-xl text-center">
                  <p className="text-xl font-bold text-slate-700 dark:text-slate-200">{wishlistData?.overview.currentTotalItems || 0}</p>
                  <p className="text-xs text-slate-500">Tổng hiện tại</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-center">
                  <p className="text-xl font-bold text-emerald-600">{wishlistData?.overview.conversionRate || 0}%</p>
                  <p className="text-xs text-slate-500">Chuyển đổi</p>
                </div>
              </div>

              {/* Top Wishlist Products */}
              {wishlistData?.topProducts && wishlistData.topProducts.length > 0 ? (
                <div className="space-y-2">
                  {wishlistData.topProducts.slice(0, 5).map((product, idx) => (
                    <div key={product.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {product.image ? (
                        <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(product.price)}đ</p>
                      </div>
                      <span className="text-sm font-bold text-rose-500">❤️ {product.netScore}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Heart size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có dữ liệu wishlist</p>
                </div>
              )}
            </div>

            {/* Abandoned Carts */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Giỏ hàng bỏ quên</h3>
                  <p className="text-sm text-slate-500">Doanh thu tiềm năng đang bị "kẹt"</p>
                </div>
                <ShoppingCart className="text-amber-500" size={20} />
              </div>

              {/* Abandoned Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">{abandonedCarts?.totalAbandoned || 0}</p>
                  <p className="text-xs text-slate-500">Giỏ bị bỏ (24h)</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-500/10 rounded-xl">
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(abandonedCarts?.totalAbandonedValue || 0)}đ</p>
                  <p className="text-xs text-slate-500">Doanh thu tiềm năng</p>
                </div>
              </div>

              {/* Cart Abandonment Rate */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Tỉ lệ bỏ giỏ</span>
                  <span className={`text-lg font-bold ${(overview?.cartAbandonmentRate || 0) > 70 ? 'text-red-500' : 'text-amber-500'}`}>
                    {overview?.cartAbandonmentRate || 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${(overview?.cartAbandonmentRate || 0) > 70 ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(overview?.cartAbandonmentRate || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {(overview?.cartAbandonmentRate || 0) > 70 
                    ? '⚠️ Cao! Kiểm tra phí ship hoặc UX checkout' 
                    : '✓ Mức chấp nhận được'}
                </p>
              </div>
            </div>
          </div>

          {/* Search Keywords */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Từ khóa tìm kiếm</h3>
                <p className="text-sm text-slate-500">Khách hàng đang tìm gì?</p>
              </div>
              <Search className="text-blue-500" size={20} />
            </div>

            {searchKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {searchKeywords.slice(0, 20).map((kw) => {
                  const size = Math.max(12, Math.min(18, 12 + kw.count / 15));
                  return (
                    <span
                      key={kw.keyword}
                      className={`px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105 cursor-default ${
                        kw.hasProducts
                          ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                          : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                      }`}
                      style={{ fontSize: `${size}px` }}
                      title={`${kw.count} lượt | ${kw.hasProducts ? 'Có SP' : 'Không có SP!'}`}
                    >
                      {kw.keyword}
                      {!kw.hasProducts && ' 🔴'}
                    </span>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Search size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có dữ liệu tìm kiếm</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB 3: PRODUCT & SIZE INTELLIGENCE ===== */}
      {activeTab === 'product' && (
        <div className="space-y-6">
          {/* Size Heatmap - Main Feature */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ma trận Size theo Danh mục</h3>
                <p className="text-sm text-slate-500">Heatmap phân bố size bán chạy - Quyết định nhập hàng</p>
              </div>
              <Package className="text-purple-500" size={24} />
            </div>

            {sizeHeatmap && sizeHeatmap.categories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-3 px-3 font-medium text-slate-500">Danh mục</th>
                      {sizeHeatmap.sizes.map(size => (
                        <th key={size} className="text-center py-3 px-2 font-medium text-slate-500 min-w-[50px]">{size}</th>
                      ))}
                      <th className="text-right py-3 px-3 font-medium text-slate-500">Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeHeatmap.categories.slice(0, 8).map((cat) => (
                      <tr key={cat.categoryId} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{cat.categoryName}</td>
                        {sizeHeatmap.sizes.map(size => {
                          const data = cat.sizes[size] || { count: 0 };
                          const intensity = sizeHeatmap.maxCount > 0 ? data.count / sizeHeatmap.maxCount : 0;
                          return (
                            <td key={size} className="py-2 px-2 text-center">
                              <div
                                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-xs font-bold transition-all"
                                style={{
                                  backgroundColor: data.count > 0 ? `rgba(139, 92, 246, ${0.15 + intensity * 0.7})` : 'transparent',
                                  color: intensity > 0.4 ? 'white' : intensity > 0 ? '#7c3aed' : '#94a3b8'
                                }}
                                title={data.count > 0 ? `${data.count} đã bán` : 'Chưa bán'}
                              >
                                {data.count || '-'}
                              </div>
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">{cat.totalSold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Package size={40} className="mx-auto mb-2 opacity-30" />
                <p>Chưa có dữ liệu size</p>
              </div>
            )}
          </div>

          {/* Two Column: Return Rate + Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Return Rate by Size */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tỉ lệ hoàn hàng theo Size</h3>
                  <p className="text-sm text-slate-500">Size nào hay bị trả/hủy?</p>
                </div>
                <AlertTriangle className="text-amber-500" size={20} />
              </div>

              {/* Problematic Sizes Alert */}
              {returnBySize?.problematicSizes && returnBySize.problematicSizes.length > 0 && (
                <div className="mb-4 space-y-2">
                  {returnBySize.problematicSizes.slice(0, 3).map((ps) => (
                    <div key={ps.size} className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="text-red-500" size={16} />
                          <span className="font-bold text-red-700 dark:text-red-400">Size {ps.size}</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">{ps.rate}%</span>
                      </div>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{ps.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Size Data Table */}
              {returnBySize?.sizeData && returnBySize.sizeData.length > 0 ? (
                <div className="space-y-2">
                  {returnBySize.sizeData.slice(0, 6).map((row) => (
                    <div key={row.size} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{row.size}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500">{row.totalSold} bán</span>
                        <span className={`font-bold ${row.problemRate > 15 ? 'text-red-500' : row.problemRate > 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {row.problemRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa đủ dữ liệu</p>
                </div>
              )}
            </div>

            {/* Low Stock Alert */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tồn kho báo động</h3>
                  <p className="text-sm text-slate-500">Sản phẩm/size sắp hết hàng</p>
                </div>
                <Box className="text-red-500" size={20} />
              </div>

              {lowStock.length > 0 ? (
                <div className="space-y-2">
                  {lowStock.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-red-50 dark:bg-red-500/10">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.size} • {item.color}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        item.stock <= 2 ? 'bg-red-500 text-white' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.stock} còn
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Box size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tất cả sản phẩm đều đủ hàng</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB 4: AI PERFORMANCE ===== */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          {/* AI Revenue Attribution - Main KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-2xl text-white">
              <Sparkles size={24} className="mb-3 opacity-80" />
              <p className="text-3xl font-bold">{recData?.overview.revenueContribution || 0}%</p>
              <p className="text-sm opacity-80">Đóng góp doanh thu từ AI</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Target size={24} className="mb-3 text-blue-500" />
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{recData?.overview.ctr || 0}%</p>
              <p className="text-sm text-slate-500">CTR gợi ý sản phẩm</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <ShoppingCart size={24} className="mb-3 text-emerald-500" />
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{recData?.overview.purchasedFromRec || 0}</p>
              <p className="text-sm text-slate-500">Đơn từ gợi ý AI</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <DollarSign size={24} className="mb-3 text-amber-500" />
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(recData?.overview.revenueFromRec || 0)}đ</p>
              <p className="text-sm text-slate-500">Doanh thu từ AI</p>
            </div>
          </div>

          {/* AI Insights */}
          {recData?.insights && recData.insights.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 p-4 rounded-2xl border border-purple-200 dark:border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="text-purple-500" size={18} />
                <span className="font-medium text-purple-700 dark:text-purple-300">AI Insights</span>
              </div>
              <ul className="space-y-1">
                {recData.insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">{insight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Two Column: Algorithm Stats + Top AI Pairs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Algorithm Performance */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hiệu suất thuật toán</h3>
                  <p className="text-sm text-slate-500">Loại gợi ý nào hiệu quả nhất?</p>
                </div>
                <Sparkles className="text-purple-500" size={20} />
              </div>

              {recData?.algorithmStats && recData.algorithmStats.length > 0 ? (
                <div className="space-y-3">
                  {recData.algorithmStats.map((algo, idx) => {
                    const maxClicks = Math.max(...recData.algorithmStats.map(a => a.clicks));
                    const percentage = maxClicks > 0 ? (algo.clicks / maxClicks) * 100 : 0;
                    return (
                      <div key={algo.algorithm}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700 dark:text-slate-300">{algo.label}</span>
                          <span className="font-bold text-slate-900 dark:text-white">{algo.clicks} clicks</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: Object.values(CHART_COLORS)[idx % 6]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa có dữ liệu recommendation</p>
                </div>
              )}
            </div>

            {/* Top AI Pairs - Bought Together */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top AI Pairs</h3>
                  <p className="text-sm text-slate-500">Combo sản phẩm AI phát hiện</p>
                </div>
                <ArrowRight className="text-emerald-500" size={20} />
              </div>

              {boughtTogether.length > 0 ? (
                <div className="space-y-3">
                  {boughtTogether.slice(0, 4).map((pair, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex -space-x-2">
                          {pair.product1?.image ? (
                            <img src={pair.product1.image} alt="" className="w-8 h-8 rounded-lg object-cover border-2 border-white dark:border-slate-800" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
                          )}
                          {pair.product2?.image ? (
                            <img src={pair.product2.image} alt="" className="w-8 h-8 rounded-lg object-cover border-2 border-white dark:border-slate-800" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
                            {pair.product1?.name} + {pair.product2?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500">{pair.coBuyCount} đơn mua cùng</span>
                        <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">
                          -{pair.bundleSuggestion.discount}% Bundle
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Chưa đủ dữ liệu combo</p>
                </div>
              )}
            </div>
          </div>

          {/* Traffic Sources from AI */}
          {recData?.sourceStats && recData.sourceStats.length > 0 && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nguồn traffic sản phẩm</h3>
                  <p className="text-sm text-slate-500">Khách đến từ đâu?</p>
                </div>
                <Eye className="text-blue-500" size={20} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recData.sourceStats.slice(0, 4).map((source, idx) => (
                  <div key={source.source} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formatNumber(source.views)}</p>
                    <p className="text-xs text-slate-500">{source.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============== SUB COMPONENTS ==============

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  suffix?: string;
  change?: number;
  color: 'emerald' | 'blue' | 'purple' | 'rose' | 'amber';
  sublabel?: string;
}

const KPICard: React.FC<KPICardProps> = ({ icon: Icon, label, value, suffix, change, color, sublabel }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className={`p-2.5 w-fit rounded-xl ${colorClasses[color]} mb-3`}>
        <Icon size={20} />
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
      {change !== undefined && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {change >= 0 ? '+' : ''}{change}% vs hôm qua
        </p>
      )}
      {sublabel && (
        <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
      )}
    </div>
  );
};

interface QuickStatProps {
  label: string;
  value: string;
  icon: React.ElementType;
  warning?: boolean;
}

const QuickStat: React.FC<QuickStatProps> = ({ label, value, icon: Icon, warning }) => (
  <div className={`p-4 rounded-xl flex items-center gap-3 ${warning ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
    <Icon size={18} className={warning ? 'text-amber-500' : 'text-slate-400'} />
    <div>
      <p className={`text-lg font-bold ${warning ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  </div>
);

export default Tracking;

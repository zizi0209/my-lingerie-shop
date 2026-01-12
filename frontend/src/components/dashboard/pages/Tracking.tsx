'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, FunnelChart, Funnel, LabelList
} from 'recharts';
import {
  Eye, ShoppingCart, CreditCard, CheckCircle, TrendingUp, TrendingDown,
  Users, Package, Search, AlertTriangle, RefreshCw, Filter,
  ArrowDown, Loader2, Tag, Sparkles, Target, Link2, Heart
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { api } from '@/lib/api';

// Types
interface OverviewData {
  todayTraffic: number;
  trafficChange: number;
  productViews: number;
  conversionRate: number;
  todayOrders: number;
  todayRevenue: number;
  averageOrderValue: number;
  cartAbandonmentRate: number;
  activeUsers: number;
  cartAddsToday: number;
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

interface SizeData {
  totalSold: number;
  totalRevenue: number;
  sizes: Array<{ size: string; count: number; percentage: number; revenue: number }>;
  colors: Array<{ color: string; count: number; percentage: number; revenue: number }>;
  topSize: string;
  topColor: string;
}

interface SearchKeyword {
  keyword: string;
  count: number;
  avgResults: number;
  hasProducts: boolean;
}

interface AbandonedProduct {
  id: number;
  name: string;
  price: number;
  image?: string;
  views: number;
  sold: number;
  possibleReasons: string[];
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

interface ColorTrendData {
  topColors: string[];
  trendData: Array<Record<string, string | number>>;
  colorStats: Array<{ color: string; count: number; percentage: number }>;
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

interface CoViewedPair {
  coViewCount: number;
  product1: { id: number; name: string; price: number; image?: string; category?: string } | null;
  product2: { id: number; name: string; price: number; image?: string; category?: string } | null;
  comboSuggestion: string | null;
  comboPotentialPrice: number;
}

interface BoughtTogetherPair {
  coBuyCount: number;
  product1: { id: number; name: string; price: number; image?: string; category?: string } | null;
  product2: { id: number; name: string; price: number; image?: string; category?: string } | null;
  bundleSuggestion: { originalPrice: number; suggestedPrice: number; discount: number };
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

const COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#be123c'];
const SIZE_COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#7c3aed'];
const COLOR_CHART_COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

const Tracking: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24hours' | '7days' | '30days'>('7days');

  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [sizeData, setSizeData] = useState<SizeData | null>(null);
  const [searchKeywords, setSearchKeywords] = useState<SearchKeyword[]>([]);
  const [opportunities, setOpportunities] = useState<Array<{ keyword: string; searchCount: number }>>([]);
  const [abandonedProducts, setAbandonedProducts] = useState<AbandonedProduct[]>([]);
  
  // Phase 2 states
  const [sizeHeatmap, setSizeHeatmap] = useState<SizeHeatmapData | null>(null);
  const [colorTrends, setColorTrends] = useState<ColorTrendData | null>(null);
  const [returnBySize, setReturnBySize] = useState<ReturnBySizeData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'size-intel' | 'behavior' | 'ai-rec' | 'wishlist'>('overview');
  
  // Phase 4 states - AI Recommendation
  const [recData, setRecData] = useState<RecommendationData | null>(null);
  const [coViewedPairs, setCoViewedPairs] = useState<CoViewedPair[]>([]);
  const [boughtTogether, setBoughtTogether] = useState<BoughtTogetherPair[]>([]);
  
  // Wishlist analytics
  const [wishlistData, setWishlistData] = useState<WishlistData | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      interface ApiResponse<T> {
        success: boolean;
        data: T;
      }

      const [overviewRes, funnelRes, sizeRes, searchRes, abandonedRes, heatmapRes, colorRes, returnRes, recRes, coViewRes, boughtRes, wishlistRes] = await Promise.all([
        api.get('/admin/analytics/overview') as Promise<ApiResponse<OverviewData>>,
        api.get(`/admin/analytics/funnel?period=${period}`) as Promise<ApiResponse<FunnelData>>,
        api.get(`/admin/analytics/size-distribution?period=${period}`) as Promise<ApiResponse<SizeData>>,
        api.get(`/admin/analytics/search-keywords?period=${period}`) as Promise<ApiResponse<{ topKeywords: SearchKeyword[]; opportunities: Array<{ keyword: string; searchCount: number }> }>>,
        api.get(`/admin/analytics/high-view-no-buy?period=${period}`) as Promise<ApiResponse<{ products: AbandonedProduct[] }>>,
        api.get(`/admin/analytics/size-heatmap?period=${period}`) as Promise<ApiResponse<SizeHeatmapData>>,
        api.get(`/admin/analytics/color-trends?period=${period}`) as Promise<ApiResponse<ColorTrendData>>,
        api.get(`/admin/analytics/return-by-size?period=90days`) as Promise<ApiResponse<ReturnBySizeData>>,
        api.get(`/admin/analytics/recommendation-effectiveness?period=${period}`) as Promise<ApiResponse<RecommendationData>>,
        api.get(`/admin/analytics/co-viewed-products?period=${period}`) as Promise<ApiResponse<{ pairs: CoViewedPair[] }>>,
        api.get(`/admin/analytics/bought-together?period=90days`) as Promise<ApiResponse<{ pairs: BoughtTogetherPair[] }>>,
        api.get(`/admin/analytics/wishlist?period=${period}`) as Promise<ApiResponse<WishlistData>>
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (funnelRes.success) setFunnel(funnelRes.data);
      if (sizeRes.success) setSizeData(sizeRes.data);
      if (searchRes.success) {
        setSearchKeywords(searchRes.data.topKeywords || []);
        setOpportunities(searchRes.data.opportunities || []);
      }
      if (abandonedRes.success) setAbandonedProducts(abandonedRes.data.products || []);
      if (heatmapRes.success) setSizeHeatmap(heatmapRes.data);
      if (colorRes.success) setColorTrends(colorRes.data);
      if (returnRes.success) setReturnBySize(returnRes.data);
      if (recRes.success) setRecData(recRes.data);
      if (coViewRes.success) setCoViewedPairs(coViewRes.data.pairs || []);
      if (boughtRes.success) setBoughtTogether(boughtRes.data.pairs || []);
      if (wishlistRes.success) setWishlistData(wishlistRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

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

  // Prepare funnel chart data
  const funnelChartData = funnel ? [
    { name: 'Xem sản phẩm', value: funnel.funnel.views, fill: '#f43f5e' },
    { name: 'Thêm giỏ hàng', value: funnel.funnel.addToCart, fill: '#fb7185' },
    { name: 'Thanh toán', value: funnel.funnel.checkout, fill: '#fda4af' },
    { name: 'Mua hàng', value: funnel.funnel.purchase, fill: '#10b981' },
  ] : [];

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Phân tích & Insights
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Theo dõi hành vi khách hàng và hiệu suất bán hàng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium"
          >
            <option value="24hours">24 giờ qua</option>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
          </select>
          {overview && (
            <div className="flex items-center text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              {overview.activeUsers} online
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        {[
          { id: 'overview', label: 'Tổng quan', icon: Eye },
          { id: 'size-intel', label: 'Phân tích Size', icon: Package },
          { id: 'behavior', label: 'Hành vi', icon: Search },
          { id: 'ai-rec', label: 'AI & Gợi ý', icon: Sparkles },
          { id: 'wishlist', label: 'Wishlist', icon: Heart },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Row 1: Overview Stats - Always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Eye}
          label="Lượt xem"
          value={formatNumber(overview?.todayTraffic || 0)}
          change={overview?.trafficChange}
          color="rose"
        />
        <StatCard
          icon={ShoppingCart}
          label="Thêm giỏ"
          value={formatNumber(overview?.cartAddsToday || 0)}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Tỉ lệ chuyển đổi"
          value={`${overview?.conversionRate || 0}%`}
          color="purple"
        />
        <StatCard
          icon={Package}
          label="Đơn hôm nay"
          value={overview?.todayOrders?.toString() || '0'}
          color="emerald"
        />
        <StatCard
          icon={CreditCard}
          label="Doanh thu"
          value={formatCurrency(overview?.todayRevenue || 0)}
          suffix="đ"
          color="amber"
        />
      </div>

      {/* TAB: Size Intelligence */}
      {activeTab === 'size-intel' && (
        <div className="space-y-6">
          {/* Size Heatmap by Category */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Size Heatmap theo Danh mục</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Phân bố size bán chạy theo từng category</p>
              </div>
              <Package className="text-purple-500" size={24} />
            </div>

            {sizeHeatmap && sizeHeatmap.categories.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Danh mục</th>
                      {sizeHeatmap.sizes.map(size => (
                        <th key={size} className="text-center py-2 px-3 font-medium text-slate-500 dark:text-slate-400">{size}</th>
                      ))}
                      <th className="text-right py-2 px-3 font-medium text-slate-500 dark:text-slate-400">Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sizeHeatmap.categories.slice(0, 10).map((cat) => (
                      <tr key={cat.categoryId} className="border-t border-slate-100 dark:border-slate-700">
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{cat.categoryName}</td>
                        {sizeHeatmap.sizes.map(size => {
                          const data = cat.sizes[size] || { count: 0 };
                          const intensity = sizeHeatmap.maxCount > 0 ? data.count / sizeHeatmap.maxCount : 0;
                          return (
                            <td key={size} className="py-3 px-3 text-center">
                              <div
                                className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-xs font-bold"
                                style={{
                                  backgroundColor: data.count > 0 ? `rgba(244, 63, 94, ${0.1 + intensity * 0.7})` : 'transparent',
                                  color: intensity > 0.4 ? 'white' : intensity > 0 ? '#be123c' : '#94a3b8'
                                }}
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

          {/* Color Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Xu hướng màu sắc</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Top màu bán chạy theo thời gian</p>
                </div>
              </div>

              {colorTrends && colorTrends.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={colorTrends.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip />
                    {colorTrends.topColors.map((color, idx) => (
                      <Area
                        key={color}
                        type="monotone"
                        dataKey={color}
                        stackId="1"
                        stroke={COLOR_CHART_COLORS[idx % COLOR_CHART_COLORS.length]}
                        fill={COLOR_CHART_COLORS[idx % COLOR_CHART_COLORS.length]}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  <p>Chưa có dữ liệu</p>
                </div>
              )}
            </div>

            {/* Color Distribution */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Phân bố màu sắc</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Top màu được yêu thích</p>
                </div>
              </div>

              {colorTrends && colorTrends.colorStats.length > 0 ? (
                <div className="space-y-3">
                  {colorTrends.colorStats.map((cs, idx) => (
                    <div key={cs.color} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLOR_CHART_COLORS[idx % COLOR_CHART_COLORS.length] }}
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{cs.color}</span>
                      <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cs.percentage}%`,
                            backgroundColor: COLOR_CHART_COLORS[idx % COLOR_CHART_COLORS.length]
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white w-12 text-right">{cs.percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400">
                  <p>Chưa có dữ liệu</p>
                </div>
              )}
            </div>
          </div>

          {/* Return by Size Analysis */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Phân tích hủy/trả theo Size</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Size nào có tỉ lệ vấn đề cao?</p>
              </div>
              <AlertTriangle className="text-amber-500" size={24} />
            </div>

            {returnBySize && returnBySize.insights.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm">
                {returnBySize.insights.map((insight, idx) => (
                  <p key={idx} className="text-slate-700 dark:text-slate-300">{insight}</p>
                ))}
              </div>
            )}

            {/* Problematic Sizes Alert */}
            {returnBySize && returnBySize.problematicSizes.length > 0 && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {returnBySize.problematicSizes.map((ps) => (
                  <div key={ps.size} className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="text-red-500" size={16} />
                      <span className="font-bold text-red-700 dark:text-red-400">Size {ps.size}</span>
                      <span className="ml-auto text-lg font-bold text-red-600">{ps.rate}%</span>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400">{ps.suggestion}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Size Data Table */}
            {returnBySize && returnBySize.sizeData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-3 font-medium text-slate-500">Size</th>
                      <th className="text-right py-3 px-3 font-medium text-slate-500">Đã bán</th>
                      <th className="text-right py-3 px-3 font-medium text-slate-500">Hủy</th>
                      <th className="text-right py-3 px-3 font-medium text-slate-500">Trả</th>
                      <th className="text-right py-3 px-3 font-medium text-slate-500">Tỉ lệ vấn đề</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnBySize.sizeData.map((row) => (
                      <tr key={row.size} className="border-b border-slate-100 dark:border-slate-700/50">
                        <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{row.size}</td>
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">{row.totalSold}</td>
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">{row.cancelled}</td>
                        <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">{row.returned}</td>
                        <td className="py-3 px-3 text-right">
                          <span className={`font-bold ${row.problemRate > 15 ? 'text-red-500' : row.problemRate > 10 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {row.problemRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle size={40} className="mx-auto mb-2 opacity-30" />
                <p>Chưa đủ dữ liệu phân tích</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Overview - Original content */}
      {activeTab === 'overview' && (
        <>

      {/* Row 2: Sales Funnel */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Phễu chuyển đổi</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Theo dõi hành trình mua hàng</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {funnel?.funnel.overallConversionRate || 0}%
            </p>
            <p className="text-xs text-slate-500">Tổng chuyển đổi</p>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {funnelChartData.map((stage, index) => {
            const prevValue = index > 0 ? funnelChartData[index - 1].value : stage.value;
            const dropRate = prevValue > 0 ? Math.round((1 - stage.value / prevValue) * 100) : 0;
            const width = funnelChartData[0].value > 0 
              ? Math.max(30, (stage.value / funnelChartData[0].value) * 100) 
              : 100;

            return (
              <div key={stage.name} className="flex flex-col items-center">
                <div 
                  className="h-24 rounded-lg flex items-center justify-center text-white font-bold transition-all"
                  style={{ 
                    backgroundColor: stage.fill, 
                    width: `${width}%`,
                    minWidth: '60px'
                  }}
                >
                  {formatNumber(stage.value)}
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2 text-center">
                  {stage.name}
                </p>
                {index > 0 && dropRate > 0 && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <ArrowDown size={10} /> {dropRate}% rớt
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Insights */}
        {funnel?.insights && funnel.insights.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">💡 Insights</p>
            <ul className="space-y-1">
              {funnel.insights.map((insight, i) => (
                <li key={i} className="text-sm text-slate-600 dark:text-slate-400">{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Row 3: Size Distribution & Abandoned Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Size Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Phân bố Size</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Size phổ biến: <span className="font-semibold text-primary-600">{sizeData?.topSize || 'N/A'}</span>
              </p>
            </div>
          </div>

          {sizeData && sizeData.sizes.length > 0 ? (
            <div className="flex gap-6">
              {/* Pie Chart */}
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sizeData.sizes.slice(0, 5)}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      dataKey="count"
                      nameKey="size"
                    >
                      {sizeData.sizes.slice(0, 5).map((entry, index) => (
                        <Cell key={entry.size} fill={SIZE_COLORS[index % SIZE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                {sizeData.sizes.slice(0, 5).map((size, index) => (
                  <div key={size.size} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SIZE_COLORS[index % SIZE_COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {size.size}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {size.percentage}%
                      </span>
                      <span className="text-xs text-slate-500 ml-2">({size.count})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <Package size={40} className="mx-auto mb-2 opacity-30" />
              <p>Chưa có dữ liệu size</p>
            </div>
          )}

          {/* Color Distribution */}
          {sizeData && sizeData.colors.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                Xu hướng màu sắc
              </p>
              <div className="flex flex-wrap gap-2">
                {sizeData.colors.slice(0, 5).map((color, index) => (
                  <span 
                    key={color.color}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {color.color}: {color.percentage}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Abandoned Products */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sản phẩm bị bỏ quên</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">View cao nhưng không mua</p>
            </div>
            <AlertTriangle className="text-amber-500" size={20} />
          </div>

          {abandonedProducts.length > 0 ? (
            <div className="space-y-3">
              {abandonedProducts.slice(0, 5).map((product, index) => (
                <div 
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {product.views} views • {formatCurrency(product.price)}đ
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400">
                      {product.possibleReasons[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <CheckCircle size={40} className="mx-auto mb-2 opacity-30" />
              <p>Tuyệt vời! Không có sản phẩm bị bỏ quên</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickStat 
          label="Giá trị đơn TB" 
          value={formatCurrency(overview?.averageOrderValue || 0)} 
          suffix="đ"
        />
        <QuickStat 
          label="Tỉ lệ bỏ giỏ" 
          value={`${overview?.cartAbandonmentRate || 0}%`}
          warning={overview?.cartAbandonmentRate ? overview.cartAbandonmentRate > 70 : false}
        />
        <QuickStat 
          label="View → Cart" 
          value={`${funnel?.funnel.viewToCartRate || 0}%`}
        />
        <QuickStat 
          label="Cart → Mua" 
          value={`${funnel?.funnel.checkoutToPurchaseRate || 0}%`}
        />
      </div>
        </>
      )}

      {/* TAB: Behavior - Search & Abandoned Products */}
      {activeTab === 'behavior' && (
        <div className="space-y-6">
          {/* Search Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Keywords */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Từ khóa tìm kiếm</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Top từ khóa phổ biến</p>
                </div>
                <Search className="text-blue-500" size={20} />
              </div>

              {searchKeywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {searchKeywords.slice(0, 15).map((kw) => {
                    const size = Math.max(12, Math.min(20, 12 + kw.count / 10));
                    return (
                      <span
                        key={kw.keyword}
                        className={`px-3 py-1.5 rounded-full font-medium transition-all hover:scale-105 cursor-default ${
                          kw.hasProducts
                            ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                            : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                        }`}
                        style={{ fontSize: `${size}px` }}
                        title={`${kw.count} lượt tìm kiếm`}
                      >
                        {kw.keyword}
                        {!kw.hasProducts && ' 🔴'}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Search size={40} className="mx-auto mb-2 opacity-30" />
                  <p>Chưa có dữ liệu tìm kiếm</p>
                </div>
              )}
            </div>

            {/* Search Opportunities */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cơ hội kinh doanh</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Từ khóa không có kết quả</p>
                </div>
                <Tag className="text-emerald-500" size={20} />
              </div>

              {opportunities.length > 0 ? (
                <div className="space-y-3">
                  {opportunities.slice(0, 5).map((opp) => (
                    <div 
                      key={opp.keyword}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">💡</span>
                        <span className="font-medium text-slate-900 dark:text-white">{opp.keyword}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {opp.searchCount} tìm kiếm
                        </span>
                        <p className="text-xs text-slate-500">Chưa có SP</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle size={40} className="mx-auto mb-2 opacity-30" />
                  <p>Tất cả từ khóa đều có sản phẩm</p>
                </div>
              )}
            </div>
          </div>

          {/* Abandoned Products */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sản phẩm view cao nhưng không mua</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Phân tích sản phẩm cần cải thiện</p>
              </div>
              <AlertTriangle className="text-amber-500" size={24} />
            </div>

            {abandonedProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {abandonedProducts.slice(0, 6).map((product) => (
                  <div key={product.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex gap-3 mb-3">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                          <Package size={24} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 dark:text-white truncate">{product.name}</h4>
                        <p className="text-sm text-slate-500">{formatCurrency(product.price)}đ</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-500">👀 {product.views} views</span>
                      <span className="text-slate-500">🛒 {product.sold} đã bán</span>
                    </div>
                    {product.possibleReasons.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          💡 {product.possibleReasons[0]}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle size={40} className="mx-auto mb-2 opacity-30" />
                <p>Không có sản phẩm bị bỏ quên</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: AI & Recommendation */}
      {activeTab === 'ai-rec' && (
        <div className="space-y-6">
          {/* Recommendation Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="text-purple-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">CTR Gợi ý</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{recData?.overview.ctr || 0}%</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="text-emerald-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">Mua từ gợi ý</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{recData?.overview.purchasedFromRec || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-blue-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">Tỉ lệ chuyển đổi</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{recData?.overview.conversionRate || 0}%</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-amber-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">% Doanh thu</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{recData?.overview.revenueContribution || 0}%</p>
            </div>
          </div>

          {/* Insights */}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Algorithm Performance */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hiệu suất thuật toán</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Clicks theo loại gợi ý</p>
                </div>
                <Sparkles className="text-purple-500" size={20} />
              </div>

              {recData?.algorithmStats && recData.algorithmStats.length > 0 ? (
                <div className="space-y-3">
                  {recData.algorithmStats.map((algo, idx) => (
                    <div key={algo.algorithm} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLOR_CHART_COLORS[idx % COLOR_CHART_COLORS.length] }}
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{algo.label}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{algo.clicks} clicks</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Sparkles size={40} className="mx-auto mb-2 opacity-30" />
                  <p>Chưa có dữ liệu recommendation</p>
                  <p className="text-xs mt-1">Cần tích hợp tracking vào các section gợi ý</p>
                </div>
              )}
            </div>

            {/* Traffic Sources */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nguồn traffic sản phẩm</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Khách tìm đến sản phẩm qua đâu?</p>
                </div>
                <Eye className="text-blue-500" size={20} />
              </div>

              {recData?.sourceStats && recData.sourceStats.length > 0 ? (
                <div className="space-y-3">
                  {recData.sourceStats.map((source, idx) => (
                    <div key={source.source} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLOR_CHART_COLORS[idx % COLOR_CHART_COLORS.length] }}
                      />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{source.label}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formatNumber(source.views)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Eye size={40} className="mx-auto mb-2 opacity-30" />
                  <p>Chưa có dữ liệu nguồn traffic</p>
                </div>
              )}
            </div>
          </div>

          {/* Co-viewed Products */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sản phẩm được xem cùng nhau</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Gợi ý tạo combo/bundle từ hành vi xem</p>
              </div>
              <Link2 className="text-cyan-500" size={24} />
            </div>

            {coViewedPairs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coViewedPairs.slice(0, 6).map((pair, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex -space-x-2">
                        {pair.product1?.image ? (
                          <img src={pair.product1.image} alt="" className="w-10 h-10 rounded-lg object-cover border-2 border-white dark:border-slate-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
                        )}
                        {pair.product2?.image ? (
                          <img src={pair.product2.image} alt="" className="w-10 h-10 rounded-lg object-cover border-2 border-white dark:border-slate-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{pair.product1?.name}</p>
                        <p className="text-sm text-slate-500 truncate">+ {pair.product2?.name}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">{pair.coViewCount} sessions xem cùng</span>
                      <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                        Combo {formatCurrency(pair.comboPotentialPrice)}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Link2 size={40} className="mx-auto mb-2 opacity-30" />
                <p>Chưa đủ dữ liệu phân tích co-view</p>
              </div>
            )}
          </div>

          {/* Bought Together */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thường mua cùng nhau</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Cặp sản phẩm hay được mua trong cùng đơn</p>
              </div>
              <ShoppingCart className="text-emerald-500" size={24} />
            </div>

            {boughtTogether.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {boughtTogether.slice(0, 6).map((pair, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex -space-x-2">
                        {pair.product1?.image ? (
                          <img src={pair.product1.image} alt="" className="w-12 h-12 rounded-lg object-cover border-2 border-white dark:border-slate-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
                        )}
                        {pair.product2?.image ? (
                          <img src={pair.product2.image} alt="" className="w-12 h-12 rounded-lg object-cover border-2 border-white dark:border-slate-800" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{pair.product1?.name}</p>
                        <p className="text-sm text-slate-500 truncate">+ {pair.product2?.name}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-500">{pair.coBuyCount} đơn mua cùng</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-500 line-through">{formatCurrency(pair.bundleSuggestion.originalPrice)}đ</p>
                        <p className="text-sm font-bold text-emerald-600">{formatCurrency(pair.bundleSuggestion.suggestedPrice)}đ</p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                        -{pair.bundleSuggestion.discount}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
                <p>Chưa đủ dữ liệu phân tích bought-together</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Wishlist Analytics */}
      {activeTab === 'wishlist' && (
        <div className="space-y-6">
          {/* Wishlist Overview Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="text-rose-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">Thêm yêu thích</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{wishlistData?.overview.totalAdds || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="text-amber-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">Bỏ yêu thích</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{wishlistData?.overview.totalRemoves || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-emerald-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">Tổng hiện tại</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{wishlistData?.overview.currentTotalItems || 0}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="text-blue-500" size={18} />
                <span className="text-xs font-medium text-slate-500 uppercase">Chuyển đổi</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{wishlistData?.overview.conversionRate || 0}%</p>
            </div>
          </div>

          {/* Wishlist Insights */}
          {wishlistData?.insights && wishlistData.insights.length > 0 && (
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-500/10 dark:to-pink-500/10 p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="text-rose-500" size={18} />
                <span className="font-medium text-rose-700 dark:text-rose-300">Wishlist Insights</span>
              </div>
              <ul className="space-y-1">
                {wishlistData.insights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">{insight}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Top Wishlisted Products */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Sản phẩm được yêu thích nhất</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Top sản phẩm trong wishlist của khách hàng</p>
              </div>
              <Heart className="text-rose-500" size={24} />
            </div>

            {wishlistData?.topProducts && wishlistData.topProducts.length > 0 ? (
              <div className="space-y-3">
                {wishlistData.topProducts.slice(0, 10).map((product, idx) => (
                  <div 
                    key={product.productId}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 font-bold text-sm">
                      {idx + 1}
                    </div>
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <Package size={20} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
                      <p className="text-sm text-slate-500">{product.category} • {formatCurrency(product.price)}đ</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                          ❤️ {product.netScore}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="text-emerald-500">+{product.adds}</span>
                        <span className="text-amber-500">-{product.removes}</span>
                      </div>
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          product.retentionRate > 70 
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                            : product.retentionRate > 50 
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300'
                        }`}>
                          Giữ {product.retentionRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Heart size={40} className="mx-auto mb-2 opacity-30" />
                <p>Chưa có dữ liệu wishlist</p>
                <p className="text-xs mt-1">Dữ liệu sẽ xuất hiện khi khách hàng thêm sản phẩm vào yêu thích</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  change?: number;
  suffix?: string;
  color: 'rose' | 'blue' | 'purple' | 'emerald' | 'amber';
}> = ({ icon: Icon, label, value, change, suffix, color }) => {
  const colorClasses = {
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-500',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <div className={`p-2 w-fit rounded-xl ${colorClasses[color]} mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-1">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{value}</h3>
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
      {change !== undefined && (
        <p className={`text-xs mt-1 flex items-center gap-1 ${change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {change >= 0 ? '+' : ''}{change}% so với hôm qua
        </p>
      )}
    </div>
  );
};

// Quick Stat Component
const QuickStat: React.FC<{
  label: string;
  value: string;
  suffix?: string;
  warning?: boolean;
}> = ({ label, value, suffix, warning }) => (
  <div className={`p-4 rounded-xl ${warning ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-slate-50 dark:bg-slate-800/50'}`}>
    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    <p className={`text-lg font-bold ${warning ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
      {value}{suffix}
    </p>
  </div>
);

export default Tracking;

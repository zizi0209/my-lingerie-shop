
import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { 
  ShoppingCart, ChevronUp, ChevronDown, MoreHorizontal, Wallet, 
  CreditCard, Package, TrendingUp, Loader2
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { useLanguage } from '../components/LanguageContext';
import { adminDashboardApi, type DashboardStats } from '@/lib/adminApi';

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
}

const DashboardHome: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [period, setPeriod] = useState<'24hours' | '7days' | '30days' | '90days'>('7days');

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsRes, analyticsRes] = await Promise.all([
          adminDashboardApi.getStats(),
          adminDashboardApi.getAnalytics(period)
        ]);

        if (statsRes.success) {
          setStats(statsRes.data);
        }

        if (analyticsRes.success) {
          // Process revenue by day for chart
          const revenueMap = new Map<string, number>();
          const ordersMap = new Map<string, number>();

          analyticsRes.data.revenueByDay.forEach((item) => {
            const date = new Date(item.createdAt);
            const key = `${date.getMonth() + 1}/${date.getDate()}`;
            revenueMap.set(key, (revenueMap.get(key) || 0) + item.totalAmount);
            ordersMap.set(key, (ordersMap.get(key) || 0) + 1);
          });

          const chartPoints: ChartDataPoint[] = Array.from(revenueMap.keys()).map(key => ({
            name: key,
            revenue: Math.round(revenueMap.get(key) || 0),
            orders: ordersMap.get(key) || 0
          }));

          setChartData(chartPoints);
          setTopProducts(analyticsRes.data.topProducts);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [period]);

  // Format currency VND
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
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

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-gradient-to-br from-rose-500 to-pink-600 p-6 rounded-[24px] text-white shadow-xl shadow-rose-200 dark:shadow-none relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Wallet size={24} />
              </div>
              <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="mt-8">
              <div className="flex items-center space-x-2">
                <h3 className="text-3xl font-black tracking-tight">{formatCurrency(stats.revenue.total)}</h3>
                <div className="p-1 bg-white/30 rounded-full">
                  <TrendingUp size={14} />
                </div>
              </div>
              <p className="text-rose-50 text-xs font-bold uppercase tracking-widest mt-1">{t('dashboard.revenue')}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl">
              <ShoppingCart size={24} />
            </div>
            <div className="flex space-x-1">
              <button 
                onClick={() => setPeriod('7days')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase transition-colors ${
                  period === '7days' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                7D
              </button>
              <button 
                onClick={() => setPeriod('30days')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase transition-colors ${
                  period === '30days' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                30D
              </button>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.orders.total}</h3>
                <div className="p-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full">
                  <ChevronUp size={14} />
                </div>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{t('dashboard.orders')}</p>
              <p className="text-[10px] text-slate-400 mt-1">{stats.orders.pending} đang xử lý</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex-1 bg-rose-500 p-4 rounded-[24px] flex items-center space-x-4 text-white">
            <div className="p-2 bg-white/20 rounded-xl"><Package size={20} /></div>
            <div>
              <h4 className="font-black text-xl">{stats.products.total}</h4>
              <p className="text-[10px] uppercase font-bold text-rose-100">Sản phẩm</p>
              <p className="text-[9px] text-rose-100/80">{stats.products.visible} hiển thị</p>
            </div>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[24px] flex items-center space-x-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl"><CreditCard size={20} /></div>
            <div>
              <h4 className="font-black text-xl text-slate-900 dark:text-white">{stats.users.total}</h4>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Người dùng</p>
              <p className="text-[9px] text-slate-400">{stats.users.active} hoạt động</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doanh thu theo ngày</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
              </h3>
            </div>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value as typeof period)}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none cursor-pointer"
            >
              <option value="7days">7 ngày</option>
              <option value="30days">30 ngày</option>
              <option value="90days">90 ngày</option>
            </select>
          </div>
          <div className="h-[400px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                  <Tooltip 
                    cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDark ? '#1e293b' : '#ffffff' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="revenue" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Doanh thu" />
                  <Bar dataKey="orders" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Đơn hàng" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Top sản phẩm</h3>
            <button className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          
          {topProducts.length > 0 ? (
            <>
              <div className="bg-rose-50 dark:bg-rose-500/5 rounded-2xl p-4 mb-6 border border-rose-100 dark:border-rose-500/10">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                       {topProducts[0].productName}
                     </p>
                     <p className="text-[10px] text-rose-400">
                       {topProducts[0].totalSold} đã bán
                     </p>
                   </div>
                   <span className="text-sm font-black text-rose-700 dark:text-rose-200">
                     {formatCurrency(topProducts[0].price * topProducts[0].totalSold)}
                   </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="p-1.5 bg-rose-500 text-white rounded-lg">
                    <TrendingUp size={12} />
                  </div>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    #{1} Bán chạy nhất
                  </span>
                </div>
              </div>

              <div className="space-y-3 flex-1">
                {topProducts.slice(1, 6).map((product, i) => (
                  <div key={product.productId} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer group">
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-rose-500 transition-colors truncate pr-2">
                          {product.productName}
                        </p>
                        <p className="text-xs font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(product.price * product.totalSold)}
                        </p>
                      </div>
                      <div className="flex items-center mt-0.5 gap-2">
                        <span className="text-[10px] font-bold text-emerald-500">
                          {product.totalSold} đã bán
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {product.orderCount} đơn
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              Chưa có dữ liệu sản phẩm
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

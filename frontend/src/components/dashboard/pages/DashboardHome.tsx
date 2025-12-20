
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { 
  ShoppingCart, ChevronUp, ChevronDown, MoreHorizontal, Wallet, 
  CreditCard, Package
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import { useLanguage } from '../components/LanguageContext';

const growthData = [
  { name: 'Jan', revenue: 400, expense: 240, orders: 200 },
  { name: 'Feb', revenue: 300, expense: 139, orders: 400 },
  { name: 'Mar', revenue: 200, expense: 980, orders: 600 },
  { name: 'Apr', revenue: 278, expense: 390, orders: 450 },
  { name: 'May', revenue: 189, expense: 480, orders: 300 },
  { name: 'Jun', revenue: 239, expense: 380, orders: 700 },
  { name: 'Jul', revenue: 349, expense: 430, orders: 850 },
];

const sparklineData = [
  { val: 10 }, { val: 40 }, { val: 20 }, { val: 60 }, { val: 30 }, { val: 80 }, { val: 45 }
];

const popularProducts = [
  { name: 'Silk Lace Bralette', profit: '+$1839.00', status: 'profit', percentage: '10% Profit' },
  { name: 'Floral Embroidery', profit: '+$1839.00', status: 'profit', percentage: '10% Profit' },
  { name: 'Satin High-Waist', profit: '-$100.00', status: 'loss', percentage: '10% Loss' },
  { name: 'Sheer Bodysuit', profit: '+$200.00', status: 'profit', percentage: '10% Profit' },
];

const DashboardHome: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

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
                <h3 className="text-3xl font-black tracking-tight">$500.00</h3>
                <div className="p-1 bg-white/30 rounded-full">
                  <ChevronUp size={14} />
                </div>
              </div>
              <p className="text-rose-50 text-xs font-bold uppercase tracking-widest mt-1">{t('dashboard.earning')}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl">
              <ShoppingCart size={24} />
            </div>
            <div className="flex space-x-1">
              <button className="px-3 py-1 bg-rose-500 text-white text-[10px] font-black rounded-lg uppercase">{t('dashboard.year')}</button>
              <button className="px-3 py-1 text-slate-400 text-[10px] font-black rounded-lg uppercase">{t('dashboard.month')}</button>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">$961</h3>
                <div className="p-1 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-full">
                  <ChevronDown size={14} />
                </div>
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{t('dashboard.orders')}</p>
            </div>
            <div className="w-32 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="val" stroke="#f43f5e" fill="#f43f5e20" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex-1 bg-rose-500 p-4 rounded-[24px] flex items-center space-x-4 text-white">
            <div className="p-2 bg-white/20 rounded-xl"><Package size={20} /></div>
            <div>
              <h4 className="font-black text-xl">$203k</h4>
              <p className="text-[10px] uppercase font-bold text-rose-100">{t('dashboard.income')}</p>
            </div>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-[24px] flex items-center space-x-4">
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl"><CreditCard size={20} /></div>
            <div>
              <h4 className="font-black text-xl text-slate-900 dark:text-white">$203k</h4>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{t('dashboard.revenue')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.growth')}</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">$2,324.00</h3>
            </div>
            <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none">
              <option>{t('dashboard.today')}</option>
              <option>{t('dashboard.month')}</option>
            </select>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <Tooltip 
                  cursor={{fill: isDark ? '#1e293b' : '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: isDark ? '#1e293b' : '#ffffff' }}
                />
                <Bar dataKey="revenue" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#fbcfe8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('dashboard.popular')}</h3>
            <button className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          
          <div className="bg-rose-50 dark:bg-rose-500/5 rounded-2xl p-4 mb-6 border border-rose-100 dark:border-rose-500/10">
            <div className="flex justify-between items-start mb-2">
               <div>
                 <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Bajaj Finery ({t('dashboard.bestSeller')})</p>
                 <p className="text-[10px] text-rose-400">10% {t('dashboard.profitGrowth')}</p>
               </div>
               <span className="text-sm font-black text-rose-700 dark:text-rose-200">$1839.00</span>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <Area type="monotone" dataKey="val" stroke="#f43f5e" fill="#f43f5e20" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {popularProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer group">
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-rose-500 transition-colors">{p.name}</p>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{p.profit}</p>
                  </div>
                  <div className="flex items-center mt-0.5">
                    {p.status === 'profit' ? <ChevronUp size={10} className="text-emerald-500 mr-1" /> : <ChevronDown size={10} className="text-rose-500 mr-1" />}
                    <span className={`text-[10px] font-bold ${p.status === 'profit' ? 'text-emerald-500' : 'text-rose-500'}`}>{p.percentage}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;

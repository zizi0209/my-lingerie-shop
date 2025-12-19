
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Eye, MousePointer2, UserPlus, Zap, Globe, MapPin } from 'lucide-react';
import { useTheme } from '../components/ThemeContext';

const trackingData = [
  { name: '00:00', users: 120, bounce: 40 },
  { name: '04:00', users: 80, bounce: 30 },
  { name: '08:00', users: 450, bounce: 120 },
  { name: '12:00', users: 890, bounce: 210 },
  { name: '16:00', users: 1200, bounce: 300 },
  { name: '20:00', users: 950, bounce: 240 },
  { name: '23:59', users: 400, bounce: 100 },
];

const sourceData = [
  { name: 'Direct', value: 400 },
  { name: 'Instagram', value: 700 },
  { name: 'Google Search', value: 300 },
  { name: 'Facebook Ads', value: 200 },
];

const COLORS = ['#f43f5e', '#fb7185', '#be123c', '#9f1239'];

const Tracking: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Real-Time Pulse</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor user interactions and traffic origin.</p>
        </div>
        <div className="flex items-center text-emerald-500 font-black bg-emerald-50 dark:bg-emerald-500/10 px-5 py-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-sm animate-pulse">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2.5"></span>
          142 ACTIVE SHOPPERS
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Eye, label: 'Page Impressions', val: '45,201', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { icon: MousePointer2, label: 'Click Rate', val: '12.4%', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { icon: UserPlus, label: 'Loyalty Growth', val: '+8.4k', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
          { icon: Zap, label: 'Engagement', val: '86%', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:-translate-y-1 transition-all duration-300">
            <div className={`p-3 w-fit rounded-xl ${stat.bg} ${stat.color} mb-4 shadow-sm`}>
              <stat.icon size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">{stat.val}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-black text-slate-900 dark:text-white">Active Traffic Wave</h3>
             <div className="flex space-x-2">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold dark:text-slate-300 rounded-lg">LIVE FEED</span>
             </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trackingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                <XAxis 
                   dataKey="name" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10}} 
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10}} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a'
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="#f43f5e" fill="#f43f5e15" strokeWidth={4} />
                <Area type="monotone" dataKey="bounce" stroke="#94a3b8" fill="#94a3b805" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Traffic Origin</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    backgroundColor: isDark ? '#1e293b' : '#ffffff' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="text-center">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">1,600</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Daily Hits</p>
               </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            {sourceData.map((s, i) => (
              <div key={i} className="flex items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="w-2.5 h-2.5 rounded-full mr-2.5 shadow-sm" style={{backgroundColor: COLORS[i]}}></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-900 dark:text-slate-200 uppercase">{s.name}</span>
                  <span className="text-[9px] text-slate-500 font-bold">{Math.round((s.value/1600)*100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tracking;

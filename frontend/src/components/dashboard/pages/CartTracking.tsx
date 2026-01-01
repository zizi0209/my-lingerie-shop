
import React from 'react';
import { ShoppingCart, AlertCircle, RefreshCw, Mail } from 'lucide-react';

const CartTracking: React.FC = () => {
  const carts = [
    { id: 'C-1001', customer: 'Alice Johnson', items: 3, total: 145.00, status: 'abandoned', time: '2 hours ago' },
    { id: 'C-1002', customer: 'Bella Hadid', items: 1, total: 65.00, status: 'active', time: '5 mins ago' },
    { id: 'C-1003', customer: 'Cara Delevingne', items: 5, total: 320.00, status: 'abandoned', time: '1 day ago' },
    { id: 'C-1004', customer: 'Kendall Jenner', items: 2, total: 95.00, status: 'recovered', time: '3 hours ago' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Cart Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Monitor and recover lost potential revenue.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-3 shadow-sm dark:text-slate-300">
          <RefreshCw size={14} className="text-rose-500 animate-spin-slow" />
          <span>Auto-Recovery Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-rose-50 dark:bg-rose-500/10 p-6 rounded-4xl border border-rose-100 dark:border-rose-500/20 flex items-center space-x-5">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl text-rose-500 shadow-sm">
            <AlertCircle size={28} />
          </div>
          <div>
            <p className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest">Abandoned Total</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">$12,450.00</h3>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-4xl border border-emerald-100 dark:border-emerald-500/20 flex items-center space-x-5">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl text-emerald-500 shadow-sm">
            <RefreshCw size={28} />
          </div>
          <div>
            <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest">Recovery Rate</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">18.5%</h3>
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-500/10 p-6 rounded-4xl border border-blue-100 dark:border-blue-500/20 flex items-center space-x-5">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl text-blue-500 shadow-sm">
            <ShoppingCart size={28} />
          </div>
          <div>
            <p className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest">Active Carts</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mt-1">42</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-4xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Cart ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {carts.map((c) => (
                <tr key={c.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-200 text-sm">{c.id}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-bold text-sm">{c.customer}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-xs font-medium">{c.items} items</td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-200 text-sm">${c.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      c.status === 'abandoned' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' :
                      c.status === 'active' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{c.time}</td>
                  <td className="px-6 py-4 text-right">
                    {c.status === 'abandoned' && (
                      <button className="flex items-center space-x-2 ml-auto text-rose-500 hover:text-rose-600 font-black text-[10px] bg-rose-50 dark:bg-rose-500/10 px-4 py-2 rounded-xl transition-all uppercase tracking-widest border border-rose-100 dark:border-rose-500/10">
                        <Mail size={12} />
                        <span>Recover</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CartTracking;

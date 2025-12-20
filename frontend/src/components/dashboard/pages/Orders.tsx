
import React from 'react';
import { Search, Filter, Eye, Download } from 'lucide-react';
import { Order } from '../types';

const Orders: React.FC = () => {
  const orders: Order[] = [
    { id: 'ORD-8291', customer: 'Emma Watson', date: '2023-10-15', total: 124.50, status: 'delivered' },
    { id: 'ORD-8292', customer: 'Sophia Chen', date: '2023-10-16', total: 85.00, status: 'shipped' },
    { id: 'ORD-8293', customer: 'Olivia Smith', date: '2023-10-16', total: 210.30, status: 'pending' },
    { id: 'ORD-8294', customer: 'Isabella Garcia', date: '2023-10-17', total: 45.00, status: 'cancelled' },
  ];

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'delivered': return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'shipped': return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'pending': return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
      case 'cancelled': return 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Order Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Track and fulfill your premium customer requests.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center space-x-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Search orders..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-rose-500/20 text-sm dark:text-slate-200"
              />
            </div>
            <button className="p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all">
              <Filter size={18} />
            </button>
          </div>
          <div className="hidden lg:block">
             <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Displaying 128 orders</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-200 text-sm">{order.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 text-sm">{order.customer}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-xs font-medium">{order.date}</td>
                  <td className="px-6 py-4 font-black text-rose-600 dark:text-rose-400 text-sm">${order.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all">
                      <Eye size={18} />
                    </button>
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

export default Orders;

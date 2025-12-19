
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
      case 'delivered': return 'bg-emerald-100 text-emerald-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="text-slate-500">Track and manage your customer orders.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2 hover:bg-slate-50">
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Find orders..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500/20 text-sm"
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-white text-slate-600">
              <Filter size={18} />
            </button>
          </div>
          <div className="flex items-center space-x-2">
             <span className="text-sm text-slate-500">Displaying 24 of 128 orders</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{order.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{order.customer}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{order.date}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">${order.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
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

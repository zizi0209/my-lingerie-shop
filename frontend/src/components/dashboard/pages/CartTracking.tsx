
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cart Tracking</h1>
          <p className="text-slate-500">Monitor active and abandoned shopping carts.</p>
        </div>
        <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold flex items-center space-x-2">
          <RefreshCw size={16} className="text-rose-500" />
          <span>Auto-Recovery Enabled</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex items-center space-x-4">
          <div className="p-3 bg-white rounded-xl text-rose-500 shadow-sm">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-rose-600 text-sm font-bold">Abandoned Total</p>
            <h3 className="text-2xl font-bold text-slate-900">$12,450.00</h3>
          </div>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center space-x-4">
          <div className="p-3 bg-white rounded-xl text-emerald-500 shadow-sm">
            <RefreshCw size={24} />
          </div>
          <div>
            <p className="text-emerald-600 text-sm font-bold">Recovery Rate</p>
            <h3 className="text-2xl font-bold text-slate-900">18.5%</h3>
          </div>
        </div>
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center space-x-4">
          <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm">
            <ShoppingCart size={24} />
          </div>
          <div>
            <p className="text-blue-600 text-sm font-bold">Active Carts</p>
            <h3 className="text-2xl font-bold text-slate-900">42</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Cart ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{c.id}</td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{c.customer}</td>
                  <td className="px-6 py-4 text-slate-500">{c.items} items</td>
                  <td className="px-6 py-4 font-bold text-slate-900">${c.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      c.status === 'abandoned' ? 'bg-rose-100 text-rose-700' :
                      c.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{c.time}</td>
                  <td className="px-6 py-4 text-right">
                    {c.status === 'abandoned' && (
                      <button className="flex items-center space-x-1 ml-auto text-rose-500 hover:text-rose-600 font-bold text-sm bg-rose-50 px-3 py-1.5 rounded-lg transition-all">
                        <Mail size={14} />
                        <span>Send Recovery Email</span>
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

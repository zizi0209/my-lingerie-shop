
import React from 'react';
import { Customer } from '../types';
import { Mail, Phone, MapPin } from 'lucide-react';

const Customers: React.FC = () => {
  const customers: Customer[] = [
    { id: '1', name: 'Emma Watson', email: 'emma@watson.com', orders: 12, spent: 1250 },
    { id: '2', name: 'Sophia Chen', email: 'sophia.c@example.com', orders: 8, spent: 890 },
    { id: '3', name: 'Olivia Smith', email: 'olivia@smith.co', orders: 4, spent: 450 },
    { id: '4', name: 'Isabella Garcia', email: 'isabella@garcia.net', orders: 15, spent: 2100 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {customers.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col items-center text-center space-y-4">
              <img src={`https://picsum.photos/80/80?random=${c.id}`} alt={c.name} className="w-20 h-20 rounded-full border-4 border-rose-50 shadow-sm" />
              <div>
                <h3 className="font-bold text-lg text-slate-900">{c.name}</h3>
                <p className="text-sm text-slate-500">{c.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-50">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Orders</p>
                  <p className="font-bold text-slate-900">{c.orders}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Spent</p>
                  <p className="font-bold text-rose-600">${c.spent}</p>
                </div>
              </div>
              <div className="flex space-x-2 w-full pt-2">
                <button className="flex-1 bg-slate-50 hover:bg-slate-100 p-2 rounded-lg text-slate-600"><Mail size={16} className="mx-auto" /></button>
                <button className="flex-1 bg-slate-50 hover:bg-slate-100 p-2 rounded-lg text-slate-600"><Phone size={16} className="mx-auto" /></button>
                <button className="flex-1 bg-slate-50 hover:bg-slate-100 p-2 rounded-lg text-slate-600"><MapPin size={16} className="mx-auto" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Customers;


import React from 'react';
import { Customer } from '../types';
import { Mail, Phone, MapPin } from 'lucide-react';
import SearchInput from '../components/SearchInput';

const Customers: React.FC = () => {
  const customers: Customer[] = [
    { id: '1', name: 'Emma Watson', email: 'emma@watson.com', orders: 12, spent: 1250 },
    { id: '2', name: 'Sophia Chen', email: 'sophia.c@example.com', orders: 8, spent: 890 },
    { id: '3', name: 'Olivia Smith', email: 'olivia@smith.co', orders: 4, spent: 450 },
    { id: '4', name: 'Isabella Garcia', email: 'isabella@garcia.net', orders: 15, spent: 2100 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Customer Directory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage and nurture your luxury clientele.</p>
        </div>
        <SearchInput 
          placeholder="Search VIPs..." 
          className="w-full md:w-80"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {customers.map((c) => (
          <div key={c.id} className="bg-white dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <img src={`https://picsum.photos/120/120?random=${c.id}`} alt={c.name} className="w-24 h-24 rounded-full border-4 border-rose-50 dark:border-rose-500/20 shadow-sm object-cover" />
                <span className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white dark:border-slate-900"></span>
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">{c.name}</h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{c.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full py-4 border-y border-slate-50 dark:border-slate-800/50">
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Orders</p>
                  <p className="font-black text-slate-900 dark:text-slate-200">{c.orders}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Lifetime Value</p>
                  <p className="font-black text-rose-600 dark:text-rose-400">${c.spent}</p>
                </div>
              </div>
              <div className="flex space-x-2 w-full pt-2">
                <button className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2.5 rounded-xl text-slate-400 hover:text-rose-500 transition-all"><Mail size={16} className="mx-auto" /></button>
                <button className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2.5 rounded-xl text-slate-400 hover:text-rose-500 transition-all"><Phone size={16} className="mx-auto" /></button>
                <button className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2.5 rounded-xl text-slate-400 hover:text-rose-500 transition-all"><MapPin size={16} className="mx-auto" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Customers;

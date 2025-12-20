
import React from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';

const Categories: React.FC = () => {
  const categories = [
    { name: 'Bras', count: 142, icon: '👙' },
    { name: 'Panties', count: 285, icon: '🩲' },
    { name: 'Sets', count: 96, icon: '🎀' },
    { name: 'Bodysuits', count: 54, icon: '🕴️' },
    { name: 'Nightwear', count: 120, icon: '🌙' },
    { name: 'Bridal', count: 32, icon: '👰' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Collections</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Organize your couture into manageable groups.</p>
        </div>
        <button className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center space-x-2 transition-all shadow-lg shadow-rose-200 dark:shadow-none">
          <Plus size={18} />
          <span>New Collection</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/50 p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between hover:border-rose-500 dark:hover:border-rose-500 transition-all cursor-pointer group">
            <div className="flex items-center space-x-5">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-3xl shadow-inner">
                {cat.icon}
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors uppercase tracking-tight">{cat.name}</h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{cat.count} products</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all"><Edit3 size={18} /></button>
              <button className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;

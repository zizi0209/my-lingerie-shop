
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500">Organize your products into collections.</p>
        </div>
        <button className="bg-rose-500 text-white px-4 py-2 rounded-xl font-semibold flex items-center space-x-2">
          <Plus size={20} />
          <span>New Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-rose-300 transition-all cursor-pointer group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-2xl">
                {cat.icon}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{cat.name}</h3>
                <p className="text-sm text-slate-500">{cat.count} products</p>
              </div>
            </div>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-2 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50"><Edit3 size={18} /></button>
              <button className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;

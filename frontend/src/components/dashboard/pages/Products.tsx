
import React, { useState } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Wand2, Filter } from 'lucide-react';
import { Product } from '../types';
import { generateProductDescription } from '../services/geminiService';
import SearchInput from '../components/SearchInput';

const Products: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [products] = useState<Product[]>([
    { id: '1', name: 'Silk Lace Bralette', category: 'Bras', price: 45.00, stock: 124, status: 'active', image: 'https://images.unsplash.com/photo-1574015974293-817f0efebb1b?q=80&w=200&auto=format&fit=crop' },
    { id: '2', name: 'Satin High-Waist Brief', category: 'Panties', price: 28.00, stock: 89, status: 'active', image: 'https://images.unsplash.com/photo-1626497748470-2819846665bd?q=80&w=200&auto=format&fit=crop' },
    { id: '3', name: 'Floral Embroidery Set', category: 'Sets', price: 85.00, stock: 0, status: 'out_of_stock', image: 'https://images.unsplash.com/photo-1616431264421-450f6e917d6a?q=80&w=200&auto=format&fit=crop' },
    { id: '4', name: 'Sheer Mesh Bodysuit', category: 'Bodysuits', price: 65.00, stock: 45, status: 'draft', image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=200&auto=format&fit=crop' },
  ]);

  const handleMagicWrite = async (name: string) => {
    setIsGenerating(true);
    const result = await generateProductDescription(name, "Premium lace, silk fabric, comfortable fit, sensual design");
    alert(`AI Copywriting Suggestion:\n\n${result}`);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Collection Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Organize and style your premium catalog.</p>
        </div>
        <button className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-xl shadow-rose-200 dark:shadow-rose-950/20 active:scale-95">
          <Plus size={20} />
          <span>Add New Piece</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/20">
          <SearchInput 
            placeholder="Search by name, SKU..." 
            className="w-full max-w-sm"
          />
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700">
              <Filter size={16} />
              <span>Filter</span>
            </button>
            <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-500/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                         <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-slate-100 dark:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700" />
                         {p.stock === 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800"></span>}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-900 dark:text-slate-200 text-sm group-hover:text-rose-600 transition-colors">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">SKU: SL-00{p.id}93</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700">
                        {p.category}
                     </span>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 dark:text-slate-200 text-sm">${p.price.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                       <span className={`text-xs font-bold ${p.stock < 10 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-400'}`}>
                        {p.stock} units
                      </span>
                      <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                         <div 
                            className={`h-full rounded-full ${p.stock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                            style={{width: `${Math.min(p.stock, 100)}%`}}
                          ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      p.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 
                      p.status === 'out_of_stock' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-500'
                    }`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleMagicWrite(p.name)}
                        className="p-2 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-all"
                        title="AI Description"
                        disabled={isGenerating}
                      >
                        <Wand2 size={16} />
                      </button>
                      <button className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
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

export default Products;

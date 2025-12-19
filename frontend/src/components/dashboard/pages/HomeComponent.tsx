
import React from 'react';
import { Move, Settings, Eye } from 'lucide-react';

const HomeComponent: React.FC = () => {
  const sections = ['Hero Banner', 'Flash Sale', 'New Arrivals', 'Best Sellers', 'Instagram Feed', 'Newsletter'];
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Home Layout Editor</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-700">Active Sections</h2>
          {sections.map((s, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group cursor-move">
              <div className="flex items-center space-x-3">
                <Move size={18} className="text-slate-300 group-hover:text-slate-500" />
                <span className="font-semibold text-slate-700">{s}</span>
              </div>
              <div className="flex space-x-1">
                <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"><Settings size={18} /></button>
                <button className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Eye size={18} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-200 rounded-2xl border border-dashed border-slate-400 flex items-center justify-center p-12 text-slate-500 flex-col space-y-4">
          <p className="font-bold">Layout Preview</p>
          <div className="w-full h-96 bg-white rounded-lg shadow-inner overflow-hidden flex items-center justify-center p-8 text-center">
            <div>
              <p className="text-slate-400">Preview will render here as you organize sections.</p>
              <button className="mt-4 bg-rose-500 text-white px-6 py-2 rounded-xl font-bold">Open Visual Designer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeComponent;

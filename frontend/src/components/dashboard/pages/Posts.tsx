
import React from 'react';
import { FileText, Plus, Eye, Edit, Trash } from 'lucide-react';

const Posts: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Marketing Posts</h1>
        <button className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-rose-200 dark:shadow-none active:scale-95 transition-transform"><Plus size={20}/><span>Create Post</span></button>
      </div>
      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-8 text-center text-slate-400 dark:text-slate-500">
           <FileText size={48} className="mx-auto mb-4 opacity-20" />
           <p className="font-medium text-lg text-slate-600 dark:text-slate-400">No blog posts yet</p>
           <p className="text-sm">Start writing your first marketing article to attract more customers.</p>
        </div>
      </div>
    </div>
  );
};

export default Posts;

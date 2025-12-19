
import React from 'react';
import { FileText, Plus, Eye, Edit, Trash } from 'lucide-react';

const Posts: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Marketing Posts</h1>
        <button className="bg-rose-500 text-white px-4 py-2 rounded-xl font-bold flex items-center space-x-2"><Plus size={20}/><span>Create Post</span></button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-8 text-center text-slate-400">
           <FileText size={48} className="mx-auto mb-4 opacity-20" />
           <p className="font-medium text-lg text-slate-600">No blog posts yet</p>
           <p className="text-sm">Start writing your first marketing article to attract more customers.</p>
        </div>
      </div>
    </div>
  );
};

export default Posts;

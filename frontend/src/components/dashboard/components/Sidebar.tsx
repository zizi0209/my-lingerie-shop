'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingBag, Layers, FileText, 
  Users, UserCheck, ShoppingCart, Settings, 
  ShieldCheck, MousePointer2, Home, 
  Tag, Menu, Activity
} from 'lucide-react';
import { useLanguage } from './LanguageContext';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle }) => {
  const pathname = usePathname();
  const { t } = useLanguage();
  
  const groups = [
    {
      label: t('nav.dashboard'),
      items: [
        { name: t('nav.default'), path: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.analytics'), path: '/dashboard/tracking', icon: Activity },
      ]
    },
    {
      label: t('nav.inventory'),
      items: [
        { name: t('nav.products'), path: '/dashboard/products', icon: ShoppingBag },
        { name: t('nav.categories'), path: '/dashboard/categories', icon: Layers },
        { name: t('nav.orders'), path: '/dashboard/orders', icon: ShoppingCart },
        { name: t('nav.cartTracker'), path: '/dashboard/cart-tracking', icon: MousePointer2 },
      ]
    },
    {
      label: t('nav.marketing'),
      items: [
        { name: t('nav.blogPosts'), path: '/dashboard/posts', icon: FileText },
        { name: t('nav.postTags'), path: '/dashboard/post-categories', icon: Tag },
        { name: t('nav.homeLayout'), path: '/dashboard/home-component', icon: Home },
      ]
    },
    {
      label: t('nav.system'),
      items: [
        { name: t('nav.staffUsers'), path: '/dashboard/users', icon: Users },
        { name: t('nav.customers'), path: '/dashboard/customer', icon: UserCheck },
        { name: t('nav.roles'), path: '/dashboard/roles', icon: ShieldCheck },
        { name: t('nav.settings'), path: '/dashboard/setting', icon: Settings },
      ]
    }
  ];

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col h-full shadow-sm z-50`}>
      <div className="p-6 flex items-center justify-between mb-2">
        {isOpen && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white font-black italic">SL</div>
            <span className="text-lg font-black italic tracking-tighter bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
              BERRY SILK
            </span>
          </div>
        )}
        <button onClick={toggle} className="p-2 rounded-xl bg-rose-50 dark:bg-slate-800 text-rose-500 dark:text-rose-400 hover:bg-rose-100 transition-all">
          <Menu size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 space-y-6 pb-8 scrollbar-hide">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {isOpen && (
              <p className="px-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center p-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-100 dark:text-black' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon size={20} className={`${isActive ? 'text-gray-900 dark:text-black' : 'text-slate-400 dark:text-slate-500 group-hover:text-rose-500'} transition-colors`} />
                  {isOpen && <span className={`ml-3 text-[13px] font-semibold tracking-tight`}>{item.name}</span>}
                  {isActive && isOpen && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-black"></div>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;

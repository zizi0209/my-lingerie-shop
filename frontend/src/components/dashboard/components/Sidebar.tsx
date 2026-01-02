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
        { name: t('nav.customers'), path: '/dashboard/customers', icon: UserCheck },
        { name: t('nav.roles'), path: '/dashboard/roles', icon: ShieldCheck },
        { name: t('nav.settings'), path: '/dashboard/settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside 
      className={`${isOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-200 flex flex-col h-full shadow-sm z-50`}
      aria-label="Dashboard Navigation"
    >
      <div className="p-4 md:p-6 flex items-center justify-between mb-2">
        {isOpen && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white font-black italic" aria-hidden="true">
              SL
            </div>
            <span className="text-base md:text-lg font-black italic tracking-tighter bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
              BERRY SILK
            </span>
          </div>
        )}
        <button 
          onClick={toggle}
          aria-label={isOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
          aria-expanded={isOpen}
          className="p-2 md:p-2.5 rounded-xl bg-rose-50 dark:bg-slate-800 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-colors"
        >
          <Menu size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 md:px-4 space-y-4 md:space-y-6 pb-8 scrollbar-thin" aria-label="Main navigation">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1" role="group" aria-label={group.label}>
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
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center p-3 rounded-xl group min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-inset ${
                    isActive 
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-100 dark:text-black' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon size={20} className={`shrink-0 ${isActive ? 'text-gray-900 dark:text-black' : 'text-slate-400 dark:text-slate-500 group-hover:text-rose-500'}`} aria-hidden="true" />
                  {isOpen && <span className={`ml-3 text-xs md:text-[13px] font-semibold tracking-tight`}>{item.name}</span>}
                  {isActive && isOpen && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-black" aria-hidden="true"></div>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

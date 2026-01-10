'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingBag, Layers, FileText, 
  Users, UserCheck, ShoppingCart, Settings, 
  ShieldCheck, MousePointer2, Home, 
  Tag, Menu, Activity, Store, Palette, Star,
  Ticket, Megaphone, Gift, Search
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useStoreConfig } from './StoreConfigContext';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle }) => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { config, loading } = useStoreConfig();
  
  // Use config values but NEVER fallback to hardcoded colors!
  // CSS variables from SSR are already in :root
  const storeName = config.store_name || 'Admin Panel';
  const storeLogo = config.store_logo;
  
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
        { name: t('nav.colors'), path: '/dashboard/colors', icon: Palette },
        { name: t('nav.orders'), path: '/dashboard/orders', icon: ShoppingCart },
        { name: t('nav.reviews'), path: '/dashboard/reviews', icon: Star },
        { name: t('nav.cartTracker'), path: '/dashboard/cart-tracking', icon: MousePointer2 },
      ]
    },
    {
      label: t('nav.marketing'),
      items: [
        { name: t('nav.blogPosts'), path: '/dashboard/posts', icon: FileText },
        { name: t('nav.postTags'), path: '/dashboard/post-categories', icon: Tag },
        { name: t('nav.homeLayout'), path: '/dashboard/home-component', icon: Home },
        { name: t('nav.coupons'), path: '/dashboard/coupons', icon: Ticket },
        { name: t('nav.campaigns'), path: '/dashboard/campaigns', icon: Megaphone },
        { name: t('nav.rewards'), path: '/dashboard/rewards', icon: Gift },
        { name: t('nav.search') || 'Tìm kiếm', path: '/dashboard/search', icon: Search },
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
            {storeLogo ? (
              <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg" aria-hidden="true">
                <img 
                  src={storeLogo} 
                  alt={storeName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, var(--primary-500), var(--primary-700))` 
                }}
                aria-hidden="true"
              >
                <Store size={16} />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {loading ? 'Loading...' : storeName}
              </span>
              <span 
                className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: 'var(--primary-500)' }}
              >
                CMS Dashboard
              </span>
            </div>
          </div>
        )}
        <button 
          onClick={toggle}
          aria-label={isOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
          aria-expanded={isOpen}
          className="p-2 md:p-2.5 rounded-xl dark:bg-slate-800 hover:dark:hover:bg-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors bg-primary-50 text-primary-500 hover:bg-primary-100"
          style={{ 
            backgroundColor: 'var(--primary-50)',
            color: 'var(--primary-500)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-100)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-50)'}
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
                  className={`flex items-center p-3 rounded-xl group min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
                    isActive 
                      ? 'bg-gray-100 text-gray-900 dark:bg-gray-100 dark:text-black' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon 
                    size={20} 
                    className={`shrink-0 ${isActive ? 'text-gray-900 dark:text-black' : 'text-slate-400 dark:text-slate-500'}`}
                    onMouseEnter={(e) => !isActive && (e.currentTarget.style.color = 'var(--primary-500)')}
                    onMouseLeave={(e) => !isActive && (e.currentTarget.style.color = '')}
                    aria-hidden="true" 
                  />
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

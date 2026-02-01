'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, ShoppingBag, Layers, FileText, 
  Users, UserCheck, ShoppingCart, Settings, 
  ShieldCheck, MousePointer2, Home, 
  Tag, Menu, Activity, Store, Palette, Star,
  Ticket, Megaphone, Gift, Search, Ruler, Info, ChevronDown
} from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useStoreConfig } from './StoreConfigContext';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  isDark?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggle, isDark = false }) => {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { config, loading } = useStoreConfig();
  const sidebarId = useId();
  
  // Use config values but NEVER fallback to hardcoded colors!
  // CSS variables from SSR are already in :root
  const storeName = config.store_name || 'Admin Panel';
  const storeLogo = config.store_logo;

  const groups = useMemo(
    () => [
    {
      label: t('nav.dashboard'),
      items: [
        { name: t('nav.default'), path: '/dashboard', icon: LayoutDashboard },
        { name: t('nav.analytics'), path: '/dashboard/tracking', icon: Activity },
      ]
    },
    {
      label: t('nav.inventory') || 'Sản phẩm & Kho',
      items: [
        { name: t('nav.products'), path: '/dashboard/products', icon: ShoppingBag },
        { name: t('nav.categories'), path: '/dashboard/categories', icon: Layers },
        { name: t('nav.colors'), path: '/dashboard/colors', icon: Palette },
        { name: t('nav.sizeCharts') || 'Bảng size', path: '/dashboard/settings/size-charts', icon: Ruler },
      ]
    },
    {
      label: 'Bán hàng',
      items: [
        { name: t('nav.orders'), path: '/dashboard/orders', icon: ShoppingCart },
        { name: t('nav.customers'), path: '/dashboard/customers', icon: UserCheck },
        { name: t('nav.cartTracker'), path: '/dashboard/cart-tracking', icon: MousePointer2 },
        { name: t('nav.reviews'), path: '/dashboard/reviews', icon: Star },
      ]
    },
    {
      label: t('nav.marketing') || 'Tiếp thị',
      items: [
        { name: t('nav.coupons'), path: '/dashboard/coupons', icon: Ticket },
        { name: t('nav.campaigns'), path: '/dashboard/campaigns', icon: Megaphone },
        { name: t('nav.rewards'), path: '/dashboard/rewards', icon: Gift },
      ]
    },
    {
      label: 'Nội dung & Giao diện',
      items: [
        { name: t('nav.blogPosts'), path: '/dashboard/posts', icon: FileText },
        { name: t('nav.postTags'), path: '/dashboard/post-categories', icon: Tag },
        { name: t('nav.homeLayout'), path: '/dashboard/home-component', icon: Home },
        { name: t('nav.aboutPage'), path: '/dashboard/about', icon: Info },
        { name: t('nav.search') || 'Tìm kiếm', path: '/dashboard/search', icon: Search },
      ]
    },
    {
      label: t('nav.system'),
      items: [
        { name: t('nav.staffUsers'), path: '/dashboard/staff', icon: Users },
        { name: t('nav.roles'), path: '/dashboard/roles', icon: ShieldCheck },
        { name: t('nav.settings'), path: '/dashboard/settings', icon: Settings },
      ]
    }
    ],
    [t]
  );

  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(null);

  useEffect(() => {
    const activeGroupIndex = groups.findIndex((g) => g.items.some((i) => i.path === pathname));
    setOpenGroupIndex(activeGroupIndex >= 0 ? activeGroupIndex : 0);
  }, [groups, pathname]);

  return (
    <aside 
      className={`${isOpen ? 'w-64' : 'w-20'} transition-[width] duration-200 flex flex-col h-full shadow-sm z-50`}
      style={{
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderRight: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`
      }}
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
              <span 
                className="text-base md:text-lg font-black tracking-tight"
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
              >
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
          className="p-2 md:p-2.5 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
          style={{ 
            backgroundColor: isDark ? '#1e293b' : 'var(--primary-50)',
            color: 'var(--primary-500)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? '#334155' : 'var(--primary-100)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : 'var(--primary-50)'}
        >
          <Menu size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 md:px-4 space-y-4 md:space-y-6 pb-8 scrollbar-thin" aria-label="Main navigation">
        {groups.map((group, gIdx) => (
          <div
            key={gIdx}
            className={`space-y-1 ${openGroupIndex === gIdx ? 'showMenu' : ''}`}
            role="group"
            aria-label={group.label}
          >
            <button
              type="button"
              onClick={() => setOpenGroupIndex((prev) => (prev === gIdx ? null : gIdx))}
              aria-expanded={openGroupIndex === gIdx}
              aria-controls={`${sidebarId}-submenu-${gIdx}`}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
                isOpen ? '' : 'justify-center'
              }`}
              style={{
                color: isDark ? '#64748b' : '#64748b',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
                e.currentTarget.style.color = isDark ? '#e2e8f0' : '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = isDark ? '#64748b' : '#64748b';
              }}
            >
              {isOpen && (
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {group.label}
                </span>
              )}
              {isOpen && (
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`shrink-0 transition-transform ${openGroupIndex === gIdx ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            <ul
              id={`${sidebarId}-submenu-${gIdx}`}
              className={`sub-menu ${openGroupIndex === gIdx ? 'block' : 'hidden'} space-y-1`}
            >
              {group.items.map((item) => {
              const isActive = pathname === item.path;
              
              const getItemStyles = () => {
                if (isActive) {
                  return {
                    backgroundColor: isDark ? 'rgba(var(--primary-500-rgb, 244, 63, 94), 0.2)' : 'rgba(var(--primary-500-rgb, 244, 63, 94), 0.1)',
                    color: isDark ? 'var(--primary-400)' : 'var(--primary-600)'
                  };
                }
                return {
                  backgroundColor: 'transparent',
                  color: isDark ? '#94a3b8' : '#334155'
                };
              };
              
              const getIconColor = () => {
                if (isActive) return 'var(--primary-500)';
                return isDark ? '#64748b' : '#64748b';
              };

              return (
                <li key={item.path} className="nav-item">
                  <Link
                    href={item.path}
                    aria-label={item.name}
                    aria-current={isActive ? 'page' : undefined}
                    className="flex items-center p-3 rounded-xl group min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                    style={getItemStyles()}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
                        e.currentTarget.style.color = isDark ? '#e2e8f0' : '#0f172a';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const styles = getItemStyles();
                      e.currentTarget.style.backgroundColor = styles.backgroundColor;
                      e.currentTarget.style.color = styles.color;
                    }}
                  >
                    <item.icon
                      size={20}
                      className="shrink-0"
                      style={{ color: getIconColor() }}
                      aria-hidden="true"
                    />
                    {isOpen && (
                      <span className="ml-3 text-xs md:text-[13px] font-semibold tracking-tight">
                        {item.name}
                      </span>
                    )}
                    {isActive && isOpen && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" aria-hidden="true"></div>
                    )}
                  </Link>
                </li>
              );
            })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

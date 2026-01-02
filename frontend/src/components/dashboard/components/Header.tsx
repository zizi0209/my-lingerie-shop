
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Moon, Sun, Languages, Settings as SettingsIcon, User, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import SearchInput from './SearchInput';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { User as UserType } from '@/lib/adminApi';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [user, setUser] = useState<UserType | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get<{ success: boolean; data: UserType }>('/users/profile');
        if (response.success) {
          setUser(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    api.removeToken();
    router.push('/admin/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-3 md:py-4">
      <div className="flex items-center justify-between gap-3 md:gap-4">
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <SearchInput 
            placeholder={t('common.search')}
            className="flex-1"
          />
          <button 
            aria-label="Cài đặt tìm kiếm"
            className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-500 dark:text-slate-400 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            style={{
              ['--hover-bg' as string]: 'var(--primary-50)',
              ['--hover-color' as string]: 'var(--primary-500)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = '';
            }}
          >
            <SettingsIcon size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2 md:space-x-2">
          <button 
            onClick={toggleLanguage}
            aria-label={`Chuyển ngôn ngữ - Hiện tại: ${language === 'vi' ? 'Tiếng Việt' : 'English'}`}
            className="flex items-center space-x-2 px-3 py-2 text-slate-500 dark:text-slate-400 rounded-xl min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = '';
            }}
          >
            <Languages size={18} aria-hidden="true" />
            <span className="text-xs font-black uppercase tracking-widest">{language}</span>
          </button>
          
          <button 
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
            className="p-2 text-slate-500 dark:text-slate-400 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = '';
            }}
          >
            {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          </button>
          
          <button 
            aria-label="Thông báo - Có 1 thông báo mới"
            className="p-2 text-slate-500 dark:text-slate-400 rounded-xl relative min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = '';
            }}
          >
            <Bell size={18} aria-hidden="true" />
            <span 
              className="absolute top-2 right-2 w-2 h-2 rounded-full border-2 border-white dark:border-slate-900" 
              style={{ backgroundColor: 'var(--primary-500)' }}
              aria-label="Có thông báo mới"
            ></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label="Menu tài khoản"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              className="flex items-center space-x-2 px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-purple-500 rounded-full flex items-center justify-center shrink-0" aria-hidden="true">
                <User size={16} className="text-white" aria-hidden="true" />
              </div>
              <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                {user?.name || user?.email || 'Admin'}
              </span>
              <ChevronDown size={16} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''} shrink-0`} aria-hidden="true" />
            </button>

            {dropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50"
                role="menu"
                aria-label="Menu tài khoản"
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {user?.name || 'Admin User'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-full">
                      {user.role.name}
                    </span>
                  )}
                </div>
                
                <Link
                  href="/dashboard/profile"
                  role="menuitem"
                  aria-label="Quản lý hồ sơ"
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-inset"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={16} aria-hidden="true" />
                  <span>{language === 'vi' ? 'Quản lý hồ sơ' : 'Manage Profile'}</span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  aria-label="Đăng xuất"
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-inset"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>{language === 'vi' ? 'Đăng xuất' : 'Logout'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

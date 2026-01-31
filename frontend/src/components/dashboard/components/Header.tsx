
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
  isDark?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isDark = false }) => {
  const { toggleTheme } = useTheme();
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
    <header 
      className="sticky top-0 z-30 backdrop-blur-md px-4 md:px-8 py-3 md:py-4"
      style={{
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`
      }}
    >
      <div className="flex items-center justify-between gap-3 md:gap-4">
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <SearchInput 
            placeholder={t('common.search')}
            className="flex-1"
            isDark={isDark}
          />
          <button 
            aria-label="Cài đặt tìm kiếm"
            className="p-2 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            style={{
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
              color: isDark ? '#94a3b8' : '#64748b'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(var(--primary-500-rgb, 244, 63, 94), 0.2)' : 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc';
              e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
            }}
          >
            <SettingsIcon size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2 md:space-x-2">
          <button 
            onClick={toggleLanguage}
            aria-label={`Chuyển ngôn ngữ - Hiện tại: ${language === 'vi' ? 'Tiếng Việt' : 'English'}`}
            className="flex items-center space-x-2 px-3 py-2 rounded-xl min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(var(--primary-500-rgb, 244, 63, 94), 0.2)' : 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
            }}
          >
            <Languages size={18} aria-hidden="true" />
            <span className="text-xs font-black uppercase tracking-widest">{language}</span>
          </button>
          
          <button 
            onClick={toggleTheme}
            aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            className="p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(var(--primary-500-rgb, 244, 63, 94), 0.2)' : 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
            }}
          >
            {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          
          <button 
            aria-label="Thông báo - Có 1 thông báo mới"
            className="p-2 rounded-xl relative min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all"
            style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDark ? 'rgba(var(--primary-500-rgb, 244, 63, 94), 0.2)' : 'var(--primary-50)';
              e.currentTarget.style.color = 'var(--primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDark ? '#94a3b8' : '#64748b';
            }}
          >
            <Bell size={18} aria-hidden="true" />
            <span 
              className="absolute top-2 right-2 w-2 h-2 rounded-full border-2" 
              style={{ 
                backgroundColor: 'var(--primary-500)',
                borderColor: isDark ? '#0f172a' : '#ffffff'
              }}
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
              className="flex items-center space-x-2 px-3 py-2 rounded-xl transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              style={{ color: isDark ? '#cbd5e1' : '#475569' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
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
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg py-2 z-50"
                style={{
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`
                }}
                role="menu"
                aria-label="Menu tài khoản"
              >
                <div 
                  className="px-4 py-3"
                  style={{ borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}
                >
                  <p 
                    className="text-sm font-medium truncate"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  >
                    {user?.name || 'Admin User'}
                  </p>
                  <p 
                    className="text-xs truncate"
                    style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  >
                    {user?.email}
                  </p>
                  {user?.role && (
                    <span 
                      className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: isDark ? 'rgba(244, 63, 94, 0.2)' : '#ffe4e6',
                        color: isDark ? '#fb7185' : '#e11d48'
                      }}
                    >
                      {user.role.name}
                    </span>
                  )}
                </div>
                
                <Link
                  href="/dashboard/profile"
                  role="menuitem"
                  aria-label="Quản lý hồ sơ"
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-inset"
                  style={{ color: isDark ? '#cbd5e1' : '#334155' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={16} aria-hidden="true" />
                  <span>{language === 'vi' ? 'Quản lý hồ sơ' : 'Manage Profile'}</span>
                </Link>
                
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  aria-label="Đăng xuất"
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-inset"
                  style={{ color: isDark ? '#f87171' : '#dc2626' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
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


import React from 'react';
import { Bell, Moon, Sun, Languages, Settings as SettingsIcon } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';
import SearchInput from './SearchInput';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <SearchInput 
            placeholder={t('common.search')}
            className="flex-1"
          />
          <button className="p-2 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500">
            <SettingsIcon size={16} />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleLanguage}
            className="flex items-center space-x-2 px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            title="Toggle Language"
          >
            <Languages size={18} />
            <span className="text-xs font-black uppercase tracking-widest">{language}</span>
          </button>
          
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-400" />}
          </button>
          
          <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

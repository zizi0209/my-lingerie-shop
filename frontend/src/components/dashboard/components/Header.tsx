"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, Moon, Sun, Languages, Settings } from "lucide-react";
import { useTheme } from "./ThemeContext";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
      title="Toggle Theme"
    >
      {theme === "light" ? (
        <Moon size={18} />
      ) : (
        <Sun size={18} className="text-amber-400" />
      )}
    </button>
  );
};

const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative hidden md:flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 group focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
          <Search className="text-slate-400 dark:text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-full bg-transparent py-2 px-3 outline-none text-sm dark:text-slate-200 placeholder:text-slate-400"
          />
          <button className="p-1.5 bg-white dark:bg-slate-700 rounded-lg shadow-sm hover:text-rose-500 transition-colors">
            <Settings size={14} />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
            <Languages size={18} />
          </button>

          <ThemeToggleButton />

          <button className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

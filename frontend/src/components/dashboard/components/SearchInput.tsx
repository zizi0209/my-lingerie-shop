import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
  debounceMs?: number;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder = 'Search...', 
  value: controlledValue,
  onChange,
  onSearch,
  className = '',
  debounceMs = 500
}) => {
  const [localValue, setLocalValue] = useState(controlledValue || '');

  useEffect(() => {
    if (controlledValue !== undefined) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  // Debounce search
  useEffect(() => {
    if (onSearch) {
      const timer = setTimeout(() => {
        onSearch(localValue);
      }, debounceMs);

      return () => clearTimeout(timer);
    }
  }, [localValue, onSearch, debounceMs]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  return (
    <div className={`relative ${className}`}>
      <Search 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" 
        size={18} 
      />
      <input 
        type="text" 
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-4 py-2.5 
          bg-white dark:bg-slate-800
          border border-slate-200 dark:border-slate-700
          rounded-xl 
          text-sm 
          text-slate-900 dark:text-slate-200
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          outline-none 
          focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50
        "
      />
    </div>
  );
};

export default SearchInput;

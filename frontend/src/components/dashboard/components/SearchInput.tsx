import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  className?: string;
  debounceMs?: number;
  isDark?: boolean;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder = 'Search...', 
  value: controlledValue,
  onChange,
  onSearch,
  className = '',
  debounceMs = 500,
  isDark = false
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
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" 
        size={18} 
        style={{ color: isDark ? '#64748b' : '#94a3b8' }}
      />
      <input 
        type="text" 
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50"
        style={{
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          color: isDark ? '#e2e8f0' : '#0f172a'
        }}
      />
    </div>
  );
};

export default SearchInput;

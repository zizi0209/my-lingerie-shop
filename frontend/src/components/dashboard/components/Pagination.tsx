'use client';

import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  className?: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showInfo = true,
  className = '',
}) => {
  const [goToPage, setGoToPage] = useState('');

  const handleGoToPage = useCallback(() => {
    const page = parseInt(goToPage, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setGoToPage('');
    }
  }, [goToPage, totalPages, onPageChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  }, [handleGoToPage]);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Info */}
      {showInfo && totalItems !== undefined && itemsPerPage !== undefined && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Hiển thị {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
        </div>
      )}
      
      {!showInfo && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Trang {currentPage} / {totalPages}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Trang trước"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Current Page Indicator */}
        <div className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 rounded-lg">
          {currentPage} / {totalPages}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
          title="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight size={14} />
        </button>

        {/* Go to Page */}
        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">Đi tới:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={goToPage}
            onChange={(e) => setGoToPage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="#"
            className="w-14 px-2 py-1.5 text-xs text-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleGoToPage}
            disabled={!goToPage || parseInt(goToPage) < 1 || parseInt(goToPage) > totalPages}
            className="px-2 py-1.5 text-xs font-medium bg-primary-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            Go
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;

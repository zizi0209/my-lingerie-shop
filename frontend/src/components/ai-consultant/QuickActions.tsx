 'use client';
 
 interface QuickActionsProps {
   onSelect: (message: string) => void;
   disabled?: boolean;
 }
 
 const QUICK_ACTIONS = [
   { label: 'Tư vấn size', message: 'Tôi muốn được tư vấn chọn size phù hợp' },
   { label: 'Sản phẩm mới', message: 'Có sản phẩm mới nào không?' },
   { label: 'Khuyến mãi', message: 'Hiện có chương trình khuyến mãi gì không?' },
   { label: 'Chất liệu', message: 'Tư vấn về chất liệu sản phẩm' },
 ];
 
 export function QuickActions({ onSelect, disabled }: QuickActionsProps) {
   return (
     <div className="flex flex-wrap gap-2 p-3">
       {QUICK_ACTIONS.map((action, index) => (
         <button
           key={index}
           onClick={() => onSelect(action.message)}
           disabled={disabled}
           className="px-3 py-1.5 text-xs rounded-full
                      bg-pink-50 dark:bg-pink-900/20 
                      text-pink-600 dark:text-pink-400
                      border border-pink-200 dark:border-pink-800
                      hover:bg-pink-100 dark:hover:bg-pink-900/30
                      transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed"
         >
           {action.label}
         </button>
       ))}
     </div>
   );
 }

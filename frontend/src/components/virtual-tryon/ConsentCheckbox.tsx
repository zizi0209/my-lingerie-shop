 'use client';
'use client';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ConsentCheckbox({ checked, onChange }: ConsentCheckboxProps) {
  return (
    <label className="flex items-start gap-2 sm:gap-3 cursor-pointer p-2 sm:p-0 -m-2 sm:m-0 rounded-lg active:bg-gray-50 sm:active:bg-transparent">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-5 h-5 sm:w-4 sm:h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500 flex-shrink-0"
      />
      <span className="text-xs sm:text-sm text-gray-600">
        Tôi đồng ý xử lý ảnh. Ảnh <strong>KHÔNG được lưu trữ</strong>.
      </span>
    </label>
  );
}
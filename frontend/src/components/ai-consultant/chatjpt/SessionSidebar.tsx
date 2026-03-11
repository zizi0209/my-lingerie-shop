'use client';

import type { ChatSession } from './chatTypes';

interface SessionSidebarProps {
  sessions: ChatSession[];
  activeChatId: string;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
  onClose?: () => void;
}

export function SessionSidebar({
  sessions,
  activeChatId,
  onCreate,
  onSelect,
  onDelete,
  className,
  onClose,
}: SessionSidebarProps) {
  return (
    <aside
      className={`rounded-3xl border border-pink-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${
        className ?? ''
      }`}
    >
      {onClose && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-pink-400">LỊCH SỬ CHAT</p>
          <button
            type="button"
            className="rounded-full border border-pink-100 bg-pink-50 px-3 py-2 text-xs font-medium text-pink-600 transition hover:border-pink-200 hover:text-pink-700 dark:border-gray-800 dark:bg-gray-800 dark:text-pink-200 dark:hover:text-white"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      )}

      <button
        type="button"
        className="mb-3 w-full rounded-2xl border border-pink-100 bg-pink-50 px-3 py-3 text-sm font-medium text-pink-700 transition hover:border-pink-200 hover:text-pink-800 dark:border-gray-800 dark:bg-gray-800 dark:text-pink-200 dark:hover:text-white"
        onClick={onCreate}
      >
        + Chat mới
      </button>

      <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
        {sessions.map((chat) => (
          <button
            key={chat.id}
            type="button"
            className={`w-full rounded-2xl border px-3 py-3 text-left text-sm transition ${
              chat.id === activeChatId
                ? 'border-pink-200 bg-pink-100 text-gray-900 dark:border-pink-500/40 dark:bg-pink-500/10 dark:text-white'
                : 'border-pink-100 bg-white text-gray-600 hover:border-pink-200 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
            onClick={() => onSelect(chat.id)}
          >
            <p className="truncate font-medium">{chat.title}</p>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(chat.updatedAt).toLocaleString('vi-VN')}
            </p>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-2xl border border-rose-200 bg-white px-3 py-3 text-sm font-medium text-rose-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-rose-900/40 dark:bg-gray-900 dark:text-rose-300 dark:hover:text-rose-200"
        onClick={() => onDelete(activeChatId)}
        disabled={!activeChatId}
      >
        Xóa hội thoại
      </button>
    </aside>
  );
}

'use client';

import type { ModelOption } from './chatTypes';

interface ModelPickerModalProps {
  open: boolean;
  models: ModelOption[];
  selectedModel?: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

export function ModelPickerModal({
  open,
  models,
  selectedModel,
  onSelect,
  onClose,
}: ModelPickerModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-5xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-4xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-widest text-pink-500">// MODEL AI</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              Danh sách model khả dụng
            </h3>
          </div>
          <button
            type="button"
            className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-300 transition hover:text-gray-900 dark:hover:text-white"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>

        <div className="mt-4">
          <div className="max-h-[48vh] overflow-y-auto border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 rounded-3xl scrollbar-thin">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`w-full border p-3 text-left transition-all duration-300 rounded-2xl ${
                    selectedModel === model.id
                      ? 'border-pink-400 bg-pink-50 dark:bg-pink-500/10'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-rose-400'
                  }`}
                  onClick={() => onSelect(model.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {model.label}
                    </p>
                    <p className="text-xs text-gray-400">{model.contextWindow ?? 'N/A'}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{model.provider}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

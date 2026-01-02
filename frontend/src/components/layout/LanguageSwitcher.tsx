"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg dark:bg-gray-800 bg-gray-100 dark:text-gray-300">
      <Globe size={14} />
      <div className="flex gap-0.5">
        <button
          onClick={() => setLanguage("vi")}
          className={`px-1.5 py-1 text-xs font-medium rounded transition ${
            language === "vi"
              ? "bg-primary-500 text-white"
              : "hover:text-primary-500 dark:hover:text-primary-400"
          }`}
        >
          VI
        </button>
        <button
          onClick={() => setLanguage("en")}
          className={`px-1.5 py-1 text-xs font-medium rounded transition ${
            language === "en"
              ? "bg-primary-500 text-white"
              : "hover:text-primary-500 dark:hover:text-primary-400"
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
}

import type { EditorThemeClasses } from 'lexical';

export const editorTheme: EditorThemeClasses = {
  root: 'lexical-root',
  paragraph: 'mb-2 last:mb-0 leading-relaxed',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline decoration-2',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
    code: 'bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-sm text-rose-600 dark:text-rose-400',
  },
  heading: {
    h1: 'text-3xl font-black mb-4 text-slate-900 dark:text-white leading-tight',
    h2: 'text-2xl font-bold mb-3 text-slate-900 dark:text-white leading-snug',
    h3: 'text-xl font-bold mb-2 text-slate-900 dark:text-white',
  },
  list: {
    ul: 'list-disc ml-6 mb-3 space-y-1',
    ol: 'list-decimal ml-6 mb-3 space-y-1',
    listitem: 'pl-1',
    nested: {
      listitem: 'list-none',
    },
  },
  link: 'text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 underline cursor-pointer',
  quote: 'border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-2 italic text-slate-600 dark:text-slate-400 my-4 bg-slate-50 dark:bg-slate-800/50 rounded-r',
};

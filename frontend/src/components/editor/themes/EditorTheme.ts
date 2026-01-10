import type { EditorThemeClasses } from 'lexical';

export const editorTheme: EditorThemeClasses = {
  root: 'lexical-root',
  paragraph: 'mb-2 last:mb-0',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    underlineStrikethrough: 'underline line-through',
    code: 'bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-sm',
  },
  heading: {
    h1: 'text-2xl font-bold mb-3 text-slate-900 dark:text-white',
    h2: 'text-xl font-bold mb-2 text-slate-900 dark:text-white',
    h3: 'text-lg font-bold mb-2 text-slate-900 dark:text-white',
  },
  list: {
    ul: 'list-disc list-inside mb-2 space-y-1',
    ol: 'list-decimal list-inside mb-2 space-y-1',
    listitem: 'ml-4',
    nested: {
      listitem: 'ml-4',
    },
  },
  link: 'text-rose-500 hover:text-rose-600 underline cursor-pointer',
  quote: 'border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic text-slate-600 dark:text-slate-400 my-2',
};

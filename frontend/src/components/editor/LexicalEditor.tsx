'use client';

import { useCallback, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { LinkNode } from '@lexical/link';

import ToolbarPlugin from './plugins/ToolbarPlugin';
import OnChangePlugin from './plugins/OnChangePlugin';
import InitialContentPlugin from './plugins/InitialContentPlugin';
import AutoFocusPlugin from './plugins/AutoFocusPlugin';
import ProductPlugin from './plugins/ProductPlugin';
import { editorTheme } from './themes/EditorTheme';
import { ProductNode } from './nodes';

interface LexicalEditorProps {
  initialValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
}

export default function LexicalEditor({
  initialValue,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '150px',
  autoFocus = false,
}: LexicalEditorProps) {
  // Memoize config to prevent re-initialization
  const initialConfig = useMemo(
    () => ({
      namespace: 'RichTextEditor',
      theme: editorTheme,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, ProductNode],
      onError: (error: Error) => {
        console.error('Lexical error:', error);
      },
    }),
    [] // Empty deps is fine - config should be stable
  );

  // Memoize onChange to prevent unnecessary re-renders
  const handleChange = useCallback(
    (html: string) => {
      onChange(html);
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig} key="lexical-editor">
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none p-4 text-slate-900 dark:text-slate-200 prose dark:prose-invert max-w-none prose-p:mb-2 prose-p:last:mb-0"
                style={{ minHeight }}
                aria-placeholder={placeholder}
                placeholder={
                  <div className="absolute top-4 left-4 text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                    {placeholder}
                  </div>
                }
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <ProductPlugin />
        <OnChangePlugin onChange={handleChange} />
        {initialValue && <InitialContentPlugin initialHtml={initialValue} />}
        {autoFocus && <AutoFocusPlugin />}
      </div>
    </LexicalComposer>
  );
}

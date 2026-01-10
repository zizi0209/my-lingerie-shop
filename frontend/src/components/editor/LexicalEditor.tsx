'use client';

import { useEffect, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListNode, ListItemNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import ToolbarPlugin from './plugins/ToolbarPlugin';
import { editorTheme } from './themes/EditorTheme';

interface LexicalEditorProps {
  initialValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Plugin to handle onChange
function OnChangePlugin({ onChange }: { onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor);
        // Remove empty paragraph wrapper if content is empty
        const cleanHtml = html === '<p class="mb-2 last:mb-0"><br></p>' ? '' : html;
        onChange(cleanHtml);
      });
    });
  }, [editor, onChange]);

  return null;
}

// Plugin to load initial HTML content
function InitialContentPlugin({ initialValue }: { initialValue?: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!initialValue) return;

    editor.update(() => {
      const root = $getRoot();
      // Only set if empty
      if (root.getTextContent().trim() === '') {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialValue, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        root.clear();
        $insertNodes(nodes);
      }
    });
  }, [editor, initialValue]);

  return null;
}

export default function LexicalEditor({
  initialValue,
  onChange,
  placeholder = 'Nhập nội dung...',
  minHeight = '150px',
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: 'RichTextEditor',
    theme: editorTheme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: (error: Error) => {
      console.error('Lexical error:', error);
    },
  };

  // Memoize onChange to prevent unnecessary re-renders
  const handleChange = useCallback(
    (html: string) => {
      onChange(html);
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="outline-none p-4 text-slate-900 dark:text-slate-200"
                style={{ minHeight }}
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-slate-400 dark:text-slate-500 pointer-events-none select-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={handleChange} />
        <InitialContentPlugin initialValue={initialValue} />
      </div>
    </LexicalComposer>
  );
}

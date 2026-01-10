'use client';

import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes } from '@lexical/html';

interface OnChangePluginProps {
  onChange: (html: string) => void;
}

export default function OnChangePlugin({ onChange }: OnChangePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState, dirtyElements, dirtyLeaves }) => {
      // Skip if only selection changed (no content changes)
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }

      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor);
        // Clean empty content
        const cleanHtml = html === '<p class="mb-2 last:mb-0"><br></p>' ? '' : html;
        onChange(cleanHtml);
      });
    });
  }, [editor, onChange]);

  return null;
}

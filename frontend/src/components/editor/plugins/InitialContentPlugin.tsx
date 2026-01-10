'use client';

import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromDOM } from '@lexical/html';
import { $getRoot, $insertNodes } from 'lexical';

interface InitialContentPluginProps {
  initialHtml?: string;
}

export default function InitialContentPlugin({ initialHtml }: InitialContentPluginProps) {
  const [editor] = useLexicalComposerContext();
  const initialized = useRef(false);

  useEffect(() => {
    // Skip if no initial content or already initialized
    if (!initialHtml || initialized.current) return;

    editor.update(() => {
      const root = $getRoot();
      // Only set if editor is empty
      if (root.getTextContent().trim() === '') {
        const parser = new DOMParser();
        const dom = parser.parseFromString(initialHtml, 'text/html');
        const nodes = $generateNodesFromDOM(editor, dom);
        root.clear();
        $insertNodes(nodes);
        initialized.current = true;
      }
    });
  }, [editor, initialHtml]);

  return null;
}

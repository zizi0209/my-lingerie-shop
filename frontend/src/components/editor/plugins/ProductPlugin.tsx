'use client';

import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  COMMAND_PRIORITY_LOW,
  TextNode,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from 'lexical';
import { $createProductNode } from '../nodes';
import { mergeRegister } from '@lexical/utils';
import ProductSearchModal from './ProductSearchModal';

const SLASH_COMMAND_REGEX = /^\/product\s*$/;

export default function ProductPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{
    key: string;
    offset: number;
  } | null>(null);

  useEffect(() => {
    return mergeRegister(
      editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
        const text = textNode.getTextContent();
        
        // Check nếu user gõ "/product"
        if (SLASH_COMMAND_REGEX.test(text)) {
          const parent = textNode.getParent();
          if (parent) {
            // Lưu vị trí để insert sau khi chọn product
            setPendingPosition({
              key: textNode.getKey(),
              offset: 0,
            });
            setIsModalOpen(true);
          }
        }
      })
    );
  }, [editor]);

  const handleProductSelect = (
    productId: number,
    displayType: 'inline-card' | 'sidebar' | 'end-collection',
    customNote?: string,
    isAd?: boolean
  ) => {
    editor.update(() => {
      if (pendingPosition) {
        // Tìm và xóa text "/product"
        const textNode = editor.getElementByKey(pendingPosition.key);
        if (textNode) {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const nodes = selection.getNodes();
            nodes.forEach((node) => {
              if (node instanceof TextNode) {
                const text = node.getTextContent();
                if (SLASH_COMMAND_REGEX.test(text)) {
                  node.remove();
                }
              }
            });
          }
        }
      }

      // Insert ProductNode
      const productNode = $createProductNode(productId, displayType, customNote, isAd ?? false);
      const paragraphNode = $createParagraphNode();
      
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([productNode, paragraphNode]);
      }
    });

    // Reset state
    setIsModalOpen(false);
    setPendingPosition(null);
  };

  const handleModalClose = () => {
    // Xóa text "/product" nếu user cancel
    editor.update(() => {
      if (pendingPosition) {
        const textNode = editor.getElementByKey(pendingPosition.key);
        if (textNode) {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const nodes = selection.getNodes();
            nodes.forEach((node) => {
              if (node instanceof TextNode) {
                const text = node.getTextContent();
                if (SLASH_COMMAND_REGEX.test(text)) {
                  node.remove();
                }
              }
            });
          }
        }
      }
    });

    setIsModalOpen(false);
    setPendingPosition(null);
  };

  return (
    <>
      {isModalOpen && (
        <ProductSearchModal onSelect={handleProductSelect} onClose={handleModalClose} />
      )}
    </>
  );
}

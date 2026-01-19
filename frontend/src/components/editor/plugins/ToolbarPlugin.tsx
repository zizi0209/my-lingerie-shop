'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode,
} from '@lexical/list';
import { $isHeadingNode, $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $getNearestNodeOfType } from '@lexical/utils';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Type,
  ShoppingBag,
} from 'lucide-react';
import { $createProductNode } from '../nodes/ProductNode';
import ProductSearchModal from './ProductSearchModal';

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3';

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  // Text format states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  
  // Block states
  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [listType, setListType] = useState<'bullet' | 'number' | null>(null);
  
  // History states
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    // Text formats
    setIsBold(selection.hasFormat('bold'));
    setIsItalic(selection.hasFormat('italic'));
    setIsUnderline(selection.hasFormat('underline'));
    setIsStrikethrough(selection.hasFormat('strikethrough'));

    // Block type detection
    const anchorNode = selection.anchor.getNode();
    const element = anchorNode.getKey() === 'root'
      ? anchorNode
      : anchorNode.getTopLevelElementOrThrow();

    if ($isHeadingNode(element)) {
      setBlockType(element.getTag() as BlockType);
    } else {
      setBlockType('paragraph');
    }

    // List type detection
    if ($isListNode(element)) {
      const type = element.getListType();
      setListType(type === 'bullet' ? 'bullet' : 'number');
    } else {
      const parent = anchorNode.getParent();
      if (parent) {
        const listNode = $getNearestNodeOfType(parent, ListNode);
        setListType(listNode ? (listNode.getListType() === 'bullet' ? 'bullet' : 'number') : null);
      } else {
        setListType(null);
      }
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => updateToolbar());
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  // Block type handler
  const formatHeading = (tag: HeadingTagType | 'paragraph') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (tag === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(tag));
        }
      }
    });
  };

  // List toggle handler
  const toggleList = (type: 'bullet' | 'number') => {
    if (listType === type) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(
        type === 'bullet' ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined
      );
    }
  };

  // Insert product handler
  const handleInsertProduct = (
    productId: number,
    displayType: 'inline-card' | 'sidebar' | 'end-collection',
    customNote?: string
  ) => {
    editor.update(() => {
      const productNode = $createProductNode(productId, displayType, customNote);
      const paragraphNode = $createParagraphNode();
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([productNode, paragraphNode]);
      }
    });
    setShowProductModal(false);
  };

  const ToolButton = ({
    active,
    disabled,
    onClick,
    children,
    title,
  }: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
          : disabled
          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => (
    <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
  );

  return (
    <div className="flex items-center gap-0.5 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-wrap">
      {/* Undo/Redo */}
      <ToolButton
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={16} />
      </ToolButton>
      <ToolButton
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 size={16} />
      </ToolButton>

      <Divider />

      {/* Text formatting */}
      <ToolButton
        active={isBold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold size={16} />
      </ToolButton>
      <ToolButton
        active={isItalic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic size={16} />
      </ToolButton>
      <ToolButton
        active={isUnderline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Underline (Ctrl+U)"
      >
        <Underline size={16} />
      </ToolButton>
      <ToolButton
        active={isStrikethrough}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </ToolButton>

      <Divider />

      {/* Block Type */}
      <ToolButton
        active={blockType === 'paragraph'}
        onClick={() => formatHeading('paragraph')}
        title="Normal Text"
      >
        <Type size={16} />
      </ToolButton>
      <ToolButton
        active={blockType === 'h1'}
        onClick={() => formatHeading('h1')}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </ToolButton>
      <ToolButton
        active={blockType === 'h2'}
        onClick={() => formatHeading('h2')}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </ToolButton>
      <ToolButton
        active={blockType === 'h3'}
        onClick={() => formatHeading('h3')}
        title="Heading 3"
      >
        <Heading3 size={16} />
      </ToolButton>

      <Divider />

      {/* Lists */}
      <ToolButton
        active={listType === 'bullet'}
        onClick={() => toggleList('bullet')}
        title="Bullet List"
      >
        <List size={16} />
      </ToolButton>
      <ToolButton
        active={listType === 'number'}
        onClick={() => toggleList('number')}
        title="Numbered List"
      >
        <ListOrdered size={16} />
      </ToolButton>

      <Divider />

      {/* Alignment */}
      <ToolButton
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        title="Align Left"
      >
        <AlignLeft size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        title="Align Center"
      >
        <AlignCenter size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        title="Align Right"
      >
        <AlignRight size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}
        title="Justify"
      >
        <AlignJustify size={16} />
      </ToolButton>

      <Divider />

      {/* Insert Product */}
      <ToolButton
        onClick={() => setShowProductModal(true)}
        title="Chèn sản phẩm"
      >
        <ShoppingBag size={16} />
      </ToolButton>

      {/* Product Search Modal */}
      {showProductModal && (
        <ProductSearchModal
          onSelect={handleInsertProduct}
          onClose={() => setShowProductModal(false)}
        />
      )}
    </div>
  );
}

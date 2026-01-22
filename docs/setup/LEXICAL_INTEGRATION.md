# LEXICAL EDITOR INTEGRATION PLAN

## 1. Phân tích hiện trạng

### Vị trí cần tích hợp
| Trang | Field hiện tại | Độ ưu tiên |
|-------|---------------|------------|
| **Products.tsx** | `<textarea>` cho `description` (3 rows) | **Cao** |
| **Posts.tsx** | `<textarea>` cho `content` | Cao |

### Dependencies hiện có
```json
{
  "next": "16.0.10",
  "react": "19.2.1",
  "next-themes": "^0.2.1",  // Dark mode support ✅
  "lucide-react": "^0.562.0", // Icons ✅
  "tailwindcss": "^4"
}
```
**Chưa có**: Lexical packages

---

## 2. Vì sao chọn Lexical?

| Tiêu chí | Lexical | React-Quill | TinyMCE |
|----------|---------|-------------|---------|
| Bundle size | ~22KB | ~43KB | ~300KB+ |
| Performance | Excellent | Good | Average |
| Customizable | Full control | Limited | Plugin-based |
| Dark mode | Custom (bạn style) | Khó | Theme pack |
| Meta support | Official | Community | Commercial |
| React 19 compat | ✅ | ⚠️ Issues | ⚠️ |

---

## 3. Kiến trúc tích hợp

```
frontend/src/components/
└── editor/
    ├── LexicalEditor.tsx       # Main wrapper component
    ├── plugins/
    │   ├── ToolbarPlugin.tsx   # B/I/U, Lists, Links, Images
    │   ├── ImagePlugin.tsx     # Drag & drop images
    │   └── OnChangePlugin.tsx  # Sync với form state
    ├── nodes/
    │   └── ImageNode.tsx       # Custom image node (optional)
    └── themes/
        └── EditorTheme.ts      # Tailwind-compatible theme
```

---

## 4. Packages cần cài

```bash
npm install lexical @lexical/react @lexical/rich-text @lexical/list @lexical/link @lexical/selection @lexical/utils
```

**Giải thích:**
- `lexical` - Core engine
- `@lexical/react` - React bindings (LexicalComposer, plugins)
- `@lexical/rich-text` - Bold, italic, underline, headings
- `@lexical/list` - Bullet/numbered lists
- `@lexical/link` - Hyperlinks
- `@lexical/selection` - Selection utilities
- `@lexical/utils` - Helper functions

---

## 5. Toolbar Features (Đề xuất)

### Phase 1 - Essential (MVP)
- [x] **Bold** (Ctrl+B)
- [x] **Italic** (Ctrl+I)
- [x] **Underline** (Ctrl+U)
- [x] Bullet List
- [x] Numbered List

### Phase 2 - Enhanced
- [ ] Headings (H1, H2, H3)
- [ ] Text alignment (Left, Center, Right)
- [ ] Link insert/edit
- [ ] Blockquote

### Phase 3 - Advanced
- [ ] Image upload (integrate với Cloudinary hiện có)
- [ ] Video embed
- [ ] Code block
- [ ] Table

---

## 6. Code Example - Basic Setup

### LexicalEditor.tsx
```tsx
'use client';

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';

import ToolbarPlugin from './plugins/ToolbarPlugin';
import OnChangePlugin from './plugins/OnChangePlugin';
import { editorTheme } from './themes/EditorTheme';

interface LexicalEditorProps {
  initialValue?: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function LexicalEditor({ 
  initialValue, 
  onChange, 
  placeholder = 'Nhập mô tả chi tiết sản phẩm...' 
}: LexicalEditorProps) {
  const initialConfig = {
    namespace: 'ProductEditor',
    theme: editorTheme,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
    onError: (error: Error) => console.error(error),
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable 
                className="min-h-[150px] p-4 outline-none prose dark:prose-invert max-w-none"
              />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-slate-400 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <OnChangePlugin onChange={onChange} />
      </div>
    </LexicalComposer>
  );
}
```

### ToolbarPlugin.tsx (Simplified)
```tsx
'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  FORMAT_TEXT_COMMAND, 
  $getSelection, 
  $isRangeSelection 
} from 'lexical';
import { 
  INSERT_UNORDERED_LIST_COMMAND, 
  INSERT_ORDERED_LIST_COMMAND 
} from '@lexical/list';
import { useCallback, useEffect, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered } from 'lucide-react';

export default function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => updateToolbar());
    });
  }, [editor, updateToolbar]);

  const ToolButton = ({ 
    active, onClick, children, title 
  }: { 
    active: boolean; 
    onClick: () => void; 
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active 
          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400' 
          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
      <ToolButton
        active={isBold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold size={18} />
      </ToolButton>
      <ToolButton
        active={isItalic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic size={18} />
      </ToolButton>
      <ToolButton
        active={isUnderline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        title="Underline (Ctrl+U)"
      >
        <Underline size={18} />
      </ToolButton>
      
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
      
      <ToolButton
        active={false}
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        title="Bullet List"
      >
        <List size={18} />
      </ToolButton>
      <ToolButton
        active={false}
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        title="Numbered List"
      >
        <ListOrdered size={18} />
      </ToolButton>
    </div>
  );
}
```

---

## 7. Tích hợp vào Products.tsx

### Thay thế textarea hiện tại:
```tsx
// TRƯỚC
<textarea
  value={formData.description}
  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
  rows={3}
  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 ..."
/>

// SAU
<LexicalEditor
  initialValue={formData.description}
  onChange={(html) => setFormData(prev => ({ ...prev, description: html }))}
  placeholder={t.description}
/>
```

---

## 8. Data Flow & Storage

### Option A: Lưu HTML (Đơn giản)
```
Editor → HTML string → Database (text field) → Render với dangerouslySetInnerHTML
```
**Pros**: Dễ implement, render nhanh
**Cons**: XSS risk nếu không sanitize

### Option B: Lưu JSON (Khuyến nghị)
```
Editor → Lexical EditorState (JSON) → Database (JSON field) → Parse lại khi edit
```
**Pros**: An toàn, có thể render server-side
**Cons**: Phức tạp hơn

### Recommendation
Dùng **Option A với DOMPurify** để sanitize HTML trước khi render:
```bash
npm install dompurify @types/dompurify
```

---

## 9. Độ khó & Timeline

| Task | Độ khó | Thời gian |
|------|--------|-----------|
| Setup packages | Easy | 5 min |
| Basic editor component | Medium | 30 min |
| Toolbar plugin | Medium | 45 min |
| Dark mode styling | Easy | 15 min |
| Integration Products.tsx | Easy | 15 min |
| Integration Posts.tsx | Easy | 15 min |
| Image upload plugin | Hard | 1-2 hours |
| Testing & polish | Medium | 30 min |

**Tổng: ~3-4 giờ cho Phase 1 (MVP)**

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| React 19 compatibility issues | High | Check `@lexical/react` changelog, fallback to textarea |
| SSR hydration mismatch | Medium | Dùng `dynamic import` với `ssr: false` |
| Large bundle size | Low | Tree-shaking, lazy load editor |
| XSS từ user content | High | DOMPurify sanitization |

---

## 11. Next Steps

1. **Approve plan này** ✋
2. Cài đặt Lexical packages
3. Tạo LexicalEditor component
4. Tạo ToolbarPlugin với B/I/U và Lists
5. Tích hợp vào Products.tsx (thay textarea description)
6. Test Dark mode compatibility
7. (Optional) Tích hợp vào Posts.tsx

---

## References

- [Lexical Official Docs](https://lexical.dev/docs/getting-started/react)
- [LexKit Templates](https://lexkit.dev/docs/templates/default/)
- [Building Rich Text Editor Guide 2025](https://www.codehall.in/build-your-own-rich-text-editor/)
- [Creating Lexical Plugins](https://jkrsp.com/blog/creating-lexical-plugins)

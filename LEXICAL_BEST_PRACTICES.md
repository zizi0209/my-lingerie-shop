# Lexical Editor Best Practices & HTML Output Guide

## Vấn đề hiện tại

### HTML Output từ Lexical:
```html
<p class="mb-2 last:mb-0 leading-relaxed">
  <span style="white-space: pre-wrap;">
    Chào mừng bạn đến với cửa hàng đồ lót cao cấp.
  </span>
</p>
```

### Sau khi Sanitize (DOMPurify):
```html
<p>
  <span style="white-space: pre-wrap;">
    Chào mừng bạn đến với cửa hàng đồ lót cao cấp.
  </span>
</p>
```

**Vấn đề:**
- ❌ Class attributes bị strip → Mất styling
- ⚠️ `white-space: pre-wrap` style vẫn còn → Cần thiết để preserve line breaks

---

## Giải thích cấu trúc

### 1. Classes từ EditorTheme
```typescript
// frontend/src/components/editor/themes/EditorTheme.ts
export const editorTheme: EditorThemeClasses = {
  paragraph: 'mb-2 last:mb-0 leading-relaxed', // 👈 Thêm vào <p>
  text: {
    bold: 'font-bold',
    italic: 'italic',
  },
  // ...
};
```

### 2. `white-space: pre-wrap` từ Lexical Core
- **Tự động thêm** bởi Lexical khi có line breaks
- **Mục đích**: Preserve whitespace & line breaks
- **Không thể disable** (built-in behavior)

---

## Solutions

### 🎯 Option 1: Allow Safe Classes (Recommended)

**Ưu điểm:**
- ✅ Giữ nguyên styling từ editor
- ✅ An toàn (whitelist classes)
- ✅ Consistent với editor preview

**Cách làm:**

```typescript
// frontend/src/components/dashboard/pages/AboutManagement.tsx

const sanitizeHTML = (html: string): string => {
  if (typeof window === 'undefined') return html;
  const DOMPurify = require('dompurify');
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'h1', 'h2', 'h3',
      'ul', 'ol', 'li',
      'a', 'blockquote', 'span'
    ],
    ALLOWED_ATTR: {
      'p': ['class'],
      'span': ['class', 'style'], // Allow style for white-space
      'a': ['href', 'target', 'rel', 'class'],
      'ul': ['class'],
      'ol': ['class'],
      'li': ['class'],
      'h1': ['class'],
      'h2': ['class'],
      'h3': ['class'],
      'blockquote': ['class'],
    },
    // Only allow Tailwind classes & white-space style
    ALLOWED_STYLES: {
      '*': {
        'white-space': [/^pre-wrap$/]
      }
    }
  });
};
```

---

### 🎨 Option 2: Tailwind Typography (Prose)

**Ưu điểm:**
- ✅ Auto-style all HTML elements
- ✅ Không cần whitelist classes
- ✅ Dark mode support built-in

**Cách làm:**

```typescript
// Strip ALL classes, let prose handle styling
const sanitizeHTML = (html: string): string => {
  if (typeof window === 'undefined') return html;
  const DOMPurify = require('dompurify');
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's',
      'h1', 'h2', 'h3',
      'ul', 'ol', 'li',
      'a', 'blockquote', 'span'
    ],
    ALLOWED_ATTR: {
      'span': ['style'], // Only allow style for white-space
      'a': ['href', 'target', 'rel'],
    },
    ALLOWED_STYLES: {
      '*': {
        'white-space': [/^pre-wrap$/]
      }
    }
  });
};
```

**Render với prose:**
```tsx
<div 
  className="prose dark:prose-invert max-w-none
    prose-p:text-gray-700 dark:prose-p:text-gray-300
    prose-p:leading-relaxed prose-p:mb-3"
  dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
/>
```

---

### 🔒 Option 3: Strict Sanitization + Custom CSS

**Ưu điểm:**
- ✅ Maximum security
- ✅ Full control over styling

**Cách làm:**

```typescript
// Strip everything except basic tags
const sanitizeHTML = (html: string): string => {
  if (typeof window === 'undefined') return html;
  const DOMPurify = require('dompurify');
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: {
      'a': ['href', 'target', 'rel']
    },
    ALLOW_DATA_ATTR: false
  });
};
```

**CSS styling:**
```css
/* globals.css */
.lexical-content p {
  margin-bottom: 0.75rem;
  line-height: 1.75;
  white-space: pre-wrap; /* Preserve line breaks */
}

.lexical-content p:last-child {
  margin-bottom: 0;
}

.lexical-content strong {
  font-weight: 700;
}

.lexical-content em {
  font-style: italic;
}
```

```tsx
<div 
  className="lexical-content"
  dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }}
/>
```

---

## Recommendation Matrix

| Use Case | Recommended Option | Why |
|----------|-------------------|-----|
| **Admin preview** (Dashboard) | Option 1 | Editor styling = preview styling |
| **Public pages** (About, Blog) | Option 2 | Consistent with site design |
| **User-generated content** | Option 3 | Maximum security |

---

## Implementation Plan

### Step 1: Update sanitizeHTML function

**File**: `frontend/src/components/dashboard/pages/AboutManagement.tsx`

```typescript
const sanitizeHTML = (html: string): string => {
  if (typeof window === 'undefined') return html;
  const DOMPurify = require('dompurify');
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'span',
      'h1', 'h2', 'h3',
      'ul', 'ol', 'li',
      'a', 'blockquote'
    ],
    ALLOWED_ATTR: {
      'p': ['class'],
      'span': ['class', 'style'],
      'ul': ['class'],
      'ol': ['class'],
      'li': ['class'],
      'h1': ['class'],
      'h2': ['class'],
      'h3': ['class'],
      'a': ['href', 'target', 'rel', 'class'],
      'blockquote': ['class'],
    },
    ALLOWED_STYLES: {
      'span': {
        'white-space': [/^pre-wrap$/]
      }
    }
  });
};
```

### Step 2: Create shared utility

**File**: `frontend/src/lib/sanitize.ts`

```typescript
import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  allowClasses?: boolean;
  allowStyles?: boolean;
  mode?: 'strict' | 'standard' | 'permissive';
}

export function sanitizeLexicalHTML(html: string, options: SanitizeOptions = {}): string {
  if (typeof window === 'undefined') return html;
  
  const { 
    allowClasses = true, 
    allowStyles = true,
    mode = 'standard' 
  } = options;

  const config: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'span',
      'h1', 'h2', 'h3',
      'ul', 'ol', 'li',
      'a', 'blockquote'
    ],
    ALLOWED_ATTR: {
      'a': ['href', 'target', 'rel'],
    },
  };

  if (allowClasses) {
    config.ALLOWED_ATTR = {
      ...config.ALLOWED_ATTR,
      'p': ['class'],
      'span': ['class'],
      'ul': ['class'],
      'ol': ['class'],
      'li': ['class'],
      'h1': ['class'],
      'h2': ['class'],
      'h3': ['class'],
      'a': [...(config.ALLOWED_ATTR?.['a'] || []), 'class'],
      'blockquote': ['class'],
    };
  }

  if (allowStyles) {
    config.ALLOWED_ATTR = {
      ...config.ALLOWED_ATTR,
      'span': [...(config.ALLOWED_ATTR?.['span'] || []), 'style'],
    };
    config.ALLOWED_STYLES = {
      'span': {
        'white-space': [/^pre-wrap$/]
      }
    };
  }

  return DOMPurify.sanitize(html, config);
}
```

### Step 3: Usage

```typescript
import { sanitizeLexicalHTML } from '@/lib/sanitize';

// Dashboard preview (preserve editor styling)
<div dangerouslySetInnerHTML={{ 
  __html: sanitizeLexicalHTML(content, { 
    allowClasses: true, 
    allowStyles: true 
  }) 
}} />

// Public pages (use prose)
<div 
  className="prose dark:prose-invert max-w-none"
  dangerouslySetInnerHTML={{ 
    __html: sanitizeLexicalHTML(content, { 
      allowClasses: false,
      allowStyles: true 
    }) 
  }} 
/>

// User content (strict)
<div dangerouslySetInnerHTML={{ 
  __html: sanitizeLexicalHTML(content, { 
    allowClasses: false,
    allowStyles: false,
    mode: 'strict' 
  }) 
}} />
```

---

## About `white-space: pre-wrap`

### Tại sao cần thiết?

**Without `pre-wrap`:**
```
Line 1Line 2Line 3
```

**With `pre-wrap`:**
```
Line 1
Line 2
Line 3
```

### Có an toàn không?

✅ **YES** - `white-space: pre-wrap` is safe:
- Không execute code
- Không load external resources
- Chỉ control text rendering

### Có thể remove không?

❌ **NO** - Nếu remove:
- Mất line breaks
- Text becomes unreadable
- Editor behavior ≠ output

**Recommendation:** Giữ `white-space: pre-wrap` trong ALLOWED_STYLES

---

## Testing Checklist

### Dashboard Preview
- [ ] Bold text hiển thị đậm
- [ ] Italic text hiển thị nghiêng
- [ ] Lists hiển thị đúng format
- [ ] Line breaks được preserve
- [ ] Dark mode styling đúng

### Public Pages
- [ ] Content readable
- [ ] Styling consistent với site
- [ ] No XSS vulnerabilities
- [ ] Performance acceptable

### Edge Cases
- [ ] Empty paragraphs handled
- [ ] Multiple line breaks preserved
- [ ] Special characters escaped
- [ ] Long content không break layout

---

## FAQ

### Q: Tại sao Lexical add `<span>` wrapper?
**A:** Lexical wraps text nodes trong `<span>` để:
- Preserve whitespace
- Handle selections better
- Support inline formatting

### Q: Có thể disable `<span>` wrapper không?
**A:** Không. Đây là Lexical core behavior. Better approach: sanitize output properly.

### Q: Nên dùng HTML hay JSON for storage?
**A:**
- **HTML**: Dễ implement, fast render
- **JSON**: More structured, server-side render possible

**Recommendation:** HTML + sanitization (simpler cho use case hiện tại)

### Q: DOMPurify có đủ an toàn không?
**A:** ✅ YES - DOMPurify là industry standard:
- Used by Google, Microsoft, Mozilla
- Actively maintained
- Handles all known XSS vectors

---

## Performance Considerations

### Bundle Size
```
DOMPurify: ~20KB (gzipped)
Lexical: ~22KB (gzipped)
Total: ~42KB
```

**Optimization:**
```typescript
// Lazy load DOMPurify
const DOMPurify = await import('dompurify');
```

### Runtime Performance
- DOMPurify sanitization: ~1-2ms (typical content)
- Acceptable for client-side rendering
- Consider caching for large contents

---

## Migration Path

### Current State
```typescript
const sanitizeHTML = (html: string): string => {
  const DOMPurify = require('dompurify');
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', ...],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
};
```

### Target State
```typescript
import { sanitizeLexicalHTML } from '@/lib/sanitize';

// Dashboard
<div dangerouslySetInnerHTML={{ 
  __html: sanitizeLexicalHTML(content, { allowClasses: true }) 
}} />

// Public
<div 
  className="prose dark:prose-invert"
  dangerouslySetInnerHTML={{ 
    __html: sanitizeLexicalHTML(content, { allowClasses: false }) 
  }} 
/>
```

### Migration Steps
1. Create `lib/sanitize.ts` utility
2. Update AboutManagement to use new utility
3. Update public About page rendering
4. Test thoroughly
5. Apply to Posts/Blog pages

---

## Conclusion

**Best approach cho project này:**
1. ✅ **Option 1** for Dashboard (preserve editor styling)
2. ✅ **Option 2** for Public pages (use prose)
3. ✅ Always allow `white-space: pre-wrap`
4. ✅ Create shared sanitization utility

**Next steps:**
1. Implement `lib/sanitize.ts`
2. Update AboutManagement.tsx
3. Update About page rendering
4. Test & verify
5. Document for team

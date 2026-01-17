import DOMPurify from 'dompurify';

export interface SanitizeOptions {
  /**
   * Allow Tailwind class attributes on elements
   * @default true
   */
  allowClasses?: boolean;
  
  /**
   * Allow inline styles (white-space: pre-wrap for line breaks)
   * @default true
   */
  allowStyles?: boolean;
  
  /**
   * Sanitization mode
   * - strict: Minimal tags, no classes/styles
   * - standard: Common tags, classes allowed
   * - permissive: All safe tags, classes + styles
   * @default 'standard'
   */
  mode?: 'strict' | 'standard' | 'permissive';
}

/**
 * Sanitize HTML output from Lexical editor
 * 
 * Handles:
 * - XSS prevention via DOMPurify
 * - Preserves Tailwind classes (optional)
 * - Preserves white-space: pre-wrap for line breaks (optional)
 * - Removes dangerous attributes and scripts
 * 
 * @param html Raw HTML string from Lexical
 * @param options Sanitization options
 * @returns Sanitized HTML string
 * 
 * @example
 * // Dashboard preview (preserve styling)
 * sanitizeLexicalHTML(content, { allowClasses: true, allowStyles: true })
 * 
 * @example
 * // Public pages (use Tailwind prose)
 * sanitizeLexicalHTML(content, { allowClasses: false, allowStyles: true })
 * 
 * @example
 * // User-generated content (strict)
 * sanitizeLexicalHTML(content, { mode: 'strict' })
 */
export function sanitizeLexicalHTML(
  html: string, 
  options: SanitizeOptions = {}
): string {
  // Server-side: return as-is (sanitize on client)
  if (typeof window === 'undefined') {
    return html;
  }

  const { 
    allowClasses = true, 
    allowStyles = true,
    mode = 'standard' 
  } = options;

  // Base configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: any = {
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'strong', 'em', 'u', 's', 'span',
      // Headings
      'h1', 'h2', 'h3',
      // Lists
      'ul', 'ol', 'li',
      // Links & quotes
      'a', 'blockquote',
    ],
    ALLOWED_ATTR: {
      'a': ['href', 'target', 'rel'],
    },
    // Security
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  };

  // Strict mode: minimal tags, no classes/styles
  if (mode === 'strict') {
    config.ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'];
    config.ALLOWED_ATTR = {
      'a': ['href', 'target', 'rel'],
    };
    return DOMPurify.sanitize(html, config) as unknown as string;
  }

  // Allow Tailwind classes
  if (allowClasses) {
    config.ALLOWED_ATTR['p'] = ['class'];
    config.ALLOWED_ATTR['span'] = ['class'];
    config.ALLOWED_ATTR['ul'] = ['class'];
    config.ALLOWED_ATTR['ol'] = ['class'];
    config.ALLOWED_ATTR['li'] = ['class'];
    config.ALLOWED_ATTR['h1'] = ['class'];
    config.ALLOWED_ATTR['h2'] = ['class'];
    config.ALLOWED_ATTR['h3'] = ['class'];
    config.ALLOWED_ATTR['a'] = ['href', 'target', 'rel', 'class'];
    config.ALLOWED_ATTR['blockquote'] = ['class'];
    config.ALLOWED_ATTR['strong'] = ['class'];
    config.ALLOWED_ATTR['em'] = ['class'];
  }

  // Allow white-space: pre-wrap for line breaks
  if (allowStyles) {
    if (!config.ALLOWED_ATTR['span']) {
      config.ALLOWED_ATTR['span'] = [];
    }
    if (!config.ALLOWED_ATTR['span'].includes('style')) {
      config.ALLOWED_ATTR['span'].push('style');
    }
    config.ALLOWED_STYLES = {
      'span': {
        // Only allow white-space: pre-wrap (safe, used for line breaks)
        'white-space': [/^pre-wrap$/]
      }
    };
  }

  // Permissive mode: additional tags
  if (mode === 'permissive') {
    config.ALLOWED_TAGS.push('code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td');
    
    if (allowClasses) {
      config.ALLOWED_ATTR['code'] = ['class'];
      config.ALLOWED_ATTR['pre'] = ['class'];
      config.ALLOWED_ATTR['table'] = ['class'];
      config.ALLOWED_ATTR['thead'] = ['class'];
      config.ALLOWED_ATTR['tbody'] = ['class'];
      config.ALLOWED_ATTR['tr'] = ['class'];
      config.ALLOWED_ATTR['th'] = ['class'];
      config.ALLOWED_ATTR['td'] = ['class'];
    }
  }

  return DOMPurify.sanitize(html, config) as unknown as string;
}

/**
 * Quick sanitize for dashboard previews
 * Preserves all editor styling
 */
export function sanitizeForPreview(html: string): string {
  return sanitizeLexicalHTML(html, {
    allowClasses: true,
    allowStyles: true,
    mode: 'standard'
  });
}

/**
 * Quick sanitize for public pages
 * Strips classes (use Tailwind prose instead)
 */
export function sanitizeForPublic(html: string): string {
  return sanitizeLexicalHTML(html, {
    allowClasses: false,
    allowStyles: true, // Keep line breaks
    mode: 'standard'
  });
}

/**
 * Strict sanitize for user-generated content
 * Minimal tags, no classes/styles
 */
export function sanitizeStrict(html: string): string {
  return sanitizeLexicalHTML(html, {
    mode: 'strict'
  });
}

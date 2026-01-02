'use client';

/**
 * Inline script to store theme color in window object
 * This allows client-side code to access the SSR theme without re-fetching
 */
export function ThemeScript({ primaryColor }: { primaryColor: string }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__THEME_COLOR__="${primaryColor}";`,
      }}
    />
  );
}

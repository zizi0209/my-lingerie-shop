'use client';

import type { StoreConfig } from '@/lib/getServerTheme';

/**
 * Inline script to store config in window object
 * This allows client-side code to access the SSR config without re-fetching
 */
export function ThemeScript({ config }: { config: StoreConfig }) {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__STORE_CONFIG__=${JSON.stringify(config)};`,
      }}
    />
  );
}

'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/apiBase';
import { isNetworkError } from '@/lib/fetchUtils';

interface PublicConfig {
  store_name?: string;
  store_logo?: string;
  primary_color?: string;
  store_description?: string;
}

/**
 * Hook to fetch public store config (no auth required)
 * Used for login page and public-facing pages
 */
export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig>({
    primary_color: '#f43f5e',
    store_name: 'Admin Panel'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const response = await fetch(`${baseUrl}/public/config`);
        const data = await response.json();
        
        if (data.success && data.data) {
          setConfig(data.data);
        }
      } catch (error) {
        if (!isNetworkError(error)) {
          console.error('Failed to fetch public config:', error);
        }
        // Keep defaults on error
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return { config, loading };
}
